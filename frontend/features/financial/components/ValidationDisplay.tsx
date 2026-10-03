/**
 * Validation Display Component
 * Shows validation errors and warnings to the user
 */

import styles from "./FinancialCalculator.module.css";
import type { ValidationResult } from "@/features/financial/utils/validation";

interface ValidationDisplayProps {
  validation: ValidationResult;
}

export default function ValidationDisplay({
  validation,
}: ValidationDisplayProps) {
  const boxes = [
    {
      kind: "error",
      icon: "⛔",
      title: "Invalid Inputs",
      messages: validation.errors,
    },
    {
      kind: "warning",
      icon: "⚠️",
      title: "Please Review",
      messages: validation.warnings,
    },
  ];

  return (
    <>
      {boxes.map(
        ({ kind, icon, title, messages }) =>
          messages.length > 0 && (
            <div key={kind} className={styles[`${kind}Box`]}>
              <div className={styles[`${kind}Icon`]}>{icon}</div>
              <div className={styles[`${kind}Content`]}>
                <div className={styles[`${kind}Title`]}>{title}</div>
                {messages.map((message, idx) => (
                  <p key={idx} className={styles[`${kind}Text`]}>
                    {message}
                  </p>
                ))}
              </div>
            </div>
          ),
      )}
    </>
  );
}
