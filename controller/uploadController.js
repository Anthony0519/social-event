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
            fileUrl:file.cloudId,
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
        if(images || images.length === 0){
            return res.status(404).json({
                message: "No images uploaded yet!!"
            })
        }

        const imagesWithUrl = images.map(image => ({
            ...image.toObject(),
            url: cloudinary.url(image.url)
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