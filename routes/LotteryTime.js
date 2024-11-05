const express = require('express');
const LotteryTime = require('../models/LotteryTime');
const router = express.Router();

router.get('/active', async (req, res) => {
    try {
        const activeTimes = await LotteryTime.getActiveLotteryTimes();
        res.json(activeTimes);
    } catch (error) {
        console.error('Error fetching active lottery times:', error);
        res.status(500).json({ error: 'Error fetching active lottery times', details: error.message });
    }
});

router.get('/next', async (req, res) => {
    try {
        const nextTime = await LotteryTime.getNextLotteryTime();
        res.json(nextTime);
    } catch (error) {
        console.error('Error fetching next lottery time:', error);
        res.status(500).json({ error: 'Error fetching next lottery time', details: error.message });
    }
});

module.exports = router;
