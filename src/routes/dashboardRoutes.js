const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Get analytics summaries
router.get('/summary', async (req, res) => {
  try {
    const totalTests = await prisma.testRun.count();
    const passedTests = await prisma.testRun.count({ where: { status: 'Pass' } });
    const failedTests = totalTests - passedTests;
    const successRate = totalTests === 0 ? 0 : Math.round((passedTests / totalTests) * 100);

    // Get time series data for line chart (Group by Date)
    // For SQLite, we might just fetch the last 50 and group in JS to keep it simple across SQL engines
    const history = await prisma.testRun.findMany({
      orderBy: { timestamp: 'asc' },
      take: 50
    });

    const trendData = history.map(run => ({
      name: `Test ${run.id}`,
      time: run.executionTime,
      status: run.status
    }));

    res.json({
      summary: { totalTests, passedTests, failedTests, successRate },
      history,
      trendData
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
