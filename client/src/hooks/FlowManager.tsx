import { useReactFlow } from "@xyflow/react";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import type { ReactNode } from "react";
import type { Flow, Project } from "@/api/projects";
import type { ApiResponse } from "@/api/utils";
import { API } from "@/services/api";

const FLOWS_STORAGE_KEY = "savedFlows";
const CURRENT_FLOW_KEY = "currentFlowId";

export const useLocalProjectManager = () => {
  const { getNodes, getEdges, setNodes, setEdges, setViewport, getViewport } = useReactFlow();
  const [currentProjectID, setCurrentProjectID] = useState<string | null>(null);
  const [currentProjectTitle, setCurrentProjectTitle] = useState<string>("Untitled Project");
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
        if (p.data.viewport) {
          setViewport(p.data.viewport);
        }
        setCurrentProjectID(p.id);
        setCurrentProjectTitle(p.title);
        localStorage.setItem(CURRENT_FLOW_KEY, p.id);
        setHasUnsavedChanges(false);
      }
    },
    [setNodes, setEdges, setViewport, getLocalProjects],
  );

  // Initialize with empty state rather than trying to load
  useEffect(() => {
    // Don't auto-load on mount - let the UI handle project selection
    // This prevents the flash of loading an old project
  }, []);

  const markAsModified = useCallback(() => {
    setHasUnsavedChanges(true);
  }, []);

  const saveLocalProject = useCallback(
    (projectID: string) => {
      const projects = getLocalProjects();

      console.log(projects);
      const flowData: Flow = {
        nodes: getNodes(),
        edges: getEdges(),
        viewport: getViewport(),
        nodeCount: getNodes().length,
      };

      const currentProject: Project = {
        id: projectID,
        title: currentProjectTitle,
        created_at:
          projects.find((f) => f.id === projectID)?.created_at || new Date().toISOString(),
        last_edited_at: new Date().toISOString(),
        description: "-",
        creator_id: "-",
        creator_username: "-",
        likes_count: 0,
        is_public: false,
        data: flowData,
      };

      const updatedFlows = projects.filter((f) => f.id !== projectID);
      updatedFlows.push(currentProject);

      localStorage.setItem(FLOWS_STORAGE_KEY, JSON.stringify(updatedFlows));
      localStorage.setItem(CURRENT_FLOW_KEY, projectID);

      console.log("saved", currentProject, updatedFlows);
      setHasUnsavedChanges(false);
    },
    [currentProjectTitle, getNodes, getEdges, getViewport, getLocalProjects],
  );

  async function saveFlow(projectID: string, local: boolean = false) {
    console.log("saving", projectID);
    if (local) {
      console.log("local");
      saveLocalProject(projectID);
      return;
    }
    const flowData: Flow = {
      nodes: getNodes(),
      edges: getEdges(),
      viewport: getViewport(),
      nodeCount: getNodes().length,
    };

    const result = await API.patch(`/projects/${projectID}`, { data: JSON.stringify(flowData) });

    if (!result.success) {
      toast.error(`Error when saving project: ${result.error}`);
      return;
    } else {
      setHasUnsavedChanges(false);
    }
  }

  async function changeTitle(projectID: string, newTitle: string): Promise<ApiResponse> {
    const result = await API.patch(`/projects/${projectID}`, { title: newTitle });

    return result;
  }

  const createNewFlow = useCallback(
    (title?: string) => {
      const newId = `flow_${uuidv4()}`;
      const newTitle = title || "Untitled flow";

      setNodes([]);
      setEdges([]);
      console.log(newId);
      setCurrentProjectID(newId);
      setCurrentProjectTitle(newTitle);
      localStorage.setItem(CURRENT_FLOW_KEY, newId);
      setHasUnsavedChanges(true);

      return newId;
    },
    [setNodes, setEdges],
  );

  const deleteFlow = useCallback(
    (flowId: string) => {
      const flows = getLocalProjects();
      const updatedFlows = flows.filter((f) => f.id !== flowId);
      localStorage.setItem(FLOWS_STORAGE_KEY, JSON.stringify(updatedFlows));

      // If deleting current flow, clear current project
      if (flowId === currentProjectID) {
        setCurrentProjectID(null);
        setCurrentProjectTitle("Untitled Project");
        localStorage.removeItem(CURRENT_FLOW_KEY);
        setNodes([]);
        setEdges([]);
        setHasUnsavedChanges(false);
      }
    },
    [getLocalProjects, currentProjectID, setNodes, setEdges],
  );

  const updateFlowTitle = useCallback((newTitle: string) => {
    setCurrentProjectTitle(newTitle);
    setHasUnsavedChanges(true);
  }, []);

  // Method to load a project by ID
  const loadFlow = useCallback(
    (projectID?: string) => {
      if (projectID) {
        loadLocalProject(projectID);
      } else {
        // Load the most recent project if no ID specified
        const savedCurrentId = localStorage.getItem(CURRENT_FLOW_KEY);
        if (savedCurrentId) {
          loadLocalProject(savedCurrentId);
        }
      }
    },
    [loadLocalProject],
  );

  return {
    currentFlowId: currentProjectID,
    currentFlowTitle: currentProjectTitle,
    hasUnsavedChanges,
    setHasUnsavedChanges,
    getSavedFlows: getLocalProjects,
    saveCurrentFlow: saveLocalProject,
    loadFlow,
    saveFlow,
    changeTitle,
    createNewFlow,
    deleteFlow,
    updateFlowTitle,
    markAsModified,
  };
};

const FlowManagerContext = createContext<ReturnType<typeof useLocalProjectManager> | null>(null);

interface FlowManagerProviderProps {
  children: ReactNode;
}

export const FlowManagerProvider: React.FC<FlowManagerProviderProps> = ({ children }) => {
  const flowManager = useLocalProjectManager();

  return <FlowManagerContext.Provider value={flowManager}>{children}</FlowManagerContext.Provider>;
};

export const useFlowManagerContext = () => {
  const context = useContext(FlowManagerContext);
  if (!context) {
    throw new Error("useFlowManagerContext must be used within a FlowManagerProvider");
  }
  return context;
};
