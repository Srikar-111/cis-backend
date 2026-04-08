const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { triggerTestsForResource } = require('../services/testRunner');

const prisma = new PrismaClient();

// Get all requests
router.get('/', async (req, res) => {
  try {
    const requests = await prisma.resourceRequest.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Submit new VM or Storage request
router.post('/', async (req, res) => {
  const { type, details } = req.body;
  
  if (!['VM', 'Storage'].includes(type) || !details) {
    return res.status(400).json({ message: 'Invalid request payload' });
  }

  try {
    const resource = await prisma.resourceRequest.create({
      data: {
        type,
        details: JSON.stringify(details),
        status: 'Pending'
      }
    });

    // Notify clients of new resource pending via WebSocket
    if (global.io) {
      global.io.emit('resource-updated', resource);
    }

    // Trigger async background test workflow
    triggerTestsForResource(resource);

    res.status(201).json(resource);
  } catch (error) {
    res.status(500).json({ message: 'Error creating request', error: error.message });
  }
});

module.exports = router;
