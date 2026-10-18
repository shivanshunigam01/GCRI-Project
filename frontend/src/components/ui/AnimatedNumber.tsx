"use client";

import React, { useEffect, useRef, useState } from "react";

export interface AnimatedNumberProps {
  value: number | string;
  duration?: number;
  delay?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  formatNumber?: boolean;
}

export function AnimatedNumber({
  value,
  duration = 1000,
  delay = 0,
  decimals,
  prefix = "",
  suffix = "",
  className = "",
  formatNumber = true,
}: AnimatedNumberProps) {
  // Parse numeric target value and any embedded suffix/prefix
  let rawStr = String(value ?? 0).trim();
  let extractedPrefix = prefix;
  let extractedSuffix = suffix;

  if (!prefix && (rawStr.startsWith("+") || rawStr.startsWith("$"))) {
    extractedPrefix = rawStr.charAt(0);
    rawStr = rawStr.slice(1);
  }
  if (!suffix && rawStr.endsWith("%")) {
    extractedSuffix = "%";
    rawStr = rawStr.slice(0, -1);
  }

  const numValue = parseFloat(rawStr.replace(/,/g, "")) || 0;
  const numDecimals =
    decimals !== undefined
      ? decimals
      : rawStr.includes(".")
      ? rawStr.split(".")[1].length
      : 0;

  const [displayValue, setDisplayValue] = useState<number>(0);
  const currentValRef = useRef<number>(0);
  const rafIdRef = useRef<number | null>(null);

  useEffect(() => {
    let startTime: number | null = null;
    const startVal = currentValRef.current;
    const targetVal = numValue;

    if (startVal === targetVal) {
      setDisplayValue(targetVal);
      return;
    }

    let timeoutId: NodeJS.Timeout | null = null;

    const startAnimation = () => {
      const step = (timestamp: number) => {
        if (!startTime) startTime = timestamp;
        const elapsed = timestamp - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Smooth cubic ease-out: rapid initial rise, gentle deceleration to rest
        const ease = 1 - Math.pow(1 - progress, 3);
        const current = startVal + (targetVal - startVal) * ease;

        currentValRef.current = current;
        setDisplayValue(current);

        if (progress < 1) {
          rafIdRef.current = requestAnimationFrame(step);
        } else {
          currentValRef.current = targetVal;
          setDisplayValue(targetVal);
        }
      };

      rafIdRef.current = requestAnimationFrame(step);
    };

    if (delay > 0) {
      timeoutId = setTimeout(startAnimation, delay);
    } else {
      startAnimation();
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, [numValue, duration, delay]);

  const formatted =
    numDecimals > 0
      ? displayValue.toFixed(numDecimals)
      : formatNumber
      ? Math.round(displayValue).toLocaleString()
      : Math.round(displayValue).toString();

  return (
    <span className={`tabular-nums inline-block tracking-tight ${className}`}>
      {extractedPrefix}
      {formatted}
      {extractedSuffix}
    </span>
  );
}

export default AnimatedNumber;
