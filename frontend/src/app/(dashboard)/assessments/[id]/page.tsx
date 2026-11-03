"use client";

import React from "react";
import { useParams } from "next/navigation";
import { AssessmentConfidentialGate } from "@/components/features/assessments/AssessmentConfidentialGate";
import { AssessmentWorkspaceRouter } from "@/components/features/assessments/AssessmentWorkspaceRouter";

export default function AssessmentWorkspacePage() {
  const params = useParams();
  const assessmentId = typeof params?.id === "string" ? params.id : "";

  return (
    <AssessmentConfidentialGate>
      <AssessmentWorkspaceRouter assessmentId={assessmentId} />
    </AssessmentConfidentialGate>
  );
}
