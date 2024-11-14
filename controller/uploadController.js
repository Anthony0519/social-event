const uploadModel = require('../models/uploadModel')
const cloudinary = require("../config/cloudinary")
exports.uploadFile = async(req,res)=>{
    try{

    const {validatedEvent, uploadedFiles} = req
    for(const file of uploadedFiles){
        const upload = await uploadModel.create({
            event: validatedEvent._id,
            token: validatedEvent.accessToken,
            fileName: file.originalname,
            fileType: file.type,
            image_id:file.cloudId,
            fileSize: file.size,
            uploadedBy: file.name
        })
        // validatedEvent.uploads.push(upload._id)
        await validatedEvent.save()
    }

    res.status(200).json({
        message:"Upload Successfull"
    })

    }catch(error){
        console.log("upload failed: ",error)
        res.status(500).json({
            message: `failed: ${error.message}`
        })
    }
}

exports.getAllUploads = async(req,res)=>{
    try{

        const eventId = req.params.accessToken
        // get the start page or set to default 1
        const page = req.query.page || 1
        const limit = 20
        const skip = (page - 1) * limit

        const images = await uploadModel.find({token: eventId}).skip(skip).limit(limit)
        if(!images || images.length === 0){
            return res.status(404).json({
                message: "No images uploaded yet!!"
            })
        }

        const imagesWithUrl = images.map(image => ({
            ...image.toObject(),
            image_url: cloudinary.url(image.image_id)
        }))

        const countPages = await uploadModel.countDocuments({token: eventId})

        res.status(200).json({
            message: "All Photos Retrieved",
            images: imagesWithUrl,
            currentPage: page,
            totalPages: Math.ceil(countPages / limit),
        })

    }catch(error){
        res.status(500).json({
            message: error.message
        })
    }
}

exports.deleteImage = async (req, res) => {
    try {
      const {id} = req.params
  
      // Find the image document in MongoDB by its ID
      const image = await uploadModel.findById(id);
  
      if (!image) {
        return res.status(404).json({ message: "Image not found" });
      }
  
      // Delete the image from Cloudinary
      await cloudinary.uploader.destroy(image.image_id);
  
      // Delete the image document from MongoDB
      await uploadModel.findByIdAndDelete(id);
  
      res.status(200).json({ message: "Image deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  };