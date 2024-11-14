const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const cloudinary = require('../config/cloudinary')
const userModel = require('../models/userModel')

exports.signUp = async(req, res)=>{
    try {
        const {
            fullName,
            email,
            password
        }=req.body
        if(!fullName || !email || !password){
            return res.status(400).json({
                message:"please input the missing field(s) "
            })
        }
        const existingUser = await userModel.findOne({email: email.toLowerCase().trim()})
        if(existingUser){
            return res.status(400).json({
                message: 'user already exist'
            })
        }
        const salt = await bcrypt.genSalt(10)
        const hash = await bcrypt.hash(password, salt)
        const file = req.file;
        if (!file) {
          return res.status(400).json({
            message: "profile picture is required",
          });
        }
    
        const image = await cloudinary.uploader.upload(req.file.path);
        const data = new userModel({
            fullName,
            email: email.toLowerCase().trim(),
            password: hash,
            picture: image.secure_url
        })

        fs.unlink(file.path, (error) => {
            if (error) {
              console.error("Error deleting the file from local storage:", error);
            } else {
              console.log("File deleted from local storage");
            }
          });

          const userToken = jwt.sign(
            { id: data._id, email: data.email },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
          );
        await data.save()
        res.status(200).json({
            message: 'user created successfully',
            data,
            token:userToken
        })
    } catch (error) {
        res.status(500).json({
            message: error.message
        })
    }
}

exports.login = async (req, res) => {
try {
    const{email, password}=req.body
    const existingUser = await userModel.findOne({email: email.toLowerCase().trim()})
    if(!existingUser){
        return res.status(404).json({
            message: 'user does not exist'
        })
    }
    const checkPassword = await bcrypt.compare(password , existingUser.password)
    if(!checkPassword){
        return res.status(400).json({
            message: 'please input correct password'
        })
    }
    const userToken = jwt.sign({
        userId: existingUser._id,
        email: existingUser.email
    },
    process.env.JWT_SECRET,
      { expiresIn: "1d" }
)

res.status(200).json({
    message: 'login successfully',
    data: existingUser,
    token:userToken
})
} catch (error) {
    res.status(500).json({
        message : error.message
    })
}    
}