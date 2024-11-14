const mongoose = require('mongoose');

const EventSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  folderName: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    trim: true
  },
  startDate: {
    type: String,
    required: true
  },
  endDate: {
    type: String,
    required: true
  },
  startTime: {
    type: String,
    required: true
  },
  endTime: {
    type: String,
    required: true
  },
  qrCode: {
    type: String,
    unique: true
  },
  accessToken: {
    type: String,
    unique: true
  },
}, { 
  timestamps: true 
})
const Event = mongoose.models.event || mongoose.model('event', EventSchema);

module.exports = Event;
