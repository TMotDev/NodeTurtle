import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
} from "../ui/sidebar";
import { FlowTitle } from "./FlowTitle";
import type { Project } from "@/api/projects";
import { API } from "@/services/api";
import { useDnD } from "@/hooks/FlowDragAndDropContext";

export default function NodeSidebar({project}: {project:Project}) {
  const [_, setType] = useDnD();

  console.log(project.title)

  function onDragStart(
    event: React.DragEvent<HTMLDivElement>,
    nodeType: string,
  ) {
    setType(nodeType);
    event.dataTransfer.effectAllowed = "move";
  }

  async function changeTitle(newTitle: string){

    const result = await API.put(`/projects/${project.id}`, {"title":newTitle});

    if (!result.success) {
      console.log(result.error)
      return
    }
  }

  return (
    <Sidebar>
      <SidebarHeader>
        <FlowTitle
          title={project.title}
          onTitleChange={(title)=>changeTitle(title)}
        />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <div
            onDragStart={(event) => onDragStart(event, "startNode")}
            draggable
          >
            Start Node
          </div>
          <div
          onDragStart={(event) => onDragStart(event, "moveNode")}
            draggable
          >
            Move Node
          </div>
          <div
            onDragStart={(event) => onDragStart(event, "loopNode")}
            draggable
          >
            Loop Node
          </div>
        </SidebarGroup>
        <SidebarGroup>
          {/* <Button onClick={createNewFlow} variant="outline" className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            New Flow
          </Button> */}
          {/* <Button onClick={saveCurrentFlow} className="w-full">
            <Save className="w-4 h-4 mr-2" />
            Save
            {hasUnsavedChanges && (
              <span className="ml-2 w-2 h-2 bg-white rounded-full" />
            )}
          </Button> */}
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
