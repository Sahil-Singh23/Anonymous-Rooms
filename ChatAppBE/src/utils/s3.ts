import { S3Client,GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import {getSignedUrl} from "@aws-sdk/s3-request-presigner"

const accessKeyId = process.env.accessKeyId || ""
const secretAccessKey = process.env.secretAccessKey || ""


const s3client = new S3Client({
    region: "ap-south-1",
    credentials:{
        accessKeyId:accessKeyId,
        secretAccessKey:secretAccessKey
    }
})

async function getObjectURL(key:string){
    const command = new GetObjectCommand({
        Bucket: "",
        Key: key,
    })
    const url = await getSignedUrl(s3client,command,{expiresIn:60});
    return url;
}

async function putObjectUrl(key:string,filetype:string) {
    const command = new PutObjectCommand({
        Bucket: "",
        Key: key,
        ContentType:filetype
    })
    const url = await getSignedUrl(s3client,command)
    return url;

}