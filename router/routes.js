const express = require('express')
const { signUp, login } = require('../controller/userController')
const { createEvent } = require('../controller/eventController')
const { uploadFile, getAllUploads } = require('../controller/uploadController')

const upload = require('../utils/multer')
const validateFileUpload = require('../middlewares/validateFile')
const userAuth = require('../middlewares/validateFile')

const router = express.Router()

router.post('/user/signup', upload.single('picture'), signUp)
router.post('/user/login', login)

router.post('/event/create-event', userAuth, createEvent)

router.post('/upload/:accessToken', validateFileUpload, uploadFile)

router.post('/event/:accessToken/images', getAllUploads)

module.exports = router