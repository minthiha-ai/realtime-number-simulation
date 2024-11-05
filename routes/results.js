const express = require('express');
const Result = require('../models/Result');
const router = express.Router();

// Enable CORS for this route
router.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*'); // Allow all origins (adjust if needed)
    res.header('Access-Control-Allow-Methods', 'GET, POST');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    next();
});

// Endpoint to get all results
router.get('/', async (req, res) => {
    try {
        const results = await Result.getAll();
        res.json(results);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching results' });
    }
});

// Endpoint to get unfinalized result for a specific lottery time
router.get('/unfinalized/:lottery_time_id', async (req, res) => {
    const { lottery_time_id } = req.params;
    try {
        const unfinalizedResult = await Result.getUnfinalizedResultByLotteryTime(lottery_time_id);
        if (unfinalizedResult) {
            res.json(unfinalizedResult);
        } else {
            res.status(404).json({ error: 'No unfinalized result found for the specified lottery time' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Error fetching unfinalized result' });
    }
});

// Endpoint to get all results for a specific lottery time
router.get('/lottery/:lottery_time_id', async (req, res) => {
    const { lottery_time_id } = req.params;
    try {
        const results = await Result.getResultsByLotteryTime(lottery_time_id);
        res.json(results);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching results for the specified lottery time' });
    }
});

// Endpoint to finalize result by lottery time
router.post('/finalize/:lottery_time_id', async (req, res) => {
    const { lottery_time_id } = req.params;
    try {
        const success = await Result.finalizeResultByLotteryTime(lottery_time_id);
        if (success) {
            res.json({ message: 'Result finalized successfully' });
        } else {
            res.status(404).json({ error: 'No unfinalized result found for the specified lottery time' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Error finalizing result' });
    }
});

module.exports = router;
