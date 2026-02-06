import mongoose from "mongoose"

const AdminSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true
        },
        email: {
            type: String,
            required: true,
            unique: true
        },
        password: {
            type: String,
            required: true
        },
        profile: {
            type: String,
            defualt: ""
        },
        role: {
            type: String,
            default: "admin"
        },


    }
)

const Admin = mongoose.model("Admin", AdminSchema)

export default Admin


