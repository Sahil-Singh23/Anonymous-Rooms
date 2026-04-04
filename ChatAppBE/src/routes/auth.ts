import express from "express"
import jwt from "jsonwebtoken"
import { client } from "../prisma.js"
import passport from "passport"
import argon2 from "argon2";
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import requireAuth from "../middlewares/requireAuth.js";

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET|| "secretKeyInDev";

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    callbackURL: process.env.GOOGLE_CALLBACK_URL!,
  },
    async function(accessToken, refreshToken, profile, cb) {
        try{
            const name= profile.displayName;
            const email = profile.emails?.[0]?.value;
            const googleId = profile.id;

            if(!email) return cb(new Error("No email found"),undefined);

            let user = await client.user.findUnique({
                where: {email},
            })

            if(!user){
                user = await client.user.create({
                    data: {
                        name,
                        email,
                        googleId
                    }
                })
            }
            return cb(null,user)
        }catch(e){
            return cb(e as Error,undefined);
        }
    }
));

const normalizeEmail = (v:String) => (v || "").replace(/^["']|["']$/g, "").trim().toLowerCase();

router.post("/signup",async(req,res)=>{n
    try{
        const { name, email, password } = req.body || {};
        const trimmedName = (name || "").trim();
        const normalizedEmail = normalizeEmail(email);

        if (!trimmedName) return res.status(400).json({ error: "Name is required" });
        if (!normalizedEmail) return res.status(400).json({ error: "Email is required" });
        if (!password || String(password).length < 6) {
            return res.status(400).json({ error: "Password must be at least 6 characters" });
        }
        
        const existing = await client.user.findUnique({
            where:{email:normalizedEmail}
        })
        if (existing) return res.status(400).json({ error: "Email already registered" });

        const hashedPassword = await argon2.hash(password,{
            type: argon2.argon2id,   // best variant
            memoryCost: 2 ** 16,     // 64 MB
            timeCost: 3,             // iterations
            parallelism: 1
        });

        const user = await client.user.create({
            data:{
                name:trimmedName,
                passwordHash: hashedPassword,
                email: normalizedEmail
            }
        })

        const token = jwt.sign({userId:user.id},JWT_SECRET,{ expiresIn: "30d" })

        res
        .cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production", // true in prod
            sameSite: "lax", // or "strict" (depends on frontend)
            maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
        })
        .status(201)
        .json({
            user: { id: user.id, name: user.name, email: user.email }
        });
    }catch(e:any){
        console.error("Signup error:", e);
        res.status(500).json({ error: e.message || "Signup failed" });
    }
})

router.post("/login",async(req,res)=>{
    try{
        const { email, password } = req.body || {};
        if (!email || !password) {
          return res.status(400).json({ error: "Email and password are required" });
        }
        const normalizedEmail = normalizeEmail(email);
        const rawPassword = (password || "").replace(/^["']|["']$/g, "").trim();

        const user = await client.user.findUnique({ where: { email: normalizedEmail } });
        if (!user) return res.status(401).json({ error: "Invalid email", message: "Invalid email" });
        if(!user.passwordHash){
            return res.status(401).json({ error: "Login with google id", message: "Login with google id" });
        }

        const match = await argon2.verify(user.passwordHash,rawPassword);
        if (!match) return res.status(401).json({ error: "Invalid password", message: "Invalid password" });

        const token = jwt.sign({userId:user.id},JWT_SECRET,{ expiresIn: "30d" })

        res.cookie("token",token,{
            httpOnly:true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 30 * 24 * 60 * 60 * 1000
        }).status(201).json({user:{id: user.id, name: user.name, email: user.email}});

    }catch(e:any){
        console.error("SignIn error:", e);
        res.status(500).json({ error: e.message || "SignIn failed" });
    }
})

router.post("/logout", (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });
  res.status(200).json({ message: "Logged out successfully" });
});

router.get("/me",requireAuth, (req,res)=>{
    const user = req.user;

    return res.json(user);
})

export default router;