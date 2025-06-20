import { Button } from "../ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
} from "../ui/sidebar";
import { useSaveLoad } from "@/hooks/flowSaveLoad";
import { useDnD } from "@/hooks/flowDragAndDropContext";

export default function NodeSiderbar() {
  const [_, setType] = useDnD();

    const {save, load} = useSaveLoad();


  function onDragStart(
    event: React.DragEvent<HTMLDivElement>,
    nodeType: string,
  ) {
    setType(nodeType);

    event.dataTransfer.effectAllowed = "move";
  }

  return (
    <Sidebar>
      <SidebarHeader />
      <SidebarContent>
        <SidebarGroup>
          <div
            className="dndnode input"
            onDragStart={(event) => onDragStart(event, "nodeBase")}
            draggable
          >
            Input Node
          </div>
          <div
            className="dndnode"
            onDragStart={(event) => onDragStart(event, "nodeBase")}
            draggable
          >
            Default Node
          </div>
          <div
            className="dndnode output"
            onDragStart={(event) => onDragStart(event, "nodeBase")}
            draggable
          >
            Output Node
          </div>
        </SidebarGroup>
        <SidebarGroup>
          <Button onClick={save}>
            Save
          </Button>
          <Button onClick={load}>
            Load
          </Button>
        </SidebarGroup>
        <SidebarGroup />
      </SidebarContent>
      <SidebarFooter />
    </Sidebar>
  );
}
