import { useReactFlow } from "@xyflow/react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { v4 as uuidv4 } from "uuid";
import type { ReactNode } from "react";
import type { SavedFlow } from "@/types/flow";

const FLOWS_STORAGE_KEY = "savedFlows";
const CURRENT_FLOW_KEY = "currentFlowId";

export const useFlowManager = () => {
  const { getNodes, getEdges, setNodes, setEdges, setViewport, getViewport } =
    useReactFlow();
  const [currentFlowId, setCurrentFlowId] = useState<string | null>(null);
  const [currentFlowTitle, setCurrentFlowTitle] =
    useState<string>("Untitled Flow");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const getSavedFlows = useCallback((): Array<SavedFlow> => {
    const saved = localStorage.getItem(FLOWS_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  }, []);

  const loadFlow = useCallback(
    (flowId: string) => {
      const flows = getSavedFlows();
      const flow = flows.find((f) => f.id === flowId);

      if (flow) {
        setNodes(flow.nodes);
        setEdges(flow.edges);
        setViewport(flow.viewport);
        setCurrentFlowId(flow.id);
        setCurrentFlowTitle(flow.title);
        localStorage.setItem(CURRENT_FLOW_KEY, flow.id);
        setHasUnsavedChanges(false);
      }
    },
    [setNodes, setEdges, setViewport, getSavedFlows],
  );

  // Load current flow ID on mount
  useEffect(() => {
    const savedCurrentId = localStorage.getItem(CURRENT_FLOW_KEY);
    if (savedCurrentId) {
      setCurrentFlowId(savedCurrentId);
      const flows = getSavedFlows();
      const currentFlow = flows.find((f) => f.id === savedCurrentId);
      loadFlow(savedCurrentId);
      if (currentFlow) {
        setCurrentFlowTitle(currentFlow.title);
      }
    } else {
      const newId = `flow_${uuidv4()}`;
      setCurrentFlowId(newId);
      setCurrentFlowTitle("Untitled flow");
    }
  }, [getSavedFlows, loadFlow]);

  const markAsModified = useCallback(() => {
    setHasUnsavedChanges(true);
  }, []);

  const saveCurrentFlow = useCallback(() => {
    if (!currentFlowId) return;

    const flows = getSavedFlows();
    const currentFlow = {
      id: currentFlowId,
      title: currentFlowTitle,
      nodes: getNodes(),
      edges: getEdges(),
      viewport: getViewport(),
      createdAt:
        flows.find((f) => f.id === currentFlowId)?.createdAt ||
        new Date().toISOString(),
      lastModified: new Date().toISOString(),
      nodeCount: getNodes().length,
    };

    const updatedFlows = flows.filter((f) => f.id !== currentFlowId);
    updatedFlows.push(currentFlow);

    localStorage.setItem(FLOWS_STORAGE_KEY, JSON.stringify(updatedFlows));
    localStorage.setItem(CURRENT_FLOW_KEY, currentFlowId);
    setHasUnsavedChanges(false);
  }, [
    currentFlowId,
    currentFlowTitle,
    getNodes,
    getEdges,
    getViewport,
    getSavedFlows,
  ]);

  const createNewFlow = useCallback(() => {
    const newId = `flow_${uuidv4()}`;
    const newTitle = "Untitled flow";

    setNodes([]);
    setEdges([]);
    setCurrentFlowId(newId);
    setCurrentFlowTitle(newTitle);
    localStorage.setItem(CURRENT_FLOW_KEY, newId);
    setHasUnsavedChanges(false);
  }, [setNodes, setEdges]);

  const deleteFlow = useCallback(
    (flowId: string) => {
      const flows = getSavedFlows();
      const updatedFlows = flows.filter((f) => f.id !== flowId);
      localStorage.setItem(FLOWS_STORAGE_KEY, JSON.stringify(updatedFlows));

      // If deleting current flow, create new one
      if (flowId === currentFlowId) {
        createNewFlow();
      }
    },
    [getSavedFlows, currentFlowId, createNewFlow],
  );

  const updateFlowTitle = useCallback((newTitle: string) => {
    setCurrentFlowTitle(newTitle);
    setHasUnsavedChanges(true);
  }, []);

  return {
    currentFlowId,
    currentFlowTitle,
    hasUnsavedChanges,
    getSavedFlows,
    saveCurrentFlow,
    loadFlow,
    createNewFlow,
    deleteFlow,
    updateFlowTitle,
    markAsModified,
  };
};

const FlowManagerContext = createContext<ReturnType<
  typeof useFlowManager
> | null>(null);

interface FlowManagerProviderProps {
  children: ReactNode;
}

export const FlowManagerProvider: React.FC<FlowManagerProviderProps> = ({
  children,
}) => {
  const flowManager = useFlowManager();

  return (
    <FlowManagerContext.Provider value={flowManager}>
      {children}
    </FlowManagerContext.Provider>
  );
};

export const useFlowManagerContext = () => {
  const context = useContext(FlowManagerContext);
  if (!context) {
    throw new Error(
      "useFlowManagerContext must be used within a FlowManagerProvider",
    );
  }
  return context;
};
