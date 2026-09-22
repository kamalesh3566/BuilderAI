import mongoose from "mongoose";

export async function connectToDatabase(): Promise<void> {
    if (!process.env.MONGODB_URI) {
        throw new Error("MONGODB_URI is not defined in environment variables");
    }
    mongoose.connection.on('connected', () => {
        console.log("Successfully connected to MongoDB.");
    });
    mongoose.connection.on('error', (err: Error) => {
        console.error("MongoDB connection error:", err.message);
    });
    await mongoose.connect(process.env.MONGODB_URI);
}
