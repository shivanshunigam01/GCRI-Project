"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { assessmentService } from "@/services/assessment.service";
import { FrameworkQuestion } from "@/types/framework.types";
import { getApiErrorMessage } from "@/lib/authUser";
import {
  buildFullSavePayload,
  FullControlAnswerState,
} from "@/lib/fullAssessmentAnswers";

export type AutosaveStatus = "idle" | "saving" | "saved" | "failed";

const DEBOUNCE_MS = 900;

/**
 * Debounced Full Assessment answer autosave with generation tokens to ignore stale responses.
 */
export function useFullAssessmentAutosave(options: {
  assessmentId: string;
  questions: FrameworkQuestion[];
  answersByQuestionId: Record<string, FullControlAnswerState>;
  dirty: boolean;
  setDirty: (dirty: boolean) => void;
  enabled: boolean;
  onSaved?: () => void;
}) {
  const {
    assessmentId,
    questions,
    answersByQuestionId,
    dirty,
    setDirty,
    enabled,
    onSaved,
  } = options;

  const [status, setStatus] = useState<AutosaveStatus>("idle");
  const [notice, setNotice] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  const answersRef = useRef(answersByQuestionId);
  const questionsRef = useRef(questions);
  const dirtyRef = useRef(dirty);
  const generationRef = useRef(0);
  const inFlightRef = useRef(false);
  const pendingAfterFlightRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSavedRef = useRef(onSaved);

  useEffect(() => {
    answersRef.current = answersByQuestionId;
  }, [answersByQuestionId]);

  useEffect(() => {
    questionsRef.current = questions;
  }, [questions]);

  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);

  useEffect(() => {
    onSavedRef.current = onSaved;
  }, [onSaved]);

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const performSave = useCallback(async (): Promise<boolean> => {
    if (!enabled) return true;
    const payload = buildFullSavePayload(
      questionsRef.current,
      answersRef.current
    );
    if (payload.length === 0) {
      setDirty(false);
      dirtyRef.current = false;
      setStatus("idle");
      setNotice(null);
      return true;
    }

    const generation = ++generationRef.current;
    inFlightRef.current = true;
    setStatus("saving");
    setNotice("Saving…");
    setLastError(null);

    try {
      await assessmentService.saveAnswers(assessmentId, payload);
      if (generation !== generationRef.current) {
        // Newer save started — ignore this completion for UI state
        return true;
      }
      setDirty(false);
      dirtyRef.current = false;
      setStatus("saved");
      setNotice(
        `Saved ${payload.length} control${payload.length === 1 ? "" : "s"}.`
      );
      onSavedRef.current?.();
      return true;
    } catch (err: unknown) {
      if (generation !== generationRef.current) return false;
      const msg = getApiErrorMessage(err, "Failed to save control evaluations.");
      setStatus("failed");
      setNotice(msg);
      setLastError(msg);
      return false;
    } finally {
      if (generation === generationRef.current) {
        inFlightRef.current = false;
        if (pendingAfterFlightRef.current && dirtyRef.current) {
          pendingAfterFlightRef.current = false;
          void performSave();
        } else {
          pendingAfterFlightRef.current = false;
        }
      }
    }
  }, [assessmentId, enabled, setDirty]);

  const flush = useCallback(async (): Promise<boolean> => {
    clearTimer();
    if (!enabled) return true;
    if (!dirtyRef.current && !inFlightRef.current) return true;
    if (inFlightRef.current) {
      pendingAfterFlightRef.current = true;
      // Wait briefly for in-flight to finish then save again
      await new Promise((r) => setTimeout(r, 50));
      let spins = 0;
      while (inFlightRef.current && spins < 80) {
        await new Promise((r) => setTimeout(r, 50));
        spins++;
      }
    }
    return performSave();
  }, [enabled, performSave]);

  const retry = useCallback(async () => {
    clearTimer();
    return performSave();
  }, [performSave]);

  // Debounced autosave when dirty
  useEffect(() => {
    if (!enabled || !dirty) return;
    clearTimer();
    timerRef.current = setTimeout(() => {
      if (inFlightRef.current) {
        pendingAfterFlightRef.current = true;
        return;
      }
      void performSave();
    }, DEBOUNCE_MS);
    return clearTimer;
  }, [dirty, answersByQuestionId, enabled, performSave]);

  // Warn on browser leave with unsaved changes
  useEffect(() => {
    if (!enabled) return;
    const handler = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current || inFlightRef.current || status === "saving") {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [enabled, status]);

  return {
    status,
    notice,
    lastError,
    flush,
    retry,
    setNotice,
    setStatus,
  };
}
