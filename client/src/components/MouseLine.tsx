import { useEffect, useState } from "react";
import { useLazyConnect } from "@/hooks/LazyConnect";

const MouseLine = ({ isActive }: { isActive: boolean }) => {
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [currentPoint, setCurrentPoint] = useState<{ x: number; y: number } | null>(null);

  const { connectionValid } = useLazyConnect();

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (isActive) {
        if (!startPoint) {
          const newStartPoint = { x: event.clientX, y: event.clientY };
          setStartPoint(newStartPoint);
          setCurrentPoint(newStartPoint);
        } else {
          setCurrentPoint({ x: event.clientX, y: event.clientY });
        }
      }
    };

    if (isActive) {
      window.addEventListener("mousemove", handleMouseMove);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [isActive, startPoint]);

  useEffect(() => {
    if (!isActive) {
      setStartPoint(null);
      setCurrentPoint(null);
    }
  }, [isActive]);

  if (!isActive || !startPoint || !currentPoint) {
    return null;
  }

  return (
    <svg
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        pointerEvents: "none",
        zIndex: 9999,
      }}
    >
      <line
        x1={startPoint.x}
        y1={startPoint.y}
        x2={currentPoint.x}
        y2={currentPoint.y}
        stroke={connectionValid ? "#FFBE3C" : "#888888"}
        strokeWidth="2"
        strokeDasharray="5,5"
        opacity="0.8"
      />
      <circle
        cx={startPoint.x}
        cy={startPoint.y}
        r="4"
        fill={connectionValid ? "#FFBE3C" : "#888888"}
        opacity="0.6"
      />
      <circle
        className="mouse-line"
        cx={currentPoint.x}
        cy={currentPoint.y}
        r="4"
        fill={connectionValid ? "#FFBE3C" : "#888888"}
        opacity="0.6"
      />
    </svg>
  );
};

export default MouseLine;
