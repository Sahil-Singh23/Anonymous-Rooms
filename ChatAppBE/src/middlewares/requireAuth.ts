import jwt from "jsonwebtoken";
import { client } from "../prisma.js";
import type {Request,Response,NextFunction} from "express"
import { getProfilePicUrl } from "../routes/profile.js";

interface JwtPayload {
  userId: number;
}


const JWT_SECRET = process.env.JWT_SECRET || "secretKeyInDev";

export default async function requireAuth(req:Request, res: Response, next: NextFunction) {
    try {
        const token = req.cookies?.token;

        if (!token) {
            return res.status(401).json({ message: "You are not logged in" });
        }

        const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;

        const user = await client.user.findUnique({
            where: { id: decoded.userId },
            select: {
                id: true,
                email: true,
                name: true,
                profilePicKey: true,
            }
        });

        if (!user) {
            return res.status(401).json({ message: "User no longer exists" });
        }

        // Generate presigned GET URL for profile picture if it exists
        let profilePicUrl: string | undefined;
        if (user.profilePicKey) {
            profilePicUrl = await getProfilePicUrl(user.id, user.profilePicKey);
        }

        // Attach user to request object with profile pic URL
        req.user = {
            id: user.id,
            email: user.email,
            name: user.name,
            ...(profilePicUrl && { profilePicUrl })
        };

        next();
    } catch (e) {
        return res.status(401).json({ message: "Invalid token" });
    }
}