import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import { connectDB } from "./config/db.js";
import v1Routes from "./routes/index.js";
import { errorHandler } from "./middlewares/errorHandler.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./config/swagger.js";

// Security and utility middlewares
app.use(
  helmet({
    contentSecurityPolicy: false, // Allows Swagger UI to render CDN stylesheets/scripts
  })
);
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// Swagger Documentation UI
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use("/api/v1/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get("/api-docs.json", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.send(swaggerSpec);
});

// API Routes
app.use("/api/v1", v1Routes);

// Global Error Handler
app.use(errorHandler);

// Start server after connecting to database
async function startServer() {
  try {
    if (process.env.MONGODB_URI) {
      await connectDB();
    } else {
      console.warn("[Server] MONGODB_URI not provided. Running without active database connection.");
    }

    app.listen(PORT, () => {
      console.log(`[Server] GRAICE Backend API listening on port ${PORT}`);
      console.log(`[Server] Health Check available at: http://localhost:${PORT}/api/v1/health`);
    });
  } catch (error) {
    console.error("[Server] Fatal error starting server:", error);
    process.exit(1);
  }
}

startServer();

export default app;
