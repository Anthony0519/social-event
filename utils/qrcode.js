// Using Cloudinary example
const cloudinary = require('../config/cloudinary');
const QRCode = require('qrcode');

const generateQRCode = async (url) => {
  try {
    // Upload directly to cloud storage
    const cloudinaryResponse = await cloudinary.uploader.upload(
      // Convert URL to QR code image
      await QRCode.toDataURL(url), 
      {
        folder: 'event-qrcodes',
        // Optional: add transformations
        transformation: [
          { width: 300, height: 300, crop: 'fit' }
        ]
      }
    );
    
    // Save cloud URL instead of local path
    return cloudinaryResponse.secure_url;
  } catch (error) {
    console.error('QR Code upload failed', error);
    throw error;
  }
}

module.exports = generateQRCode