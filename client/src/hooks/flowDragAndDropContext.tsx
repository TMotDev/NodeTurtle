import { createContext, useCallback, useContext, useState } from "react";
import { useReactFlow } from "@xyflow/react";
import { v4 as uuidv4 } from "uuid";
import { INITIAL_NODE_DATA } from "@/lib/flowUtils";

export const useDragDrop = () => {
  const { screenToFlowPosition, setNodes } = useReactFlow();
  const [_, setType] = useDnD();

  const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();

      const nodeType = event.dataTransfer.getData("text/plain");
      console.log(event)
      if (!nodeType) {
        console.error("Node type is missing");
        return;
      }

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode = {
        id: `${nodeType}_${uuidv4()}`,
        type: nodeType,
        position,
        data: INITIAL_NODE_DATA[nodeType as keyof typeof INITIAL_NODE_DATA],
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [screenToFlowPosition, setNodes],
  );

  const onDragStart = (event: React.DragEvent<HTMLElement>, nodeType: string) => {
    event.dataTransfer.setData("text/plain", nodeType);
    setType(nodeType);
    event.dataTransfer.effectAllowed = "move";
  };

  return {
    onDragOver,
    onDrop,
    onDragStart,
  };
};

const DnDContext = createContext<
  [string | null, (type: string | null) => void]
>([null, (_) => {}]);

export const DnDProvider = ({ children }: { children: React.ReactNode }) => {
  const [type, setType] = useState<string | null>(null);

  return (
    <DnDContext.Provider value={[type, setType]}>
      {children}
    </DnDContext.Provider>
  );
};

export default DnDContext;

export const useDnD = () => {
  return useContext(DnDContext);
};

