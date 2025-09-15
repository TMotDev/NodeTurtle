import { Save } from "lucide-react";
import { useReactFlow } from "@xyflow/react";
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarHeader } from "../ui/sidebar";
import { Button } from "../ui/button";
import { FlowTitle } from "./FlowTitle";
import type { Flow, Project } from "@/api/projects";
import { API } from "@/services/api";
import { useFlowManagerContext } from "@/hooks/FlowManager";

export default function NodeSidebar({ project }: { project: Project }) {
  const { getNodes, getEdges, getViewport } = useReactFlow();

    const {
    hasUnsavedChanges, setHasUnsavedChanges
  } = useFlowManagerContext();

  async function saveFlow() {
    const flowData: Flow = {
      nodes: getNodes(),
      edges: getEdges(),
      viewport: getViewport(),
      nodeCount: getNodes().length,
    };

    const result = await API.patch(`/projects/${project.id}`, { data: JSON.stringify(flowData) });

    if (!result.success) {
      console.log(result.error);
      return;
    }

    setHasUnsavedChanges(false)
  }

  async function changeTitle(newTitle: string) {
    const result = await API.patch(`/projects/${project.id}`, { title: newTitle });

    if (!result.success) {
      console.log(result.error);
      return;
    }
  }

  return (
    <Sidebar>
      <SidebarHeader>
        <FlowTitle title={project.title} onTitleChange={(title) => changeTitle(title)} />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          {/* <Button onClick={createNewFlow} variant="outline" className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            New Flow
          </Button> */}
          <Button onClick={saveFlow} className="w-full">
            <Save className="w-4 h-4 mr-2" />
            Save
            {hasUnsavedChanges && (
              <span className="ml-2 w-2 h-2 bg-white rounded-full" />
            )}
          </Button>
          {/* <LoadFlowDialog
            onLoadFlow={loadFlow}
            onDeleteFlow={deleteFlow}
            hasUnsavedChanges={hasUnsavedChanges}
            onSaveCurrentFlow={saveCurrentFlow}
          >
            <Button variant="outline" className="w-full">
              <FolderOpen className="w-4 h-4 mr-2" />
              Load Flow
            </Button>
          </LoadFlowDialog> */}
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter />
    </Sidebar>
  );
}
