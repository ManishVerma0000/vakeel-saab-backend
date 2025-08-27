require('dotenv').config()
const express=require('express');
const app=express();
const PORT=4000
const router=require('./routes/router')

app.use(express.json())
app.use('/api',router)
app.listen(process.env.PORT,()=>{
    console.log(`server is running on port :${process.env.PORT}`)
})