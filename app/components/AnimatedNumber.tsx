"use client";

import NumberFlow from "@number-flow/react";

/**
 * Animated number display using NumberFlow.
 * Digits roll/morph when values change — far more alive than static text.
 */
export default function AnimatedNumber({
  value,
  prefix = "",
  suffix = "",
  className = "",
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}) {
  return (
    <span className={className}>
      {prefix}
      <NumberFlow value={value} />
      {suffix}
    </span>
  );
}
