import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import mongoose from "mongoose";
import env from "dotenv";
import admin from "./routes/admin.js"

const app = express()
env.config();


app.use(cors())
app.use(morgan(":method :url :status :response-time ms - :res[content-length]"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- 3. ROUTES ---
app.use("/api/admin", admin)


app.get("/", (_req, res) => {
    res.send("server is on");
});

// --- 4. DATABASE CONNECTION ---
const connectDb = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("database connected successfully!!");
    } catch (err) {
        console.error("error connecting to the database:", err);
    }
};

// --- 5. START SERVER ---
const PORT = process.env.PORT || 6300;


connectDb().then(() => {
    app.listen(PORT, () => {
        console.log(`server running on port ${PORT}`);
    });
});