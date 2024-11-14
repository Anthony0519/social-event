require("dotenv").config()
const mongoose=require("mongoose")

const url=process.env.mongodb

mongoose.connect(url).then(()=>{
     
 
    console.log(`server successfully connected to mongodb`)
}).catch((error)=>{
    console.log(`unable to connect to database because ${error}`)
})  