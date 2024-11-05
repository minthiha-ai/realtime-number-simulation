require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const cron = require('node-cron');
const pool = require('./config/db.js');
const LotteryTime = require('./models/LotteryTime');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(cors());
app.use(express.static('public'));
app.use('/api/results', require('./routes/results'));
app.use('/api/lottery-time', require('./routes/lotteryTime'));

const PORT = process.env.PORT || 3000;

let simulationData = {};
let isFinalized = false;
let simulationInterval;

app.get('/api/finalized-results', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT lottery_time_id, set_value, trade_value, result_2d
            FROM results
            WHERE is_final = 1 AND date = CURDATE()
        `);
        res.json(rows);
    } catch (error) {
        console.error("Error fetching finalized results:", error);
        res.status(500).json({ error: "Failed to fetch results" });
    }
});

// Main function to start the continuous simulation process for the closest time slot
async function startClosestTimeSimulation() {
    while (true) {
        const nextLotteryTime = await LotteryTime.getNextLotteryTime();

        if (!nextLotteryTime) {
            console.log('No upcoming lottery times. Retrying...');
            await new Promise(resolve => setTimeout(resolve, 5000)); // Retry after 5 seconds if no lottery time is found
            continue;
        }

        console.log(`Starting simulation for closest time slot at ${nextLotteryTime.lottery_time}`);

        // Fetch unfinalized data for this lottery time and start the simulation
        await fetchUnfinalizedData(nextLotteryTime.id);

        // Start the simulation only if it hasn’t been finalized
        if (!isFinalized) {
            startSimulation(nextLotteryTime.id);
        }

        // Wait until finalization occurs before moving to the next slot
        await waitForFinalization(nextLotteryTime.lottery_time, nextLotteryTime.id);

        // After finalization, prepare for the next time slot
        isFinalized = false; // Reset finalization flag for the next time slot
        simulationData = { set_value: 0, trade_value: 0, result_2d: '--', time: '--' }; // Reset placeholder values

        // Delay to avoid immediate transition and allow users to see the finalized result briefly
        await new Promise(resolve => setTimeout(resolve, 3000));
    }
}

// Fetch unfinalized result data for a specific lottery time
async function fetchUnfinalizedData(lotteryTimeId) {
    try {
        const [rows] = await pool.query(
            `SELECT r.set_value, r.trade_value, r.result_2d, lt.lottery_time AS time
             FROM results r
             JOIN lottery_times lt ON r.lottery_time_id = lt.id
             WHERE r.is_final = 0 AND r.lottery_time_id = ? AND r.date = CURDATE()
             ORDER BY r.id DESC
             LIMIT 1`,
            [lotteryTimeId]
        );

        if (rows.length) {
            const { set_value, trade_value, result_2d, time } = rows[0];
            simulationData = {
                set_value: parseFloat(set_value) || 0,
                trade_value: parseFloat(trade_value) || 0,
                result_2d: result_2d || '--',
                time,
            };
        } else {
            // Placeholder values if no data found
            simulationData = { set_value: 0, trade_value: 0, result_2d: '--', time: '--' };
        }
    } catch (error) {
        console.error('Error fetching unfinalized data:', error);
    }
}

// Simulate values for the ongoing slot
function startSimulation(lotteryTimeId) {
    const set_value = simulationData.set_value || 10000; // Default placeholder value
    const trade_value = simulationData.trade_value || 20000; // Default placeholder value

    io.emit('simulation_start', { ...simulationData, lotteryTimeId });

    clearInterval(simulationInterval);

    simulationInterval = setInterval(() => {
        if (isFinalized) {
            clearInterval(simulationInterval);
            return;
        }

        const simulatedSet = parseFloat((set_value * (0.98 + Math.random() * 0.04)).toFixed(2));
        const simulatedTrade = parseFloat((trade_value * (0.98 + Math.random() * 0.04)).toFixed(2));
        const firstDigit = simulatedSet.toString().split('.')[0].slice(-1);
        const secondDigit = simulatedTrade.toString().split('.')[1]?.slice(-1) || '0';
        const simulatedResult = `${firstDigit}${secondDigit}`;

        io.emit('simulate_values', {
            set_value: simulatedSet,
            trade_value: simulatedTrade,
            result_2d: simulatedResult,
            lotteryTimeId
        });
    }, 1000);
}

// Finalize the result at the scheduled time if result data exists
async function waitForFinalization(time, lotteryTimeId) {
    const [hour, minute] = time.split(':');
    const cronTime = `${minute} ${hour} * * *`;

    cron.schedule(cronTime, async () => {
        if (await isResultAvailable(lotteryTimeId)) {
            finalizeResult(lotteryTimeId);
        }
    });

    // Wait until the finalization flag is set
    while (!isFinalized) {
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
}

// Check if the result for a time slot is available in the database
async function isResultAvailable(lotteryTimeId) {
    try {
        const [rows] = await pool.query(
            `SELECT is_final FROM results WHERE lottery_time_id = ? AND date = CURDATE() AND is_final = 0 LIMIT 1`,
            [lotteryTimeId]
        );
        return rows.length > 0;
    } catch (error) {
        console.error('Error checking result availability:', error);
        return false;
    }
}

// Finalize the result and emit it to the client
async function finalizeResult(lotteryTimeId) {
    console.log(`Finalizing result for lottery time ID: ${lotteryTimeId}`);
    if (isFinalized) return;

    isFinalized = true;

    // Fetch the actual finalized result from the database
    try {
        const [rows] = await pool.query(
            `SELECT set_value, trade_value, result_2d
             FROM results
             WHERE lottery_time_id = ? AND date = CURDATE() AND is_final = 0
             LIMIT 1`,
            [lotteryTimeId]
        );

        if (rows.length) {
            const { set_value, trade_value, result_2d } = rows[0];

            // Update simulationData with the actual finalized result
            simulationData = {
                set_value,
                trade_value,
                result_2d,
                time: 'Finalized', // You can set this to the current time if needed
            };

            // Emit the finalized result to the client
            io.emit('final_result', { ...simulationData, lotteryTimeId });

            // Mark the result as finalized in the database
            await pool.query('UPDATE results SET is_final = 1 WHERE lottery_time_id = ?', [lotteryTimeId]);
            console.log('Result finalized:', simulationData);
        } else {
            console.warn(`No unfinalized data found for lottery time ID ${lotteryTimeId}`);
        }
    } catch (error) {
        console.error('Error finalizing result:', error);
    }
}

// Initialize and start the closest time simulation
init();

async function init() {
    await startClosestTimeSimulation();
}

// Set up Socket.IO
io.on('connection', (socket) => {
    console.log('New client connected');

    if (Object.keys(simulationData).length) {
        socket.emit('simulation_start', simulationData);
    }

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
});
