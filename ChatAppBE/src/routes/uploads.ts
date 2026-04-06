import express from "express"
import requireAuth from "../middlewares/requireAuth";

const router = express.Router();

router.get("/upload",requireAuth,(req,res)=>{
    
})



export default router;