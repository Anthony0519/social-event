const Event = require('../models/eventModel');
const generateQRCode = require('../utils/qrcode');
const crypto = require('crypto');
const {validateEventTimes} = require('../utils/functions')

  exports.createEvent = async(req,res) => {
    try {

      const {name,description,startDate, endDate, startTime,endTime} = req.body

      const validateDateInputs = await validateEventTimes(startDate, endDate, startTime, endTime)
      if (!validateDateInputs.isValid) {
        return res.status(400).json({
          success: false,
          message: validateDateInputs.errors[0]
        });
      }

      // Generate unique access token
      const accessToken = crypto.randomBytes(6).toString('hex');
      
      // Create event URL (you'd replace this with your actual frontend URL)
      const eventUrl = `https://youreventapp.com/event/${accessToken}`;
      
      // Generate QR Code
      const qrCodePath = await generateQRCode(eventUrl);
      
      // Create event with additional metadata
      const event = new Event({
        name,
        description,
        startDate,
        endDate,
        startTime,
        endTime,
        accessToken,
        qrCode: qrCodePath
      });    
      await event.save();
     
    res.status(200).json({
        message: "event created successfull",
        data: event,
        qrcode: qrCodePath
    })

    } catch (error) {
      console.error('Event creation failed', error);
      res.status(500).json({
        message: error.message
      })
    }
  }
