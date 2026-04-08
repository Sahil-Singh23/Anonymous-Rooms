import {client} from "../prisma.js"
import { deleteObjectFromS3 } from "./s3"

export default async function s3cleanup(){
    const cur = new Date()
    const files = await client.file.findMany({where:{
        expiresAt: {
            lte: cur
        }
    },select:{
        s3Key: true
    }})

    for(const file of files){
        deleteObjectFromS3(file.s3Key);
    }
}