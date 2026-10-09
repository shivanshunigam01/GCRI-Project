import { z } from "zod";

export const CreateFrameworkSchema = z.object({
  body: z.object({
    version: z
      .string()
      .trim()
      .min(1, "Framework version is required (e.g. '0.9.0-draft')"),
    assessmentType: z.enum(["Light", "Full"]),
    title: z.string().trim().optional(),
    description: z.string().trim().optional(),
    cloneFromVersion: z.string().trim().optional(),
  }),
});

export const FrameworkIdParamSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid Framework ObjectId"),
  }),
});

export const QuestionParamSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid Framework ObjectId"),
    questionId: z.string().min(1, "questionId is required"),
  }),
});

const ResponseOptionItemSchema = z.object({
  code: z.string().min(1),
  label: z.string().min(1),
  scoreValue: z.number(),
  order: z.number(),
});

const RegulatoryAlignmentsSchema = z
  .object({
    euAiAct: z.string().optional(),
    nistAiRmf: z.string().optional(),
    iso42001: z.string().optional(),
    oecdAi: z.string().optional(),
  })
  .optional();

export const CreateQuestionSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid Framework ObjectId"),
  }),
  body: z.object({
    questionId: z.string().trim().min(1, "questionId is required"),
    pillarId: z.string().trim().min(1, "pillarId is required"),
    pillarNumber: z.number().int().min(1).max(7),
    pillarName: z.string().trim().min(1, "pillarName is required"),
    section: z.string().trim().optional(),
    text: z.string().trim().min(5, "Question text must be at least 5 characters"),
    controlDescription: z.string().trim().optional(),
    testProcedure: z.string().trim().optional(),
    remediationGuidance: z.string().trim().optional(),
    organizationScope: z.string().trim().optional(),
    linkedDocumentRequests: z.array(z.string()).optional(),
    assuranceTier: z.string().trim().optional(),
    regulatoryAlignments: RegulatoryAlignmentsSchema,
    helpText: z.string().trim().optional(),
    mandatory: z.boolean().default(true),
    isActive: z.boolean().default(true),
    order: z.number().int().min(1),
    responseOptions: z.array(ResponseOptionItemSchema).optional(),
  }),
});

export const UpdateQuestionSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid Framework ObjectId"),
    questionId: z.string().min(1, "questionId is required"),
  }),
  body: z.object({
    pillarId: z.string().trim().optional(),
    pillarNumber: z.number().int().min(1).max(7).optional(),
    pillarName: z.string().trim().optional(),
    section: z.string().trim().optional(),
    text: z.string().trim().min(5).optional(),
    controlDescription: z.string().trim().optional(),
    testProcedure: z.string().trim().optional(),
    remediationGuidance: z.string().trim().optional(),
    organizationScope: z.string().trim().optional(),
    linkedDocumentRequests: z.array(z.string()).optional(),
    assuranceTier: z.string().trim().optional(),
    regulatoryAlignments: RegulatoryAlignmentsSchema,
    helpText: z.string().trim().optional(),
    mandatory: z.boolean().optional(),
    isActive: z.boolean().optional(),
    order: z.number().int().optional(),
    responseOptions: z.array(ResponseOptionItemSchema).optional(),
  }),
});

export const ToggleQuestionStatusSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid Framework ObjectId"),
    questionId: z.string().min(1, "questionId is required"),
  }),
  body: z.object({
    isActive: z.boolean(),
  }),
});

export const ReorderQuestionsSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid Framework ObjectId"),
  }),
  body: z.object({
    orders: z.array(
      z.object({
        questionId: z.string().min(1),
        order: z.number().int().min(1),
      })
    ).min(1, "orders array must contain at least 1 item"),
  }),
});

export const UpdatePillarsSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid Framework ObjectId"),
  }),
  body: z.object({
    pillars: z.array(
      z.object({
        pillarId: z.string().min(1),
        pillarNumber: z.number().int().optional(),
        name: z.string().min(1),
        description: z.string().min(1),
        weight: z.number().min(0),
        order: z.number().int().min(1),
      })
    ).min(1, "Pillars array cannot be empty"),
  }),
});

export const UpdateThresholdsSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid Framework ObjectId"),
  }),
  body: z.object({
    initialMax: z.number().min(0),
    emergingMax: z.number().min(0),
    establishedMax: z.number().min(0),
    advancedMax: z.number().min(0),
  }).refine((data) => data.initialMax < data.emergingMax && data.emergingMax < data.establishedMax && data.establishedMax <= data.advancedMax, {
    message: "Thresholds must be strictly ascending: initialMax < emergingMax < establishedMax <= advancedMax",
  }),
});
