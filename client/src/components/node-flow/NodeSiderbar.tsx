import { Save } from "lucide-react";
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarHeader } from "../ui/sidebar";
import { Button } from "../ui/button";
import { FlowTitle } from "./FlowTitle";
import type { Project } from "@/api/projects";
import { useFlowManagerContext } from "@/hooks/FlowManager";

export default function NodeSidebar({ project }: { project: Project }) {
  const { saveFlow, changeTitle } = useFlowManagerContext();

  const { hasUnsavedChanges } = useFlowManagerContext();

  return (
    <Sidebar>
      <SidebarHeader>
        <FlowTitle
          title={project.title}
          onTitleChange={(title) => changeTitle(project.id, title)}
        />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          {/* <Button onClick={createNewFlow} variant="outline" className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            New Flow
          </Button> */}
          <Button onClick={() => saveFlow(project.id)} className="w-full">
            <Save className="w-4 h-4 mr-2" />
            Save
            {hasUnsavedChanges && <span className="ml-2 w-2 h-2 bg-white rounded-full" />}
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
