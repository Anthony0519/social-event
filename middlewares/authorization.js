const jwt = require('jsonwebtoken')
const userModel = require('../models/userModel.js')

const userAuth = async (req, res, next) => {
    try {
        const auth = req.headers.authorization;

        if (!auth) {
            return res.status(404).json({
                message: 'No authorization token found'
            });
        }

        const token = auth.split(' ')[1];
     
        if (!token) {
            return res.status(404).json({
                message: `Authorization failed`
            });
        }

        const decodedToken = jwt.verify(token, process.env.jwt_secret, (error,payload)=>{
            if(error){
              return error
            }

            return payload
        });

        if(decodedToken.name === "TokenExpiredError"){
            return res.status(400).json({
                error:"user logged Out... please login to continue"
            })
        }else if(decodedToken.name === "JsonWebTokenError"){
            return res.status(400).json({
                error:"Invalid Token"
            })
        }else if(decodedToken.name === "NotBeforeError"){
            return res.status(400).json({
                error:"Token not active"
            })
        }
        
        const user = await userModel.findById(decodedToken.userId);

        if (!user) {
            return res.status(404).json({
                message: `Authorization failed: User not found`
            });
        }

        req.user = decodedToken;

        next();
    } catch (err) {
        res.status(500).json({
            message: err.message
        });
    }
};

module.exports = userAuth
