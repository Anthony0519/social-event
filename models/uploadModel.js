// models/Upload.js
const mongoose = require('mongoose');

const UploadSchema = new mongoose.Schema({
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true
  },
  token: {
    type: String,
  },
  fileName: {
    type: String,
    required: true
  },
  fileType: {
    type: String,
    enum: ['image', 'video'],
    required: true
  },
  image_id: {
    type: String,
    required: true
  },
  uploadedBy: {
    type: String,
    default: 'Anonymous'
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  fileSize: {
    type: Number
  },
  likes: [{
    userId: String
  }],
  comments: [{
    userId: String,
    text: String,
    timestamp: Date
  }]
}, { 
  timestamps: true 
});

const upload = mongoose.model('upload', UploadSchema);

module.exports = upload;
