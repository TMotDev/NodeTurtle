import { ArrowRight, Eraser, Flag, FlagTriangleRight, Pen, Play, Repeat2, RotateCcw, Save, Scissors } from "lucide-react";
import { useState } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { Separator } from "../ui/separator";
import { useDragDrop } from "@/hooks/FlowDragAndDropContext";

export default function ToolboxIsland() {
  const { onDragStart } = useDragDrop();

  const [showNodes, setShowNodes] = useState(true)

  function handleShowTools(){
    if(!showNodes)
    {
      setShowNodes(true)
    }

  }

  const tools = [
    {
      id: "startNode",
      title: "Start",
      icon: Flag,
      hoverColor: "group-hover:text-emerald-600",
    },
    {
      id: "moveNode",
      title: "Move",
      icon: ArrowRight,
      hoverColor: "group-hover:text-blue-600",
    },
    {
      id: "rotateNode",
      title: "Rotate",
      icon: RotateCcw,
      hoverColor: "group-hover:text-teal-600",
    },
    {
      id: "loopNode",
      title: "Loop",
      icon: Repeat2,
      hoverColor: "group-hover:text-orange-600",
    },
    {
      id: "penNode",
      title: "Pen",
      icon: Pen,
      hoverColor: "group-hover:text-cyan-600",
    },
  ];

  return (
    <div className="flex flex-col items-center gap-2 transition-all duration-1000 ease-linear">
      <div className="bg-gray-500/20 backdrop-blur-xl rounded-2xl shadow-xl border border-gray-500/30 p-1 flex flex-row items-center">
        <div className={`flex-col gap-2 ${showNodes ? "flex" : "hidden"}`}>
          <div className="text-lg text-center font-bold text-gray-500" onClick={()=>setShowNodes((st)=>!st)}>Nodes</div>
          <div className="flex flex-row gap-2 px-2 pb-2">
            {tools.map((tool) => {
              const IconComponent = tool.icon;
              return (
                <Tooltip>
                  <TooltipTrigger>
                    <div
                      key={tool.id}
                      onDragStart={(event) => onDragStart(event, tool.id)}
                      draggable
                      className="group relative cursor-grab active:cursor-grabbing"
                    >
                      <div className="min-w-16 min-h-16 rounded-xl bg-white/40 hover:bg-white/60 border-2 border-gray-500/20 shadow-md transition-all duration-200 ease-out flex items-center justify-center hover:scale-105 active:scale-95">
                        <IconComponent
                          size={22}
                          className={`text-gray-700 transition-colors duration-200 ${tool.hoverColor}`}
                        />
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent sideOffset={5}>{tool.title}</TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </div>
        <div className={`h-16 w-1 rounded-lg bg-gray-500/20 hover:scale-105 transition-scale duration-300 ease-out cursor-pointer ${!showNodes && 'mx-4 w-2'}`} onClick={handleShowTools}></div>
        <div className="flex flex-col gap-2">
          <div className="text-lg text-center font-bold text-gray-500">Actions</div>
          <div className="flex flex-row gap-2 px-2 pb-2">
            <Tooltip>
              <TooltipTrigger>
                <div
                  className="group relative cursor-grab active:cursor-grabbing"
                >
                  <div className="min-w-16 min-h-16 rounded-xl bg-white/40 hover:bg-white/60 border-2 border-gray-500/20 shadow-md transition-all duration-200 ease-out flex items-center justify-center hover:scale-105 active:scale-95">
                    <Eraser
                      size={22}
                      className={`text-gray-700 transition-colors duration-200 group-hover:text-pink-700`}
                    />
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent sideOffset={5}>{"Cut"}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger>
                <div
                  className="group relative cursor-grab active:cursor-grabbing"
                >
                  <div className="min-w-16 min-h-16 rounded-xl bg-white/40 hover:bg-white/60 border-2 border-gray-500/20 shadow-md transition-all duration-200 ease-out flex items-center justify-center hover:scale-105 active:scale-95">
                    <Save
                      size={22}
                      className={`text-gray-700 transition-colors duration-200 group-hover:text-blue-600`}
                    />
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent sideOffset={5}>{"Save"}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger>
                <div
                  className="group relative cursor-grab active:cursor-grabbing"
                >
                  <div className="min-w-16 min-h-16 rounded-xl bg-white/40 hover:bg-white/60 border-2 border-gray-500/20 shadow-md transition-all duration-200 ease-out flex items-center justify-center hover:scale-105 active:scale-95">
                    <Play
                      size={22}
                      className={`text-gray-700 transition-colors duration-200 group-hover:text-green-600`}
                    />
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent sideOffset={5}>{"Start"}</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    </div>
  );
}
