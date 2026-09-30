import mongoose from "mongoose";

export async function connectDB(): Promise<typeof mongoose> {
  const mongoURI = process.env.MONGODB_URI;

  if (!mongoURI) {
    throw new Error("MONGODB_URI is not defined in environment variables");
  }

  const options: mongoose.ConnectOptions = {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  };

  try {
    const conn = await mongoose.connect(mongoURI, options);
    console.log(`[Database] MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error("[Database] Connection failed:", error);
    throw error;
  }
}

mongoose.connection.on("disconnected", () => {
  console.warn("[Database] MongoDB disconnected.");
});

mongoose.connection.on("error", (err) => {
  console.error("[Database] MongoDB error:", err);
});
