import { Schema, model, Document, Types } from "mongoose";

export type SessionStatus = "InProgress" | "Submitted" | "Archived";
export type MaturityLevel = "Initial" | "Emerging" | "Established" | "Advanced";
export type TestStatus = "NotStarted" | "InProgress" | "Complete";
export type ExceptionStatus = "NoExceptionNoted" | "ExceptionNoted" | "NotAssessed";

export interface IAnswer {
  questionId: string;
  pillarId: string;
  pillarNumber?: number;
  testStatus?: TestStatus;
  exceptionStatus?: ExceptionStatus;
  selectedOptionCode?: string;
  scoreValue?: number;
  workPaperReference?: string;
  evidenceNotes?: string;
  evidenceAttachmentUrl?: string;
  s3Key?: string;
  testedByUserId?: Types.ObjectId;
  answeredAt: Date;
}

export interface IPillarScore {
  pillarId: string;
  pillarName: string;
  pillarNumber?: number;
  scoreEarned: number;
  scoreMax: number;
  percentage: number;
  exceptionsNoted?: number;
  noExceptionsNoted?: number;
  notAssessed?: number;
  totalControls?: number;
  compliancePercentage?: number;
}

export interface IScoreSnapshot {
  overallScore: number;
  maxPossibleScore: number;
  overallPercentage: number;
  totalExceptionsNoted?: number;
  totalNoExceptionsNoted?: number;
  totalNotAssessed?: number;
  totalControlsAssessed?: number;
  compliancePercentage?: number;
  maturityLevel: MaturityLevel;
  pillarScores: IPillarScore[];
  calculatedAt: Date;
}

export interface IClientContact {
  name: string;
  email: string;
  phone?: string;
  title?: string;
}

export interface IReportMetadata {
  fileName: string;
  filePath?: string;
  fileUrl: string;
  fileSizeBytes: number;
  generatedAt: Date;
  generatedByUserId: Types.ObjectId;
  checksum: string;
  storageType: "s3" | "local";
}

export interface IAssessmentSession extends Document {
  companyId: Types.ObjectId;
  conductedByUserId: Types.ObjectId;
  frameworkVersion: string;
  assessmentType: "Light" | "Full";
  status: SessionStatus;
  clientContact?: IClientContact;
  answers: IAnswer[];
  scoreSnapshot?: IScoreSnapshot;
  reportMetadata?: IReportMetadata;
  submittedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AnswerSchema = new Schema<IAnswer>(
  {
    questionId: { type: String, required: true },
    pillarId: { type: String, required: true },
    pillarNumber: { type: Number },
    testStatus: {
      type: String,
      enum: ["NotStarted", "InProgress", "Complete"],
      default: "NotStarted",
    },
    exceptionStatus: {
      type: String,
      enum: ["NoExceptionNoted", "ExceptionNoted", "NotAssessed"],
      default: "NotAssessed",
    },
    selectedOptionCode: { type: String },
    scoreValue: { type: Number, default: 0 },
    workPaperReference: { type: String },
    evidenceNotes: { type: String },
    evidenceAttachmentUrl: { type: String },
    s3Key: { type: String },
    testedByUserId: { type: Schema.Types.ObjectId, ref: "User" },
    answeredAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const PillarScoreSchema = new Schema<IPillarScore>(
  {
    pillarId: { type: String, required: true },
    pillarName: { type: String, required: true },
    pillarNumber: { type: Number },
    scoreEarned: { type: Number, required: true },
    scoreMax: { type: Number, required: true },
    percentage: { type: Number, required: true },
    exceptionsNoted: { type: Number, default: 0 },
    noExceptionsNoted: { type: Number, default: 0 },
    notAssessed: { type: Number, default: 0 },
    totalControls: { type: Number, default: 0 },
    compliancePercentage: { type: Number, default: 0 },
  },
  { _id: false }
);

const ScoreSnapshotSchema = new Schema<IScoreSnapshot>(
  {
    overallScore: { type: Number, required: true },
    maxPossibleScore: { type: Number, required: true },
    overallPercentage: { type: Number, required: true },
    totalExceptionsNoted: { type: Number, default: 0 },
    totalNoExceptionsNoted: { type: Number, default: 0 },
    totalNotAssessed: { type: Number, default: 0 },
    totalControlsAssessed: { type: Number, default: 0 },
    compliancePercentage: { type: Number, default: 0 },
    maturityLevel: {
      type: String,
      enum: ["Initial", "Emerging", "Established", "Advanced"],
      required: true,
    },
    pillarScores: [PillarScoreSchema],
    calculatedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const AssessmentSessionSchema = new Schema<IAssessmentSession>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    conductedByUserId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    frameworkVersion: { type: String, required: true },
    assessmentType: { type: String, enum: ["Light", "Full"], required: true, index: true },
    status: {
      type: String,
      enum: ["InProgress", "Submitted", "Archived"],
      default: "InProgress",
      index: true,
    },
    clientContact: {
      name: { type: String, trim: true },
      email: { type: String, trim: true, lowercase: true },
      phone: { type: String, trim: true },
      title: { type: String, trim: true },
    },
    answers: [AnswerSchema],
    scoreSnapshot: ScoreSnapshotSchema,
    reportMetadata: {
      fileName: { type: String },
      filePath: { type: String },
      fileUrl: { type: String },
      fileSizeBytes: { type: Number },
      generatedAt: { type: Date },
      generatedByUserId: { type: Schema.Types.ObjectId, ref: "User" },
      checksum: { type: String },
      storageType: { type: String, enum: ["s3", "local"], default: "local" },
    },
    submittedAt: { type: Date },
  },
  { timestamps: true }
);

AssessmentSessionSchema.index({ companyId: 1, status: 1 });

export const AssessmentSession = model<IAssessmentSession>(
  "AssessmentSession",
  AssessmentSessionSchema
);
