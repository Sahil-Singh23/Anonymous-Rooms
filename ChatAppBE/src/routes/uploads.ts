import express from "express"
import requireAuth from "../middlewares/requireAuth";
import { getPutObjectURL } from "../utils/s3";

const router = express.Router();

function validateFileType(filetype: string){
    return true; //write allowed file types
}

router.get("/upload",requireAuth,async (req,res)=>{
    const {filename,filetype,filesize,roomCode} = req.body; 

    if(!filename || !filetype || !filesize || !roomCode)  return res.status(401).json({message:"Invalid payload"});
    if(filesize>'2048mb') return res.status(401).json({message:"File Size is too large"});
    if(!validateFileType(filetype)) return res.status(401).json({message:"Invalid file type"});

    const s3key = `uploads/${Date.now()}-${filename}`
    const expiresIn = 60*60*24;

    const putUrl = await getPutObjectURL(s3key,filetype,expiresIn);
    

})



export default router;