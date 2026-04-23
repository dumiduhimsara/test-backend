import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true }, // ලොගින් වෙන්න email එක ඕන
    password: { type: String, required: true } // password එක ඕන
});

export default mongoose.model("User", userSchema);