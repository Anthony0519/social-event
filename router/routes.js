const express = require('express')
const { signUp, login } = require('../controller/userController')
const { createEvent } = require('../controller/eventController')
const { uploadFile, getAllUploads, deleteImage } = require('../controller/uploadController')

// const upload = require('../utils/multer')
const validateFileUpload = require('../middlewares/validateFile')
const userAuth = require('../middlewares/authorization')

const router = express.Router()

router.post('/user/signup', signUp)
router.post('/user/login', login)

router.post('/event/create-event', userAuth, createEvent)

router.post('/upload/:accessToken', validateFileUpload, uploadFile)

router.get('/event/:accessToken/images', getAllUploads)
router.delete('/event/delete/:id', deleteImage)

module.exports = router