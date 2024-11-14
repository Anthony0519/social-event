// models/Upload.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true
  },
  email: {
    type: String,
    unique: true,
    required: true
  },
  password: {
    type: String,
    required: true
  },
 
}, { 
  timestamps: true 
});

const userModel = mongoose.models.user || mongoose.model('user', userSchema);

module.exports = userModel;
