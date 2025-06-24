import { FolderOpen, Plus, Save } from "lucide-react";
import { Button } from "../ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
} from "../ui/sidebar";
import { LoadFlowDialog } from "./LoadFlowDialog";
import { FlowTitle } from "./FlowTitle";
import { useDnD } from "@/hooks/flowDragAndDropContext";
import { useFlowManagerContext } from "@/hooks/FlowManager";

export default function NodeSidebar() {
  const [_, setType] = useDnD();
  const {
    currentFlowTitle,
    hasUnsavedChanges,
    saveCurrentFlow,
    loadFlow,
    createNewFlow,
    deleteFlow,
    updateFlowTitle,
  } = useFlowManagerContext();

  function onDragStart(
    event: React.DragEvent<HTMLDivElement>,
    nodeType: string,
  ) {
    setType(nodeType);
    event.dataTransfer.effectAllowed = "move";
  }

  return (
    <Sidebar>
      <SidebarHeader>
        <FlowTitle
          title={currentFlowTitle}
          onTitleChange={updateFlowTitle}
          hasUnsavedChanges={hasUnsavedChanges}
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
          <Button onClick={createNewFlow} variant="outline" className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            New Flow
          </Button>
          <Button onClick={saveCurrentFlow} className="w-full">
            <Save className="w-4 h-4 mr-2" />
            Save
            {hasUnsavedChanges && (
              <span className="ml-2 w-2 h-2 bg-white rounded-full" />
            )}
          </Button>
          <LoadFlowDialog
            onLoadFlow={loadFlow}
            onDeleteFlow={deleteFlow}
            hasUnsavedChanges={hasUnsavedChanges}
            onSaveCurrentFlow={saveCurrentFlow}
          >
            <Button variant="outline" className="w-full">
              <FolderOpen className="w-4 h-4 mr-2" />
              Load Flow
            </Button>
          </LoadFlowDialog>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter />
    </Sidebar>
  );
}
