"use client";

import React from "react";
import { useParams } from "next/navigation";
import { AssessmentPlayer } from "@/components/features/assessments/AssessmentPlayer";
import { AssessmentConfidentialGate } from "@/components/features/assessments/AssessmentConfidentialGate";

export default function AssessmentWorkspacePage() {
  const params = useParams();
  const assessmentId = typeof params?.id === "string" ? params.id : "";

  return (
    <AssessmentConfidentialGate>
      <AssessmentPlayer assessmentId={assessmentId} />
    </AssessmentConfidentialGate>
  );
}
