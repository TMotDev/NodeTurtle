import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import type { Project } from "@/api/projects";
import { FlowEditor } from "@/components/node-flow/FlowEditor";
import { useLocalProjectManager } from "@/hooks/FlowManager";
import { ProjectSelectionDialog } from "@/components/ProjectSelectionDialog";

export const Route = createFileRoute("/projects/create")({
  component: LocalEditor,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      projectId: (search.projectId as string) || undefined,
    };
  },
  head: () => ({
    meta: [
      {
        title: "Turtle Graphics - Create",
      },
    ],
  }),
});

function LocalProject() {
  const navigate = useNavigate();
  const router = useRouter();

  const { projectId } = Route.useSearch();

  const [project, setProject] = useState<Project | null>(null);
  const [showProjectDialog, setShowProjectDialog] = useState(true);

  const {
    getSavedFlows,
    loadFlow,
    createNewFlow,
    saveCurrentFlow,
    deleteFlow,
    currentFlowId,
    currentFlowTitle,
  } = useLocalProjectManager();

  // When a project is selected or created, hide dialog and set project
  const handleSelectProject = (projectId: string) => {
    console.log(projectId);
    loadFlow(projectId);
    const flows = getSavedFlows();
    const selectedProject = flows.find((f) => f.id === projectId);
    setProject(selectedProject || null);
    setShowProjectDialog(false);
  };

  const handleCreateNew = (title: string) => {
    const newProjectId = createNewFlow(title);

    const newProject: Project = {
      id: newProjectId,
      title: title,
      created_at: new Date().toISOString(),
      last_edited_at: new Date().toISOString(),
      description: "-",
      creator_id: "-",
      creator_username: "-",
      likes_count: 0,
      is_public: false,
      data: {
        nodes: [],
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 },
        nodeCount: 0,
      },
    };

    saveCurrentFlow(newProjectId, title);

    setProject(newProject);
    setShowProjectDialog(false);
  };

  const handleDeleteProject = (projectId: string) => {
    deleteFlow(projectId);
  };

  const handleCloseDialog = () => {
    if (!project) {
      if (router.history.canGoBack()) {
        router.history.back();
      } else {
        router.navigate({ to: "/" });
      }
    } else {
      setShowProjectDialog(false);
    }
  };

  // Show dialog again if user wants to switch projects
  const handleSwitchProject = () => {
    setShowProjectDialog(true);
  };

  // Update project title when it changes in the flow manager
  useEffect(() => {
    if (project && currentFlowTitle !== project.title) {
      setProject((prev) => (prev ? { ...prev, title: currentFlowTitle } : null));
    }
  }, [currentFlowTitle, project]);

  // Handle projectId query param on mount
  useEffect(() => {
    console.log("projectId from search:", projectId);
    if (projectId) {
      handleSelectProject(projectId);
    }
  }, [projectId]);

  return (
    <div className={showProjectDialog ? "pattern w-screen h-screen" : undefined}>
      <ProjectSelectionDialog
        open={showProjectDialog}
        savedProjects={getSavedFlows()}
        onSelectProject={handleSelectProject}
        onCreateNew={handleCreateNew}
        onDeleteProject={handleDeleteProject}
        onClose={handleCloseDialog}
      />
      {!showProjectDialog && <FlowEditor project={project} onSwitchProject={handleSwitchProject} />}
    </div>
  );
}

export function LocalEditor() {
  return (
    <ReactFlowProvider>
      <LocalProject />
    </ReactFlowProvider>
  );
}
