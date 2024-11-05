const pool = require('../config/db');

class Result {
    // Fetch all results ordered by date and time
    static async getAll() {
        try {
            const [results] = await pool.query('SELECT * FROM results ORDER BY date DESC, time DESC');
            return results;
        } catch (error) {
            console.error('Error fetching all results:', error);
            throw error;
        }
    }

    // Fetch unfinalized result for a specific lottery time
    static async getUnfinalizedResultByLotteryTime(lotteryTimeId) {
        try {
            const [rows] = await pool.query(
                'SELECT set_value, trade_value, result_2d, time FROM results WHERE is_final = 0 AND lottery_time_id = ? LIMIT 1',
                [lotteryTimeId]
            );
            return rows.length ? rows[0] : null;
        } catch (error) {
            console.error('Error fetching unfinalized result by lottery time:', error);
            throw error;
        }
    }

    // Fetch all results for a specific lottery time
    static async getResultsByLotteryTime(lotteryTimeId) {
        try {
            const [results] = await pool.query(
                'SELECT * FROM results WHERE lottery_time_id = ? ORDER BY date DESC, time DESC',
                [lotteryTimeId]
            );
            return results;
        } catch (error) {
            console.error('Error fetching results by lottery time:', error);
            throw error;
        }
    }

    // Mark a result as finalized for a specific lottery time
    static async finalizeResultByLotteryTime(lotteryTimeId) {
        try {
            const [result] = await pool.query(
                'UPDATE results SET is_final = 1 WHERE lottery_time_id = ? AND is_final = 0',
                [lotteryTimeId]
            );
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error finalizing result by lottery time:', error);
            throw error;
        }
    }
}

module.exports = Result;
