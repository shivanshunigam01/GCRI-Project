import swaggerJsdoc from "swagger-jsdoc";
import path from "path";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "GRAICE Assessment Platform API",
      version: "1.0.0",
      description:
        "Comprehensive REST API documentation for the GRAICE Responsible AI Governance Assessment Platform (GCRAI / grAIce Inc.). Digitizes AI governance workflows, maturity classifications, company onboarding, and assessment scoring across the 7 GRAICE Pillars.",
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
    tags: [
      {
        name: "Authentication",
        description: "User self-registration, credential login, account lockout, and JWT token issuance",
      },
      {
        name: "Multi-Factor Authentication",
        description: "Time-based One-Time Password (TOTP) 2FA enrollment, QR code generation, verification, and single-use recovery backup codes",
      },
      {
        name: "Password Management",
        description: "Cryptographic password reset tokens, password updates, and credential rotation",
      },
      {
        name: "Company Management",
        description: "Organization onboarding, automated DNS legitimacy checks, profile management, and administrative status controls",
      },
      {
        name: "User Management",
        description: "Assessor and administrator profile management, user invitations, role assignment, and account status controls",
      },
      {
        name: "Dashboard - Admin",
        description: "Administrative operational statistics, subscription distributions, and non-confidential assessment metadata table (Screen 7 Alignment)",
      },
      {
        name: "Dashboard - Auditor",
        description: "Auditor workload metrics, 7-pillar progress bars, active assessment resumption, and assigned organizations directory (Screen 1 & 2 Alignment)",
      },
      {
        name: "Assessment Analytics",
        description: "Executive maturity summaries, pillar radar breakdown, tailored remediation recommendations, and historical trend progression",
      },
      {
        name: "Reports & Exports",
        description: "Branded PDF audit report generation, download streaming, and multi-sheet Excel (.xlsx) findings export",
      },
      {
        name: "Framework Administration & Versioning",
        description: "Admin framework configuration, question/control authoring, pillar weights, maturity thresholds, and version publishing with immutability guardrails",
      },
      {
        name: "Admin User Management",
        description: "Admin password reset initiation, profile management, and account governance",
      },
      {
        name: "Audit Log Explorer",
        description: "Filterable audit trail query endpoint with searches across actors, actions, entities, and date ranges",
      },
      {
        name: "OAuth / Single Sign-On",
        description: "Google and Microsoft Azure Entra ID OpenID Connect identity federation and token exchange",
      },
      {
        name: "Webhooks",
        description: "Outbound signed webhook subscriptions (HMAC-SHA256) and event notification delivery",
      },
      {
        name: "Machine-to-Machine Authentication",
        description: "Administrative API key generation, revocation, and automated integration access",
      },
      {
        name: "System",
        description: "Health checks, database connectivity, and readiness monitoring probes",
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
        ApiKeyAuth: {
          type: "apiKey",
          in: "header",
          name: "x-api-key",
          description: "Machine-to-Machine API key prefixed with grc_",
        },
      },
      schemas: {
        // Universal Error Response
        ErrorResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            error: {
              type: "object",
              properties: {
                code: { type: "string", example: "INVALID_CREDENTIALS" },
                message: { type: "string", example: "Invalid email or password." },
                details: { type: "object", nullable: true },
              },
            },
            timestamp: { type: "string", format: "date-time", example: "2026-09-30T13:50:00.000Z" },
          },
        },
        // Universal Message Response
        MessageResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: {
              type: "object",
              properties: {
                message: { type: "string", example: "Operation completed successfully." },
              },
            },
            timestamp: { type: "string", format: "date-time" },
          },
        },
        // Registration
        RegisterRequest: {
          type: "object",
          required: ["email", "password", "name"],
          properties: {
            email: { type: "string", format: "email", example: "assessor@company.com" },
            password: { type: "string", minLength: 8, example: "SecurePass123!" },
            name: { type: "string", example: "Jane Doe" },
            companyName: { type: "string", example: "Acme AI Corp" },
            domain: { type: "string", example: "acme.ai" },
          },
        },
        RegisterResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: {
              type: "object",
              properties: {
                userId: { type: "string", example: "66fc1234567890abcdef1234" },
                email: { type: "string", example: "assessor@company.com" },
                name: { type: "string", example: "Jane Doe" },
                role: { type: "string", enum: ["Admin", "Assessor", "MembershipApprover"], example: "Assessor" },
              },
            },
            timestamp: { type: "string", format: "date-time" },
          },
        },
        // Login
        LoginRequest: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: { type: "string", format: "email", example: "user@example.com" },
            password: { type: "string", example: "SecurePass123!" },
            mfaToken: {
              type: "string",
              example: "123456",
              description: "6-digit TOTP code (or 8-character recovery code) if MFA is enabled",
            },
          },
        },
        LoginResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: {
              type: "object",
              properties: {
                token: {
                  type: "string",
                  example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                  description: "Signed JWT Bearer token valid for API requests",
                },
                user: {
                  type: "object",
                  properties: {
                    userId: { type: "string", example: "66fc1234567890abcdef1234" },
                    email: { type: "string", example: "user@example.com" },
                    name: { type: "string", example: "Jane Doe" },
                    role: { type: "string", example: "Assessor" },
                    mfaEnabled: { type: "boolean", example: false },
                    companyId: { type: "string", nullable: true, example: "66fc9876543210abcdef4321" },
                  },
                },
              },
            },
            timestamp: { type: "string", format: "date-time" },
          },
        },
        // MFA Setup (Step 1)
        MfaSetupResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: {
              type: "object",
              properties: {
                secret: {
                  type: "string",
                  example: "JBSWY3DPEHPK3PXP",
                  description: "Base32 encoded secret key for manual authenticator app entry",
                },
                qrCodeUrl: {
                  type: "string",
                  example: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
                  description: "Base64 Data URL containing the QR code image to scan in Google Authenticator",
                },
                issuer: { type: "string", example: "GRAICE" },
                account: { type: "string", example: "user@example.com" },
              },
            },
            timestamp: { type: "string", format: "date-time" },
          },
        },
        // MFA Verification (Step 2)
        MfaVerifyRequest: {
          type: "object",
          required: ["token"],
          properties: {
            token: {
              type: "string",
              example: "123456",
              description: "6-digit TOTP code currently shown in user's authenticator app",
            },
          },
        },
        MfaVerifyResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: {
              type: "object",
              properties: {
                message: { type: "string", example: "Multi-Factor Authentication enabled successfully" },
                recoveryCodes: {
                  type: "array",
                  items: { type: "string" },
                  example: ["a1b2c3d4", "e5f6g7h8", "i9j0k1l2", "m3n4o5p6", "q7r8s9t0", "u1v2w3x4", "y5z6a7b8", "c9d0e1f2"],
                  description: "8 single-use emergency backup recovery codes. Save these in a secure place.",
                },
              },
            },
            timestamp: { type: "string", format: "date-time" },
          },
        },
        // MFA Disable
        MfaDisableRequest: {
          type: "object",
          required: ["password", "token"],
          properties: {
            password: { type: "string", example: "CurrentPassword123!" },
            token: { type: "string", example: "123456", description: "Current 6-digit TOTP code" },
          },
        },
        // Password Management
        ForgotPasswordRequest: {
          type: "object",
          required: ["email"],
          properties: {
            email: { type: "string", format: "email", example: "user@example.com" },
          },
        },
        ResetPasswordRequest: {
          type: "object",
          required: ["token", "newPassword"],
          properties: {
            token: {
              type: "string",
              example: "4a7f9c2e0b1d382947...",
              description: "Cryptographic reset token received via email/admin dispatch",
            },
            newPassword: { type: "string", minLength: 8, example: "NewSecurePassword456!" },
          },
        },
        ChangePasswordRequest: {
          type: "object",
          required: ["currentPassword", "newPassword"],
          properties: {
            currentPassword: { type: "string", example: "OldPassword123!" },
            newPassword: { type: "string", minLength: 8, example: "BrandNewSecurePassword456!" },
          },
        },
        // Health Probe
        HealthResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: {
              type: "object",
              properties: {
                status: { type: "string", example: "healthy" },
                service: { type: "string", example: "GRAICE Assessment Platform Backend API" },
                version: { type: "string", example: "1.0.0" },
                database: { type: "string", example: "connected" },
                timestamp: { type: "string", format: "date-time" },
              },
            },
            timestamp: { type: "string", format: "date-time" },
          },
        },
        // Milestone 6: MFA Challenge (Intermediate Token Response)
        MfaChallengeResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            error: {
              type: "object",
              properties: {
                code: { type: "string", example: "MFA_REQUIRED" },
                message: { type: "string", example: "Two-factor authentication code is required." },
                tempToken: {
                  type: "string",
                  example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                  description: "Short-lived intermediate JWT scoped with mfa_pending. Use as Bearer token on /api/v1/auth/mfa/verify",
                },
                mfaRequired: { type: "boolean", example: true },
              },
            },
            timestamp: { type: "string", format: "date-time" },
          },
        },
        // Milestone 6: OAuth / Single Sign-On
        OAuthLoginRequest: {
          type: "object",
          required: ["idToken"],
          properties: {
            idToken: {
              type: "string",
              example: "eyJhbGciOiJSUzI1NiIsImtpZCI6Ij...",
              description: "JWT ID Token obtained from Google Identity Services or Microsoft Azure Entra ID SDK",
            },
          },
        },
        OAuthLoginResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: {
              type: "object",
              properties: {
                token: {
                  type: "string",
                  example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                  description: "Authenticated session JWT bearer token",
                },
                user: {
                  type: "object",
                  properties: {
                    userId: { type: "string", example: "6716a1b2c3d4e5f6a7b8c9d0" },
                    email: { type: "string", example: "assessor@company.com" },
                    name: { type: "string", example: "Alex Morgan" },
                    role: { type: "string", example: "Assessor" },
                    authProvider: { type: "string", example: "google" },
                    companyId: { type: "string", example: "6716a1b2c3d4e5f6a7b8c9d1" },
                  },
                },
              },
            },
            timestamp: { type: "string", format: "date-time" },
          },
        },
        // Milestone 6: Machine-to-Machine API Keys
        ApiKeyCreateRequest: {
          type: "object",
          required: ["name", "companyId"],
          properties: {
            name: { type: "string", example: "Enterprise Risk Sync Service" },
            companyId: { type: "string", example: "6716a1b2c3d4e5f6a7b8c9d1" },
            role: {
              type: "string",
              enum: ["Admin", "Assessor", "ReadOnly"],
              default: "Assessor",
              example: "Assessor",
            },
            expiresInDays: { type: "number", default: 90, example: 90 },
          },
        },
        ApiKeyCreateResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: {
              type: "object",
              properties: {
                apiKey: {
                  type: "object",
                  properties: {
                    id: { type: "string", example: "6716a1b2c3d4e5f6a7b8c9d2" },
                    name: { type: "string", example: "Enterprise Risk Sync Service" },
                    companyId: { type: "string", example: "6716a1b2c3d4e5f6a7b8c9d1" },
                    role: { type: "string", example: "Assessor" },
                    keyPrefix: { type: "string", example: "grc_live_9fa8" },
                    status: { type: "string", example: "Active" },
                    expiresAt: { type: "string", format: "date-time" },
                  },
                },
                secretKey: {
                  type: "string",
                  example: "grc_live_9fa82be04a371c...",
                  description:
                    "Cryptographic raw API key secret. Stored hashed with SHA-256 and only revealed once upon generation.",
                },
              },
            },
            timestamp: { type: "string", format: "date-time" },
          },
        },
        ApiKeyListResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  _id: { type: "string", example: "6716a1b2c3d4e5f6a7b8c9d2" },
                  name: { type: "string", example: "Enterprise Risk Sync Service" },
                  companyId: { type: "string", example: "6716a1b2c3d4e5f6a7b8c9d1" },
                  role: { type: "string", example: "Assessor" },
                  keyPrefix: { type: "string", example: "grc_live_9fa8" },
                  status: { type: "string", example: "Active" },
                  lastUsedAt: { type: "string", format: "date-time", nullable: true },
                  expiresAt: { type: "string", format: "date-time" },
                },
              },
            },
            timestamp: { type: "string", format: "date-time" },
          },
        },
        // Milestone 6: Outbound Signed Webhooks
        WebhookSubscriptionRequest: {
          type: "object",
          required: ["url"],
          properties: {
            url: {
              type: "string",
              format: "uri",
              example: "https://api.acme-corp.com/v1/webhooks/graice",
            },
            companyId: { type: "string", example: "6716a1b2c3d4e5f6a7b8c9d1" },
            events: {
              type: "array",
              items: { type: "string" },
              example: ["assessment.submitted", "assessment.completed", "company.verified"],
            },
          },
        },
        WebhookSubscriptionResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: {
              type: "object",
              properties: {
                webhook: {
                  type: "object",
                  properties: {
                    id: { type: "string", example: "6716a1b2c3d4e5f6a7b8c9d3" },
                    url: { type: "string", example: "https://api.acme-corp.com/v1/webhooks/graice" },
                    events: {
                      type: "array",
                      items: { type: "string" },
                      example: ["assessment.submitted"],
                    },
                    isActive: { type: "boolean", example: true },
                  },
                },
                signingSecret: {
                  type: "string",
                  example: "whsec_38c9fa014b2d...",
                  description:
                    "Shared HMAC-SHA256 secret used to verify the X-GRAICE-Signature header on inbound event payloads",
                },
              },
            },
            timestamp: { type: "string", format: "date-time" },
          },
        },
        WebhookListResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  _id: { type: "string", example: "6716a1b2c3d4e5f6a7b8c9d3" },
                  url: { type: "string", example: "https://api.acme-corp.com/v1/webhooks/graice" },
                  events: { type: "array", items: { type: "string" } },
                  isActive: { type: "boolean", example: true },
                  createdAt: { type: "string", format: "date-time" },
                },
              },
            },
            timestamp: { type: "string", format: "date-time" },
          },
        },
        WebhookTestResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: {
              type: "object",
              properties: {
                delivered: { type: "boolean", example: true },
                statusCode: { type: "number", example: 200 },
                responseTimeMs: { type: "number", example: 142 },
                signatureVerified: { type: "boolean", example: true },
              },
            },
            timestamp: { type: "string", format: "date-time" },
          },
        },
        // Milestone 6: Assessment Notifications & Reminders
        AssessmentReminderResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: {
              type: "object",
              properties: {
                message: {
                  type: "string",
                  example: "Assessment reminder email dispatched successfully",
                },
                recipient: { type: "string", example: "jane.client@acme.ai" },
                assessmentId: { type: "string", example: "6716a1b2c3d4e5f6a7b8c9d4" },
                daysRemaining: { type: "number", example: 5 },
              },
            },
            timestamp: { type: "string", format: "date-time" },
          },
        },
        AssessmentCompletionResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: {
              type: "object",
              properties: {
                message: {
                  type: "string",
                  example: "Assessment completion scorecard alert sent successfully",
                },
                recipients: {
                  type: "array",
                  items: { type: "string" },
                  example: ["jane.client@acme.ai"],
                },
                scorecard: {
                  type: "object",
                  properties: {
                    maturityLevel: { type: "string", example: "Advanced" },
                    compliancePercentage: { type: "number", example: 87.5 },
                    totalExceptions: { type: "number", example: 2 },
                  },
                },
              },
            },
            timestamp: { type: "string", format: "date-time" },
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
