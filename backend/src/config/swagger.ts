import swaggerJsdoc from "swagger-jsdoc";
import path from "path";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "GRAICE Assessment Platform API",
      version: "1.0.0",
      description:
        "Comprehensive REST API documentation for the GRAICE Responsible AI Governance Assessment Platform (GCRAI / grAIce Inc.).",
      contact: {
        name: "GCRAI Platform Engineering",
      },
    },
    servers: [
      {
        url: "http://localhost:5000",
        description: "Local Development Server",
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Enter your JWT token in the format: Bearer <token>",
        },
      },
      schemas: {
        ApiResponse: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            data: { type: "object" },
            error: {
              type: "object",
              properties: {
                code: { type: "string" },
                message: { type: "string" },
                details: { type: "object" },
              },
            },
            timestamp: { type: "string", format: "date-time" },
          },
        },
        RegisterRequest: {
          type: "object",
          required: ["email", "password", "name"],
          properties: {
            email: { type: "string", format: "email", example: "user@example.com" },
            password: { type: "string", minLength: 8, example: "Password123!" },
            name: { type: "string", example: "Jane Doe" },
            companyName: { type: "string", example: "Acme Corp" },
            domain: { type: "string", example: "acme.com" },
          },
        },
        LoginRequest: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: { type: "string", format: "email", example: "user@example.com" },
            password: { type: "string", example: "Password123!" },
            mfaToken: { type: "string", example: "123456" },
          },
        },
      },
    },
  },
  apis: [
    path.join(process.cwd(), "dist/routes/*.js"),
    path.join(process.cwd(), "src/routes/*.ts"),
    path.join(process.cwd(), "backend/src/routes/*.ts"),
    path.join(process.cwd(), "backend/dist/routes/*.js"),
    "./src/routes/*.ts",
    "./dist/routes/*.js",
  ],
};

export const swaggerSpec = swaggerJsdoc(options);
