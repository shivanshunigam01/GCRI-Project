import { z } from "zod";

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const CreateAssessmentSchema = z.object({
  body: z.object({
    companyId: z.string().regex(objectIdRegex, "Invalid Company ID format"),
    assessmentType: z.enum(["Light", "Full"], {
      message: "Assessment type must be either 'Light' or 'Full'",
    }),
    frameworkVersion: z.string().trim().optional(),
  }),
});

export const AnswerItemSchema = z.object({
  questionId: z.string().trim().min(2, "Question ID is required"),
  pillarId: z.string().trim().optional(),
  testStatus: z.enum(["NotStarted", "InProgress", "Complete"]).optional(),
  exceptionStatus: z.enum(["NoExceptionNoted", "ExceptionNoted", "NotAssessed"]).optional(),
  selectedOptionCode: z.string().trim().optional(),
  scoreValue: z.number().min(0).max(4).optional(),
  workPaperReference: z.string().trim().max(100).optional(),
  evidenceNotes: z.string().trim().max(3000).optional(),
  evidenceAttachmentUrl: z.string().trim().optional(),
  s3Key: z.string().trim().optional(),
});

export const SubmitAnswersSchema = z.object({
  params: z.object({
    id: z.string().regex(objectIdRegex, "Invalid Assessment Session ID"),
  }),
  body: z.object({
    answers: z.array(AnswerItemSchema).min(1, "At least one answer must be provided"),
  }),
});

export const AssessmentParamSchema = z.object({
  params: z.object({
    id: z.string().regex(objectIdRegex, "Invalid Assessment Session ID"),
  }),
});

export const PresignedUrlSchema = z.object({
  params: z.object({
    id: z.string().regex(objectIdRegex, "Invalid Assessment Session ID"),
  }),
  body: z.object({
    questionId: z.string().trim().min(2, "Question ID is required"),
    fileName: z.string().trim().min(1, "File name is required"),
    contentType: z.string().trim().min(1, "Content-Type is required"),
  }),
});
