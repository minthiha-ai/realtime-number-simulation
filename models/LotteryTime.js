// models/LotteryTime.js
const pool = require('../config/db');

class LotteryTime {
    // Method to fetch all active lottery times (where status is true)
    static async getActiveLotteryTimes() {
        try {
            const [rows] = await pool.query('SELECT * FROM lottery_times WHERE status = 1 ORDER BY lottery_time ASC');
            return rows;
        } catch (error) {
            console.error('Error fetching active lottery times:', error);
            throw error;
        }
    }

    // Method to get the next upcoming active lottery time
    static async getNextLotteryTime() {
        const currentTime = new Date().toTimeString().split(' ')[0];
        console.log('Current Time:', currentTime); // Debug log to see the current time in HH:MM:SS format
        try {
            let [rows] = await pool.query(
                'SELECT * FROM lottery_times WHERE status = 1 AND lottery_time > ? ORDER BY lottery_time ASC LIMIT 1',
                [currentTime]
            );

            if (!rows.length) {
                // If no times are left for today, fetch the first active lottery time for the next day
                [rows] = await pool.query(
                    'SELECT * FROM lottery_times WHERE status = 1 ORDER BY lottery_time ASC LIMIT 1'
                );
            }

            console.log('Next Lottery Time Row:', rows); // Log the result to verify the fetched time
            return rows.length ? rows[0] : null;
        } catch (error) {
            console.error('Error fetching next lottery time:', error);
            throw error;
        }
    }

    // Method to reload the list of active lottery times
    static async reloadLotteryTimes() {
        return await this.getActiveLotteryTimes(); // Calls the getActiveLotteryTimes method to retrieve updated times
    }
}

module.exports = LotteryTime;
