import express from "express"
import jwt from "jsonwebtoken";
//importing the admin model
import Admin from "../models/admin.js"

import decodeTokenFromReq from "./decode.js"
//create an instance of express

const router = express.Router()




const generateToken = (user) => {
    return jwt.sign(
        {
            id: user._id,
            email: user.email,
            name: user.name,
        },
        process.env.JWT_SECRET,
        { expiresIn: "15d" }
    );
};

//to register admins

router.post("/register", async (req, res) => {
    try {
        const { name, email, password } = req.body
        const profile = "https://ui-avatars.com/api/?name=" + name + "&background=random&color=fff&size=128";

        const oneadmin = Admin(
            { name, email, password, profile }
        )
        const send = await oneadmin.save()


        const token = generateToken(send)
        if (send) {
            res.status(201).json({
                message:
                    "registration sucessfull please wh=ait for 30minutes for your documents to be reviewed",
                mytoken: token
            })
        } else {
            res.status(401).json({ message: "error during registration, please try again" })

        }
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: "internal server error" })
    }


})


router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body
        const oneadmin = await Admin.findOne({ email })
        if (oneadmin && oneadmin.password === password) {
            const token = generateToken(oneadmin)
            res.status(200).json({
                message: "login successful",
                mytoken: token
            })
        }
        else {
            res.status(401).json({ message: "invalid email or password" })
        }
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: "internal server error" })
    }
})

router.get("/profile", async (req, res) => {
    try {
        // call decode helper with the full request so it can check body, headers or cookies
        const result = decodeTokenFromReq(req);

        if (!result || !result.ok) {
            return res.status(result && result.status ? result.status : 401).json({ message: result && result.message ? result.message : "Failed to decode token" });
        }



        const admin = await Admin.findById(result.payload.id);
        res.status(200).json({ message: "Profile retrieved", admin });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "internal server error" });
    }
});


export default router