import { useCallback, useEffect, useState } from "react";
import type { XYPosition } from "@xyflow/react";
import { useMousePosition } from "@/hooks/FlowMousePosition";

type MouseTrailVariant = "cut" | "lazy-connect" | "none";

interface MouseTrailProps {
  variant: MouseTrailVariant;
  isActive: boolean;
}

interface TrailState {
  path: Array<XYPosition>;
  isDrawing: boolean;
}

export function MouseTrail({ variant, isActive }: MouseTrailProps) {
  const { mousePosition } = useMousePosition();

  const [trailState, setTrailState] = useState<TrailState>({
    path: [],
    isDrawing: false,
  });

  const handleMouseDown = useCallback(
    (event: MouseEvent) => {
      if (!isActive || variant === "none") return;

      event.preventDefault();

      console.log("trail mouse down");
      const flowPosition = mousePosition;
      setTrailState({
        path: [flowPosition],
        isDrawing: true,
      });
    },
    [isActive, variant, mousePosition],
  );

  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      if (!isActive || variant === "none" || !trailState.isDrawing) return;

      event.preventDefault();

      const flowPosition = mousePosition;

      setTrailState((prev) => ({
        ...prev,
        path: [...prev.path, flowPosition],
      }));
    },
    [isActive, variant, mousePosition, trailState.isDrawing],
  );

  const handleMouseUp = useCallback(
    (event: MouseEvent) => {
      if (!isActive || variant === "none" || !trailState.isDrawing) return;

      event.preventDefault();

      // Reset trail state
      setTrailState({
        path: [],
        isDrawing: false,
      });
    },
    [isActive, variant, trailState.isDrawing],
  );

  // Handle cursor changes for cut tool
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && isActive && variant === "cut") {
        document.body.style.cursor = "crosshair";
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (!event.ctrlKey && variant === "cut") {
        document.body.style.cursor = "default";
        setTrailState({
          path: [],
          isDrawing: false,
        });
      }
    };

    if (isActive && variant === "cut") {
      document.addEventListener("keydown", handleKeyDown);
      document.addEventListener("keyup", handleKeyUp);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
      if (variant === "cut") {
        document.body.style.cursor = "default";
      }
    };
  }, [isActive, variant]);

  useEffect(() => {
    if (!isActive || variant === "none") return;

    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    console.log("mouse trail events added");

    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseDown, handleMouseMove, handleMouseUp, isActive, variant]);

  if (!isActive || variant === "none" || trailState.path.length < 2) {
    return null;
  }

  const getTrailStyles = () => {
    switch (variant) {
      case "cut":
        return {
          stroke: "#ff4444",
          strokeWidth: "2",
          strokeDasharray: "5,5",
          opacity: "0.8",
          fill: "none",
        };
      case "lazy-connect":
        return {
          stroke: "url(#gradient)",
          strokeWidth: "3",
          strokeDasharray: "none",
          opacity: "0.9",
          fill: "none",
        };
      default:
        return {
          stroke: "#888888",
          strokeWidth: "2",
          strokeDasharray: "none",
          opacity: "0.5",
          fill: "none",
        };
    }
  };

  const trailStyles = getTrailStyles();

  return (
    <div className="absolute inset-0 pointer-events-none z-50">
      <svg className="absolute inset-0 w-full h-full overflow-visible">
        {/* Gradient definition for lazy-connect */}
        {variant === "lazy-connect" && (
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
              <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="1" />
            </linearGradient>
          </defs>
        )}

        <polyline
          points={trailState.path.map((point) => `${point.x},${point.y}`).join(" ")}
          stroke={trailStyles.stroke}
          strokeWidth={trailStyles.strokeWidth}
          strokeDasharray={trailStyles.strokeDasharray}
          opacity={trailStyles.opacity}
          fill={trailStyles.fill}
        />
      </svg>
    </div>
  );
}