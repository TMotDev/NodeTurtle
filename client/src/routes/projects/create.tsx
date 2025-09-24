import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import type { Project } from "@/api/projects";
import { FlowEditor } from "@/components/node-flow/FlowEditor";
import { Toaster } from "@/components/ui/sonner";
import { useLocalProjectManager } from "@/hooks/FlowManager";
import { ProjectSelectionDialog } from "@/components/ProjectSelectionDialog";

export const Route = createFileRoute("/projects/create")({
  component: LocalEditor,
});

function LocalProject() {
  const [project, setProject] = useState<Project | null>(null);
  const [showProjectDialog, setShowProjectDialog] = useState(true);

  const { getSavedFlows, loadFlow, createNewFlow, deleteFlow, currentFlowId, currentFlowTitle } =
    useLocalProjectManager();

  // When a project is selected or created, hide dialog and set project
  const handleSelectProject = (projectId: string) => {
    console.log(projectId)
    loadFlow(projectId);
    const flows = getSavedFlows();
    const selectedProject = flows.find((f) => f.id === projectId);
    setProject(selectedProject || null);
    setShowProjectDialog(false);
  };

  const handleCreateNew = (title: string) => {
    // Capture the newly created project ID
    const newProjectId = createNewFlow(title);

    console.log(newProjectId)

    // Use the newProjectId to create the project object
    const newProject: Project = {
      id: newProjectId, // Use the fresh ID here
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
    console.log(newProject)
    setProject(newProject);
    setShowProjectDialog(false);
  };

  const handleDeleteProject = (projectId: string) => {
    deleteFlow(projectId);
  };

  const handleCloseDialog = () => {
    // If no project is selected and dialog is closed, create a new empty project
    if (!project) {
      handleCreateNew("Untitled Project");
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

      <Toaster richColors position="top-center" expand />
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
