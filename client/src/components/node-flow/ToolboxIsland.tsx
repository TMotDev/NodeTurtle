import { ArrowRight, Flag, Pen, Repeat2, RotateCcw } from "lucide-react";
import { useState } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { useDragDrop } from "@/hooks/FlowDragAndDropContext";

export default function ToolboxIsland() {
  const { onDragStart } = useDragDrop();
  const [showNodes, setShowNodes] = useState(true);

  const tools = [
    {
      id: "startNode",
      title: "Start",
      icon: Flag,
      text: "text-emerald-600",
      background: "bg-emerald-400/60"
    },
    {
      id: "moveNode",
      title: "Move",
      icon: ArrowRight,
      text: "group-hover:text-blue-600",
      background: "bg-blue-400/60"
    },
    {
      id: "rotateNode",
      title: "Rotate",
      icon: RotateCcw,
      text: "group-hover:text-teal-600",
      background: "bg-teal-400/60"
    },
    {
      id: "loopNode",
      title: "Loop",
      icon: Repeat2,
      text: "group-hover:text-orange-600",
      background: "bg-orange-400/60"
    },
    {
      id: "penNode",
      title: "Pen",
      icon: Pen,
      text: "group-hover:text-cyan-600",
      background: "bg-cyan-400/60"
    },
  ];

  return (
    <div className="flex flex-col items-center gap-2 transition-all duration-1000 ease-linear">
      <div className="bg-gray-500/20 backdrop-blur-xl rounded-2xl shadow-xl border border-gray-500/30 p-1 flex flex-col lg:flex-row items-center">
        <div className={`flex-col gap-2 ${showNodes ? "flex" : "hidden"}`}>
          <div
            className="text-lg text-center font-bold text-gray-500"
            onClick={() => setShowNodes((st) => !st)}
          >
            Nodes
          </div>
          <div className="flex flex-row gap-2 px-2 pb-2">
            {tools.map((tool) => {
              const IconComponent = tool.icon;
              return (
                <Tooltip key={tool.id}>
                  <TooltipTrigger>
                    <div
                      // key={tool.id}
                      onDragStart={(event) => onDragStart(event, tool.id)}
                      draggable
                      className="group relative cursor-grab active:cursor-grabbing"
                    >
                      <div className={`min-w-16 min-h-16 rounded-xl ${tool.background} border-2 border-gray-500/20 shadow-md transition-all duration-200 ease-out flex items-center justify-center active:scale-95`}>
                        <IconComponent
                          size={22}
                          className={`text-gray-700 transition-colors duration-200 ${tool.text} group-hover:scale-105 transition-scale duration-200`}
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
      </div>
    </div>
  );
}
