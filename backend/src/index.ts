import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import { connectDB } from "./config/db.js";
import v1Routes from "./routes/index.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { apiLimiter } from "./middlewares/rateLimiter.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./config/swagger.js";

// Security and utility middlewares
app.use(
  helmet({
    contentSecurityPolicy: false, // Allows Swagger UI to render CDN stylesheets/scripts
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  })
);
const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((o) => o.trim()).filter(Boolean)
  : ["http://localhost:3000", "http://localhost:3001"];

app.use(
  cors({
    origin: corsOrigins.length === 1 ? corsOrigins[0] : corsOrigins,
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

// Static uploads serving for local fallback
import("./services/s3.service.js").then(({ s3Service }) => {
  app.use("/uploads", express.static(s3Service.getUploadsDir()));
});

// API Routes
app.use("/api/v1", apiLimiter, v1Routes);

// Global Error Handler
app.use(errorHandler);

// Start server after connecting to database
async function startServer() {
  try {
    if (process.env.MONGODB_URI) {
      await connectDB();
      console.log("Connected to mongodb ", process.env.MONGODB_URI)
    } else {
      console.warn("[Server] MONGODB_URI not provided. Running without active database connection.");
    }

    app.listen(PORT, () => {
      console.log("Connected to mongodb ", PORT)
      console.log(`[Server] GRAICE Backend API listening on port ${PORT}`);
      console.log(`[Server] Health Check available at: http://localhost:${PORT}/api/v1/health`);

      // Initialize background cron scheduler
      import("./services/scheduler.service.js")
        .then(({ platformScheduler }) => {
          platformScheduler.startScheduler();
        })
        .catch((err) => {
          console.error("[Server] Failed to initialize platform scheduler:", err);
        });
    });
  } catch (error) {
    console.error("[Server] Fatal error starting server:", error);
    process.exit(1);
  }
}

startServer();

export default app;
