export interface FrameworkQuestion {
  id: string;
  code: string;
  text: string;
  guidance?: string;
  regulatoryReferences?: string[];
  weight?: number;
  pillarId: string;
}

export interface FrameworkPillar {
  id: string;
  code: string;
  name: string;
  description: string;
  questions: FrameworkQuestion[];
}

export interface AssessmentFramework {
  _id: string;
  name: string;
  version: string;
  status: "Draft" | "Published" | "Archived";
  pillars: FrameworkPillar[];
  createdAt?: string;
  updatedAt?: string;
}
