const Event = require('../models/eventModel');
const {extractFileMetadata,validateFileCreationTime,DEFAULT_VALIDATION_CONFIG} = require("../utils/functions")
const cloudinary = require("../config/cloudinary")
const fs = require('fs')

const validateFileUpload = async (req, res, next) => {
  try {
    const { accessToken } = req.params;
    // Override defaults with any request-specific config
    const config = {
      ...DEFAULT_VALIDATION_CONFIG,
      ...(req.validationConfig || {})
    };
    
    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).json({ 
        message: 'Missing required parameter - file'
      });
    }

    let files = [];
    if (req.files.image) {
      files = Array.isArray(req.files.image) ? req.files.image : [req.files.image];
    }
    
    if (!files.length) {
      return res.status(400).json({ 
        message: 'No files provided for upload'
      });
    }

    const event = await Event.findOne({ accessToken });
    if (!event) {
      return res.status(404).json({ message: 'Invalid event access' });
    }

    const eventStart = new Date(`${event.startDate}T${event.startTime}`);
    const eventEnd = new Date(`${event.endDate}T${event.endTime}`);

    const uploadedFiles = [];
    const failedFiles = [];

    for (const file of files) {
      try {
        // Extract and validate metadata
        const fileMetadata = await extractFileMetadata(file, config);
        
        // Check for validation errors
        if (fileMetadata.validationErrors.length > 0) {
          failedFiles.push({
            name: file.name,
            errors: fileMetadata.validationErrors
          });
          continue;
        }

        // Validate creation time
        const timeValidation = validateFileCreationTime(fileMetadata, eventStart, eventEnd, config);
        
        if (!timeValidation.isValid) {
          failedFiles.push({
            name: file.name,
            errors: [timeValidation.details.message]
          });
          continue;
        }

        // Upload to Cloudinary if all validations pass
        const tempFilePath = `/tmp/${file.name}`;
        await file.mv(tempFilePath);
        const result = await cloudinary.uploader.upload(tempFilePath, { folder: event.folderName });
        fs.unlinkSync(tempFilePath);

        uploadedFiles.push({
          originalname: file.name,
          size: fileMetadata.sizeInMB,
          dimensions: fileMetadata.dimensions,
          type: fileMetadata.mimetype.startsWith("image/") ? "image" : "video",
          name: req.body.userName || "Anonymous",
          url: result.secure_url,
          cloudId: result.public_id,
          createdAt: fileMetadata.createdAt,
          creationSource: fileMetadata.possibleCreationSources[0],
          cameraMake: fileMetadata.cameraMake,
          cameraModel: fileMetadata.cameraModel,
          warnings: fileMetadata.validationWarnings
        });
      } catch (error) {
        console.error('Error processing file:', file.name, error);
        failedFiles.push({
          name: file.name,
          errors: [error.message]
        });
      }
    }

    // Provide detailed response about successful and failed uploads
    req.validatedEvent = event;
    req.uploadedFiles = uploadedFiles;
    req.failedFiles = failedFiles;

    // If some files failed but others succeeded, continue with partial success
    if (uploadedFiles.length > 0) {
      next();
    } else {
      res.status(400).json({
        message: 'No files were successfully validated',
        error: failedFiles[0].errors[0]
      });
    }
  } catch (error) {
    console.error('File validation failed:', error);
    res.status(500).json({ 
      message: 'File validation failed', 
      error: error.message
    });
  }
}

module.exports = validateFileUpload