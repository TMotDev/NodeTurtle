import { useEffect, useState } from "react";

const MouseTrail = ({ isActive }: { isActive: boolean }) => {
  const [points, setPoints] = useState<Array<{ x: number; y: number }>>([]);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (isActive) {
        const newPoint = { x: event.clientX, y: event.clientY };
        setPoints((prevPoints) => [...prevPoints, newPoint]);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [isActive]);

  useEffect(() => {
    if (!isActive) {
      setPoints([]);
    }
  }, [isActive]);

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
      <polyline
        points={points.map((p) => `${p.x},${p.y}`).join(" ")}
        fill="none"
        stroke="#ff4444"
        strokeDasharray="5,5"
        opacity="0.8"
        strokeWidth="2"
      />
    </svg>
  );
};

export default MouseTrail;
