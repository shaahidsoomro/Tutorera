import { UI_COLORS } from "@/lib/brand";

const C = UI_COLORS;

interface Step {
  number: number;
  title: string;
  estimatedMinutes?: number;
}

interface ProgressIndicatorProps {
  steps: Step[];
  currentStep: number;
  onStepClick?: (stepNumber: number) => void;
}

export function ProgressIndicator({ steps, currentStep, onStepClick }: ProgressIndicatorProps) {
  const totalMinutes = steps.reduce((sum, s) => sum + (s.estimatedMinutes || 5), 0);
  const completedMinutes = steps
    .slice(0, currentStep - 1)
    .reduce((sum, s) => sum + (s.estimatedMinutes || 5), 0);
  const progressPercent = Math.round((completedMinutes / totalMinutes) * 100);
  const remainingMinutes = totalMinutes - completedMinutes;

  return (
    <div style={{ marginBottom: "2rem" }}>
      {/* Progress bar */}
      <div style={{ marginBottom: "1rem" }}>
        <div
          style={{
            height: "8px",
            backgroundColor: "#e5e7eb",
            borderRadius: "4px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              backgroundColor: C.accent,
              width: `${progressPercent}%`,
              transition: "width 0.3s ease",
            }}
          />
        </div>
        <p
          style={{
            fontSize: "0.75rem",
            color: C.gray500,
            marginTop: "0.4rem",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <span>{progressPercent}% Complete</span>
          <span>~{remainingMinutes} min remaining</span>
        </p>
      </div>

      {/* Steps */}
      <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem" }}>
        {steps.map((step) => {
          const isCompleted = step.number < currentStep;
          const isCurrent = step.number === currentStep;

          return (
            <button
              key={step.number}
              onClick={() => onStepClick?.(step.number)}
              disabled={step.number > currentStep}
              style={{
                flex: 1,
                padding: "0.75rem 0.5rem",
                borderRadius: "0.5rem",
                border: `2px solid ${
                  isCompleted ? C.accent : isCurrent ? C.accent : "#e5e7eb"
                }`,
                backgroundColor: isCompleted ? C.accent : isCurrent ? "#f0f9ff" : "white",
                color: isCompleted ? "white" : C.primary,
                fontSize: "0.7rem",
                fontWeight: isCurrent ? 600 : 500,
                cursor: step.number > currentStep ? "not-allowed" : "pointer",
                opacity: step.number > currentStep ? 0.6 : 1,
                transition: "all 0.2s",
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.25rem",
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "20px",
                  height: "20px",
                  borderRadius: "50%",
                  backgroundColor: isCompleted ? "rgba(255,255,255,0.3)" : "transparent",
                  fontSize: "0.65rem",
                  fontWeight: "bold",
                }}
              >
                {isCompleted ? "✓" : step.number}
              </span>
              <span>{step.title}</span>
              {step.estimatedMinutes && (
                <span style={{ fontSize: "0.6rem", opacity: 0.7 }}>
                  {step.estimatedMinutes}min
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
