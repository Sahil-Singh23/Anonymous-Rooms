import express from "express"
import requireAuth from "../middlewares/requireAuth";
import { getObjectURL, getPutObjectURL } from "../utils/s3";
import { client } from "../prisma";

const router = express.Router();

function validateFileType(filetype: string){
    return true; //write allowed file types
}

router.post("/upload",requireAuth,async (req,res)=>{
    const {filename,filetype,filesize,roomCode} = req.body; 

    if(!filename || !filetype || !filesize || !roomCode)  return res.status(401).json({message:"Invalid payload"});

    //write the correct unit for filesize
    if(filesize>'2048mb') return res.status(401).json({message:"File Size is too large"});
    if(!validateFileType(filetype)) return res.status(401).json({message:"Invalid file type"});

    const s3key = `uploads/${Date.now()}-${filename}`
    const expiresIn = 60*15;

    const putUrl = await getPutObjectURL(s3key,filetype,expiresIn);
    
    return res.status(200).json({url:putUrl});
})

router.post("/confirm",requireAuth,async(req,res)=>{
    const {key,filename,filetype,filesize} = req.body;
    if(!key || filename || !filetype || !filesize)  return res.status(401).json({message:"Invalid payload"});

    const expire = new Date(Date.now()+24*60*60*1000);
    await client.file.create({
        data:{
            filename,
            fileType:filetype,   
            fileSize:filesize,
            s3Key: key,
            s3Url: "",
            expiresAt: expire
        }
    })


})

router.get("/get/:key",requireAuth,async(req,res)=>{
    const key = req.params.key;

    const file = await client.file.findUnique({where:{
        s3Key: key
    }})

    if(!file) return res.json(401).json({message:"invalid file"});
    if(file.expiresAt<= new Date()) res.json(401).json({message:"expired file"});

    const url = await getObjectURL(file.s3Key);

    return res.status(200).json({url})
})




export default router;