import { createContext, useCallback, useContext, useState } from "react";
import { useReactFlow } from "@xyflow/react";
import { v4 as uuidv4 } from "uuid";
import { INITIAL_NODE_DATA } from "@/lib/flowUtils";

export const useDragDrop = () => {
  const { screenToFlowPosition, setNodes } = useReactFlow();
  const [type, setType] = useDnD();

  const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: { preventDefault: () => void; clientX: any; clientY: any }) => {
      event.preventDefault();

      if (!type) {
        return;
      }

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      const newNode = {
        id: `node_${uuidv4()}`,
        type,
        position,
        data: INITIAL_NODE_DATA[type as keyof typeof INITIAL_NODE_DATA],
      };

      setNodes((nds: Array<any>) => nds.concat(newNode));
    },
    [screenToFlowPosition, type, setNodes],
  );

  const onDragStart = (event: React.DragEvent<HTMLDivElement>) => {
    const nodeType = event.dataTransfer.getData("text/plain");
    setType(nodeType);
    event.dataTransfer.setData("text/plain", nodeType);
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
