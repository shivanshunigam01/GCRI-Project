import { Schema, model, Document } from "mongoose";

export type AssessmentType = "Light" | "Full";

export interface IResponseOption {
  code: string;
  label: string;
  scoreValue: number;
  order: number;
}

export interface IRegulatoryAlignments {
  euAiAct?: string;
  nistAiRmf?: string;
  iso42001?: string;
  oecdAi?: string;
}

export interface IQuestionControl {
  questionId: string;
  pillarId: string;
  pillarNumber: number;
  pillarName: string;
  section?: string;
  text: string;
  controlDescription?: string;
  testProcedure?: string;
  organizationScope?: string;
  linkedDocumentRequests?: string[];
  assuranceTier?: string;
  regulatoryAlignments?: IRegulatoryAlignments;
  helpText?: string;
  remediationGuidance?: string;
  mandatory: boolean;
  isActive?: boolean;
  order: number;
  responseOptions: IResponseOption[];
}

export interface IPillar {
  pillarId: string;
  pillarNumber?: number;
  name: string;
  description: string;
  weight: number;
  order: number;
}

export interface IDocumentRequestItem {
  documentId: string;
  pillarNumber: number;
  pillarName: string;
  title: string;
  description: string;
  exampleContent?: string;
  linkedControls: string[];
}

export interface IMeetingRequestItem {
  meetingNumber: number;
  pillarName: string;
  topic: string;
  frameworkAlignment?: string;
  agendaItems?: string;
  leaderTitles?: string;
  teamMemberTitles?: string;
  duration?: string;
  preparationNotes?: string;
}

export interface IAssessmentFramework extends Document {
  version: string;
  status: "Draft" | "Published" | "Archived";
  assessmentType: AssessmentType;
  title?: string;
  description?: string;
  totalQuestions: number;
  pillars: IPillar[];
  questions: IQuestionControl[];
  documentRequests?: IDocumentRequestItem[];
  meetingRequests?: IMeetingRequestItem[];
  maturityThresholds: {
    initialMax: number;
    emergingMax: number;
    establishedMax: number;
    advancedMax: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const ResponseOptionSchema = new Schema<IResponseOption>(
  {
    code: { type: String, required: true },
    label: { type: String, required: true },
    scoreValue: { type: Number, required: true },
    order: { type: Number, required: true },
  },
  { _id: false }
);

const RegulatoryAlignmentsSchema = new Schema<IRegulatoryAlignments>(
  {
    euAiAct: { type: String },
    nistAiRmf: { type: String },
    iso42001: { type: String },
    oecdAi: { type: String },
  },
  { _id: false }
);

const QuestionControlSchema = new Schema<IQuestionControl>(
  {
    questionId: { type: String, required: true },
    pillarId: { type: String, required: true, index: true },
    pillarNumber: { type: Number, required: true },
    pillarName: { type: String, required: true },
    section: { type: String },
    text: { type: String, required: true },
    controlDescription: { type: String },
    testProcedure: { type: String },
    remediationGuidance: { type: String },
    organizationScope: { type: String },
    linkedDocumentRequests: [{ type: String }],
    assuranceTier: { type: String },
    regulatoryAlignments: RegulatoryAlignmentsSchema,
    helpText: { type: String },
    mandatory: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
    order: { type: Number, required: true },
    responseOptions: [ResponseOptionSchema],
  },
  { _id: false }
);

const PillarSchema = new Schema<IPillar>(
  {
    pillarId: { type: String, required: true },
    pillarNumber: { type: Number },
    name: { type: String, required: true },
    description: { type: String, required: true },
    weight: { type: Number, default: 1 },
    order: { type: Number, required: true },
  },
  { _id: false }
);

const DocumentRequestItemSchema = new Schema<IDocumentRequestItem>(
  {
    documentId: { type: String, required: true },
    pillarNumber: { type: Number, required: true },
    pillarName: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    exampleContent: { type: String },
    linkedControls: [{ type: String }],
  },
  { _id: false }
);

const MeetingRequestItemSchema = new Schema<IMeetingRequestItem>(
  {
    meetingNumber: { type: Number, required: true },
    pillarName: { type: String, required: true },
    topic: { type: String, required: true },
    frameworkAlignment: { type: String },
    agendaItems: { type: String },
    leaderTitles: { type: String },
    teamMemberTitles: { type: String },
    duration: { type: String },
    preparationNotes: { type: String },
  },
  { _id: false }
);

const AssessmentFrameworkSchema = new Schema<IAssessmentFramework>(
  {
    version: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: ["Draft", "Published", "Archived"],
      default: "Draft",
      index: true,
    },
    assessmentType: {
      type: String,
      enum: ["Light", "Full"],
      required: true,
      index: true,
    },
    title: { type: String },
    description: { type: String },
    totalQuestions: { type: Number, default: 0 },
    pillars: [PillarSchema],
    questions: [QuestionControlSchema],
    documentRequests: [DocumentRequestItemSchema],
    meetingRequests: [MeetingRequestItemSchema],
    maturityThresholds: {
      initialMax: { type: Number, default: 30 },
      emergingMax: { type: Number, default: 60 },
      establishedMax: { type: Number, default: 90 },
      advancedMax: { type: Number, default: 120 },
    },
  },
  { timestamps: true }
);

AssessmentFrameworkSchema.index({ version: 1, assessmentType: 1 }, { unique: true });

export const AssessmentFramework = model<IAssessmentFramework>(
  "AssessmentFramework",
  AssessmentFrameworkSchema
);
