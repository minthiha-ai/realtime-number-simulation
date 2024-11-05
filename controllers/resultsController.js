const pool = require('../config/db');

class Result {
    static async getAll() {
        try {
            const [results] = await pool.query('SELECT * FROM results ORDER BY date DESC, time DESC');
            return results;
        } catch (error) {
            console.error('Error fetching all results:', error);
            throw error;
        }
    }

    static async getUnfinalizedResultByLotteryTime(lottery_time_id) {
        try {
            const [rows] = await pool.query(
                'SELECT * FROM results WHERE lottery_time_id = ? AND is_final = 0 LIMIT 1',
                [lottery_time_id]
            );
            return rows.length ? rows[0] : null;
        } catch (error) {
            console.error('Error fetching unfinalized result by lottery time:', error);
            throw error;
        }
    }

    static async getResultsByLotteryTime(lottery_time_id) {
        try {
            const [results] = await pool.query(
                'SELECT * FROM results WHERE lottery_time_id = ? ORDER BY date DESC, time DESC',
                [lottery_time_id]
            );
            return results;
        } catch (error) {
            console.error('Error fetching results by lottery time:', error);
            throw error;
        }
    }

    static async finalizeResultByLotteryTime(lottery_time_id) {
        try {
            const [result] = await pool.query(
                'UPDATE results SET is_final = 1 WHERE lottery_time_id = ? AND is_final = 0 LIMIT 1',
                [lottery_time_id]
            );
            return result.affectedRows > 0; // true if a row was updated, false otherwise
        } catch (error) {
            console.error('Error finalizing result by lottery time:', error);
            throw error;
        }
    }
}

module.exports = Result;
