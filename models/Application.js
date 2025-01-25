const mongoose = require('mongoose');

const ApplicationSchema = new mongoose.Schema({
  applicantName: { type: String, required: true },
  jobPosition: { type: String, required: true },
  storeOwnerId: { type: String, required: true },
  coverLetter: { type: String },
});

module.exports = mongoose.model('Application', ApplicationSchema);
