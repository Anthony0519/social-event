const express=require("express")
const fileUpload = require("express-fileupload");
const cors = require("cors");
const router = require('./router/routes')

const env=require("dotenv").config()
const db=require("./config/dbConfig")
const app=express()
const port=process.env.port
app.use(express.json())
app.use(cors("*"));
app.use(fileUpload({
    limits: { fileSize: 50 * 1024 * 1024 }, // Example: 50MB limit
    createParentPath: true,
    // useTempFiles: true
  }));

app.use("/api", router)
  


app.get("/",(req,res)=>{
    res.send("welcome")
})


app.listen(port,()=>{
    console.log(`app is successfully listening to port http://localhost:${port} `);
    
})

