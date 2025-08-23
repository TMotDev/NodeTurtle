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
import type { Flow, Project } from "@/api/projects";

const FLOWS_STORAGE_KEY = "savedFlows";
const CURRENT_FLOW_KEY = "currentFlowId";

export const useLocalProjectManager = () => {
  const { getNodes, getEdges, setNodes, setEdges, setViewport, getViewport } =
    useReactFlow();
  const [currentProjectID, setCurrentProjectID] = useState<string | null>(null);
  const [currentProjectTitle, setCurrentProjectTitle] =
    useState<string>("Untitled Project");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const getLocalProjects = useCallback((): Array<Project> => {
    const saved = localStorage.getItem(FLOWS_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  }, []);

  const loadLocalProject = useCallback(
    (projectID: string) => {
      const projects = getLocalProjects();
      const p = projects.find((proj) => proj.id === projectID);

      if (p && p.data) {
        setNodes(p.data.nodes);
        setEdges(p.data.edges);
        setViewport(p.data.viewport);
        setCurrentProjectID(p.id);
        setCurrentProjectTitle(p.title);
        localStorage.setItem(CURRENT_FLOW_KEY, p.id);
        setHasUnsavedChanges(false);
      }
    },
    [setNodes, setEdges, setViewport, getLocalProjects],
  );

  // Load current flow ID on mount
  useEffect(() => {
    const savedCurrentId = localStorage.getItem(CURRENT_FLOW_KEY);
    if (savedCurrentId) {
      setCurrentProjectID(savedCurrentId);
      const flows = getLocalProjects();
      const currentFlow = flows.find((f) => f.id === savedCurrentId);
      loadLocalProject(savedCurrentId);
      if (currentFlow) {
        setCurrentProjectTitle(currentFlow.title);
      }
    } else {
      const newId = `flow_${uuidv4()}`;
      setCurrentProjectID(newId);
      setCurrentProjectTitle("Untitled flow");
    }
  }, [getLocalProjects, loadLocalProject]);

  const markAsModified = useCallback(() => {
    setHasUnsavedChanges(true);
  }, []);

  const saveLocalProject = useCallback(() => {
    if (!currentProjectID) return;

    const projects = getLocalProjects();

    const flowData:Flow = {
      nodes: getNodes(),
      edges:   getEdges(),
      viewport: getViewport(),
      nodeCount: getNodes().length
    }

    const currentProject: Project = {
      id: currentProjectID,
      title: currentProjectTitle,
      created_at: projects.find((f) => f.id === currentProjectID)?.created_at ||
        new Date().toISOString(),
      last_edited_at: new Date().toISOString(),
      description: "-",
      creator_id: "-",
      creator_username: "-",
      likes_count: 0,
      is_public: false,
      data: flowData
    };

    const updatedFlows = projects.filter((f) => f.id !== currentProjectID);
    updatedFlows.push(currentProject);

    localStorage.setItem(FLOWS_STORAGE_KEY, JSON.stringify(updatedFlows));
    localStorage.setItem(CURRENT_FLOW_KEY, currentProjectID);
    setHasUnsavedChanges(false);
  }, [
    currentProjectID,
    currentProjectTitle,
    getNodes,
    getEdges,
    getViewport,
    getLocalProjects,
  ]);

  const createNewFlow = useCallback(() => {
    const newId = `flow_${uuidv4()}`;
    const newTitle = "Untitled flow";

    setNodes([]);
    setEdges([]);
    setCurrentProjectID(newId);
    setCurrentProjectTitle(newTitle);
    localStorage.setItem(CURRENT_FLOW_KEY, newId);
    setHasUnsavedChanges(false);
  }, [setNodes, setEdges]);

  const deleteFlow = useCallback(
    (flowId: string) => {
      const flows = getLocalProjects();
      const updatedFlows = flows.filter((f) => f.id !== flowId);
      localStorage.setItem(FLOWS_STORAGE_KEY, JSON.stringify(updatedFlows));

      // If deleting current flow, create new one
      if (flowId === currentProjectID) {
        createNewFlow();
      }
    },
    [getLocalProjects, currentProjectID, createNewFlow],
  );

  const updateFlowTitle = useCallback((newTitle: string) => {
    setCurrentProjectTitle(newTitle);
    setHasUnsavedChanges(true);
  }, []);

  return {
    currentFlowId: currentProjectID,
    currentFlowTitle: currentProjectTitle,
    hasUnsavedChanges,
    getSavedFlows: getLocalProjects,
    saveCurrentFlow: saveLocalProject,
    loadFlow: loadLocalProject,
    createNewFlow,
    deleteFlow,
    updateFlowTitle,
    markAsModified,
  };
};

const FlowManagerContext = createContext<ReturnType<
  typeof useLocalProjectManager
> | null>(null);

interface FlowManagerProviderProps {
  children: ReactNode;
}

export const FlowManagerProvider: React.FC<FlowManagerProviderProps> = ({
  children,
}) => {
  const flowManager = useLocalProjectManager();

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
