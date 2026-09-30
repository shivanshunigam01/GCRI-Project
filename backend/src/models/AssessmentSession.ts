import { Schema, model, Document, Types } from "mongoose";

export type SessionStatus = "InProgress" | "Submitted" | "Archived";
export type MaturityLevel = "Initial" | "Emerging" | "Established" | "Advanced";

export interface IAnswer {
  questionId: string;
  pillarId: string;
  selectedOptionCode: string;
  scoreValue: number;
  evidenceNotes?: string;
  evidenceAttachmentUrl?: string;
  answeredAt: Date;
}

export interface IPillarScore {
  pillarId: string;
  pillarName: string;
  scoreEarned: number;
  scoreMax: number;
  percentage: number;
}

export interface IScoreSnapshot {
  overallScore: number;
  maxPossibleScore: number;
  overallPercentage: number;
  maturityLevel: MaturityLevel;
  pillarScores: IPillarScore[];
  calculatedAt: Date;
}

export interface IAssessmentSession extends Document {
  companyId: Types.ObjectId;
  conductedByUserId: Types.ObjectId;
  frameworkVersion: string;
  assessmentType: "Light" | "Full";
  status: SessionStatus;
  answers: IAnswer[];
  scoreSnapshot?: IScoreSnapshot;
  submittedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AnswerSchema = new Schema<IAnswer>(
  {
    questionId: { type: String, required: true },
    pillarId: { type: String, required: true },
    selectedOptionCode: { type: String, required: true },
    scoreValue: { type: Number, required: true },
    evidenceNotes: { type: String },
    evidenceAttachmentUrl: { type: String },
    answeredAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const PillarScoreSchema = new Schema<IPillarScore>(
  {
    pillarId: { type: String, required: true },
    pillarName: { type: String, required: true },
    scoreEarned: { type: Number, required: true },
    scoreMax: { type: Number, required: true },
    percentage: { type: Number, required: true },
  },
  { _id: false }
);

const ScoreSnapshotSchema = new Schema<IScoreSnapshot>(
  {
    overallScore: { type: Number, required: true },
    maxPossibleScore: { type: Number, required: true },
    overallPercentage: { type: Number, required: true },
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
    answers: [AnswerSchema],
    scoreSnapshot: ScoreSnapshotSchema,
    submittedAt: { type: Date },
  },
  { timestamps: true }
);

AssessmentSessionSchema.index({ companyId: 1, status: 1 });

export const AssessmentSession = model<IAssessmentSession>(
  "AssessmentSession",
  AssessmentSessionSchema
);
