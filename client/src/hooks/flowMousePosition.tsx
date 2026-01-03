import React, { createContext, useCallback, useContext, useRef, useState } from "react";
interface MousePosition {
  x: number;
  y: number;
}

interface MouseContextType {
  mousePosition: MousePosition;
  reactFlowWrapper: React.RefObject<HTMLDivElement | null>;
  handleMouseMove: (event: React.MouseEvent) => void;
}

const MouseContext = createContext<MouseContextType | null>(null);

export const useMousePosition = () => {
  const context = useContext(MouseContext);
  if (!context) {
    throw new Error("useMousePosition must be used within a MouseProvider");
  }
  return context;
};

export function MouseProvider({ children }: { children: React.ReactNode }) {
  const [mousePosition, setMousePosition] = useState<MousePosition>({
    x: 0,
    y: 0,
  });
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    setMousePosition({
      x: event.clientX,
      y: event.clientY,
    });
  }, []);

  return (
    <MouseContext.Provider value={{ mousePosition, reactFlowWrapper, handleMouseMove }}>
      {children}
    </MouseContext.Provider>
  );
}
