const ExifReader = require('exifreader');
const fs = require('fs');
const sizeOf = require('image-size');

// Configuration object for validation rules
const DEFAULT_VALIDATION_CONFIG = {
  maxFileSizeInMB: 10,
  minImageWidth: 800,
  minImageHeight: 600,
  timeBufferMinutes: 60,
  allowedMimeTypes: ['image/jpeg', 'image/png', "IMG_", 'image/heic', 'image/heif'],
  requireOriginalPhoto: false, // If true, only accepts photos with valid EXIF data
  minQualityScore: 0.5 // 0-1 scale for image quality assessment
};

const extractFileMetadata = async (file, config = DEFAULT_VALIDATION_CONFIG) => {
  if (!file) {
    throw new Error('Missing required parameter - file');
  }

  if (!file.name || !file.mimetype || !file.size || !file.data) {
    throw new Error('Invalid file object - missing required properties');
  }

  const metadata = {
    originalName: file.name,
    mimetype: file.mimetype,
    size: file.size,
    sizeInMB: file.size / (1024 * 1024),
    dimensions: null,
    qualityScore: null,
    possibleCreationSources: [],
    createdAt: null,
    validationErrors: [],
    validationWarnings: []
  };

  try {
    // Check file size
    if (metadata.sizeInMB > config.maxFileSizeInMB) {
      metadata.validationErrors.push(
        `File size (${metadata.sizeInMB.toFixed(2)}MB) exceeds maximum allowed size of ${config.maxFileSizeInMB}MB`
      );
    }

    //  Check MIME type
    if (!config.allowedMimeTypes.includes(metadata.mimetype)) {
      metadata.validationErrors.push(
        `File type ${metadata.mimetype} is not allowed. Allowed types: ${config.allowedMimeTypes.join(', ')}`
      );
    }

    // Get image dimensions
    // if (file.mimetype.startsWith('image/')) {
    //   try {
    //     const dimensions = sizeOf(file.data);
    //     metadata.dimensions = dimensions;

    //     if (dimensions.width < config.minImageWidth || dimensions.height < config.minImageHeight) {
    //       metadata.validationErrors.push(
    //         `Image dimensions (${dimensions.width}x${dimensions.height}) are below minimum required (${config.minImageWidth}x${config.minImageHeight})`
    //       );
    //     }
    //   } catch (e) {
    //     metadata.validationWarnings.push('Could not determine image dimensions');
    //   }
    // }

    if (file.mimetype.startsWith('image/')) {
      // Try EXIF data first
      try {
        const tags = ExifReader.load(file.data);
        const dateFields = [
          'DateTimeOriginal',
          'CreateDate',
          'ModifyDate',
          'DateTime'
        ];

        for (const field of dateFields) {
          if (tags[field] && tags[field].description) {
            const parsedDate = new Date(tags[field].description);
            if (!isNaN(parsedDate.getTime())) {
              metadata.createdAt = parsedDate;
              metadata.possibleCreationSources.push('EXIF');

              // Calculate rough quality score based on EXIF data
              if (tags.Quality) {
                metadata.qualityScore = parseInt(tags.Quality.description) / 100;
              }
              break;
            }
          }
        }

        // Extract additional EXIF information if available
        if (tags.Make) metadata.cameraMake = tags.Make.description;
        if (tags.Model) metadata.cameraModel = tags.Model.description;
        if (tags.ISO) metadata.iso = tags.ISO.description;
      } catch (e) {
        metadata.validationWarnings.push('No EXIF data found');
      }
    }

    // Try file system dates if EXIF not available
    if (!metadata.createdAt && file.lastModifiedDate) {
      metadata.createdAt = new Date(file.lastModifiedDate);
      metadata.possibleCreationSources.push('lastModifiedDate');
    }

    // Last resort: use current time
    if (!metadata.createdAt) {
      metadata.createdAt = new Date();
      metadata.possibleCreationSources.push('current');
      
      if (config.requireOriginalPhoto) {
        metadata.validationErrors.push(
          'Could not verify original photo creation time. Please upload original photos directly from your camera/phone.'
        );
      } else {
        metadata.validationWarnings.push(
          'Using current time as creation time - this may not reflect when the photo was actually taken'
        );
      }
    }

    return metadata;
  } catch (error) {
    console.error('Metadata extraction error:', error);
    throw new Error(`Failed to extract metadata: ${error.message}`);
  }
};

