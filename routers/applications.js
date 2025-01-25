const express = require('express');
const router = express.Router();
const Application = require('../models/Application'); // Your Mongoose model

// POST request to save an application
router.post('/apply', async (req, res) => {
  try {
    const { applicantName, jobPosition, storeOwnerId, coverLetter } = req.body;
    const newApplication = new Application({
      applicantName,
      jobPosition,
      storeOwnerId,
      coverLetter,
    });
    await newApplication.save();
    res.status(201).json({ message: 'Application submitted successfully' });
  } catch (error) {
    console.error('Error saving application:', error);
    res.status(500).json({ error: 'Failed to save application' });
  }
});

// GET request to fetch all applications
router.get('/applications', async (req, res) => {
  try {
    const applications = await Application.find();
    res.status(200).json(applications);
  } catch (error) {
    console.error('Error fetching applications:', error);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

module.exports = router;
