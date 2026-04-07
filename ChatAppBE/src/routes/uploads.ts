import express from "express"
import requireAuth from "../middlewares/requireAuth";

const router = express.Router();

router.get("/upload",requireAuth,(req,res)=>{
    const {filename,filetype,filesize,roomCode} = req.body; 

    if(!filename || !filetype || !)
    

})



export default router;