const validateFileCreationTime = (fileMetadata, eventStart, eventEnd, config = DEFAULT_VALIDATION_CONFIG) => {
  const createdAt = fileMetadata.createdAt;
  const creationSource = fileMetadata.possibleCreationSources[0];
  
  const bufferedEventStart = new Date(eventStart.getTime() - config.timeBufferMinutes * 60 * 1000);
  const bufferedEventEnd = new Date(eventEnd.getTime() + config.timeBufferMinutes * 60 * 1000);

  const isValid = createdAt >= bufferedEventStart && createdAt <= bufferedEventEnd;

  // Calculate how far outside the event time the photo was taken (if invalid)
  let timeOffset = null;
  if (!isValid) {
    if (createdAt < bufferedEventStart) {
      timeOffset = Math.floor((bufferedEventStart - createdAt) / (1000 * 60)); // minutes
    } else {
      timeOffset = Math.floor((createdAt - bufferedEventEnd) / (1000 * 60)); // minutes
    }
  }

  return {
    isValid,
    createdAt,
    details: {
      fileCreatedAt: createdAt.toISOString(),
      eventStart: eventStart.toISOString(),
      eventEnd: eventEnd.toISOString(),
      creationSource,
      timeOffset,
      message: isValid 
        ? `File creation time is valid (detected via ${creationSource})`
        : `File was created ${timeOffset} minutes ${createdAt < bufferedEventStart ? 'before' : 'after'} the allowed time window`
    }
  };
};

const validateEventTimes = (startDate, endDate, startTime, endTime) => {
  // Helper function to convert date string (YYYY-MM-DD) and time string (HH:mm) to Date object
  const combineDateAndTime = (dateStr, timeStr) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    const [hours, minutes] = timeStr.split(':').map(Number);
    return new Date(year, month - 1, day, hours, minutes);
  };

  // Convert the date strings to Date objects
  const [startYear, startMonth, startDay] = startDate.split('-').map(Number);
  const [endYear, endMonth, endDay] = endDate.split('-').map(Number);
  
  const start = new Date(startYear, startMonth - 1, startDay);
  const end = new Date(endYear, endMonth - 1, endDay);
  
  // Combine date and time for full datetime comparison
  const startTimeObj = combineDateAndTime(startDate, startTime);
  const endTimeObj = combineDateAndTime(endDate, endTime);
  
  const now = new Date(); // Current date and time
  
  // Create a date-only version of now for date comparisons
  const todayDate = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );
  
  const validations = {
    isValid: true,
    errors: []
  };

  // First check if dates are valid
  if (start < todayDate) {
    validations.isValid = false;
    validations.errors.push('Start date cannot be in the past');
  }

  // Check if end date is before start date
  if (end < start) {
    validations.isValid = false;
    validations.errors.push('End date cannot be before start date');
  }

  // Special handling for today's date
  if (start.getTime() === todayDate.getTime()) {
    // Compare full datetime objects for today
    if (startTimeObj < now) {
      validations.isValid = false;
      validations.errors.push('Start time cannot be in the past for today\'s date. You can create 1 mins ahead of your current time if the event has started already!!');
    }
  }

  // Check end time vs start time on the same day
  if (startDate === endDate && endTimeObj < startTimeObj) {
    validations.isValid = false;
    validations.errors.push('End time cannot be before start time on the same day');
  }

  return validations;
};
  

  module.exports = {
    extractFileMetadata,
    validateFileCreationTime,
    validateEventTimes,
    DEFAULT_VALIDATION_CONFIG,
  }