import { ArrowRight, ChevronLeft, ChevronRight, Flag, Pen, Repeat2, RotateCcw, StickyNote } from "lucide-react";
import { TooltipArrow } from "@radix-ui/react-tooltip";
import { useState } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { useDragDrop } from "@/hooks/FlowDragAndDropContext";

export default function ToolboxIsland() {
  const { onDragStart } = useDragDrop();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const tools = [
    { id: "startNode", title: "Start", icon: Flag, text: "text-emerald-600", background: "bg-emerald-400/60" },
    { id: "moveNode", title: "Move", icon: ArrowRight, text: "group-hover:text-blue-600", background: "bg-blue-400/60" },
    { id: "rotateNode", title: "Rotate", icon: RotateCcw, text: "group-hover:text-teal-600", background: "bg-teal-400/60" },
    { id: "loopNode", title: "Loop", icon: Repeat2, text: "group-hover:text-orange-600", background: "bg-orange-400/60" },
    { id: "penNode", title: "Pen", icon: Pen, text: "group-hover:text-cyan-600", background: "bg-cyan-400/60" },
    { id: "commentNode", title: "Comment", icon: StickyNote, text: "group-hover:text-gray-600", background: "bg-gray-400/60" },
  ];

  return (
    <div className="flex flex-row items-center gap-1">

      <div
        className={`
          bg-gray-500/20 backdrop-blur-xl rounded-2xl shadow-xl
          flex flex-col items-center overflow-hidden
          transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]
          ${isCollapsed
            ? 'w-0 opacity-0 p-0 border-0 scale-90 duration-100'
            : 'w-auto opacity-100 p-1 border border-gray-500/30 scale-100'
          }
        `}
      >
        <div className="flex flex-col gap-2 min-w-max">
          <div className="flex flex-col gap-2 px-2 py-2">
            {tools.map((tool, index) => {
              const IconComponent = tool.icon;

              const delay = (index * 25) + 125;

              return (
                <Tooltip key={tool.id}>
                  <TooltipTrigger>
                    <div
                      onDragStart={(event) => onDragStart(event, tool.id)}
                      draggable
                      className="group relative cursor-grab active:cursor-grabbing"
                    >
                      <div
                        style={{ transitionDelay: isCollapsed ? '0ms' : `${delay}ms` }}
                        className={`
                          min-w-14 min-h-14 border-2 border-gray-500/20 shadow-md flex items-center justify-center
                          transition-all rounded-md duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)]
                          ${tool.background}
                          ${isCollapsed
                            ? 'scale-0 rounded-full opacity-0 hidden'
                            : 'scale-100 rounded-xl opacity-100'
                          }
                          active:scale-95
                        `}
                      >
                        <IconComponent
                          size={22}
                          className={`text-gray-700 transition-colors duration-200 ${tool.text} group-hover:scale-105 transition-scale`}
                        />
                      </div>
                    </div>
                  </TooltipTrigger>
                  {!isCollapsed && (
                    <TooltipContent sideOffset={5} side="right">
                      {tool.title} <TooltipArrow/>
                    </TooltipContent>
                  )}
                </Tooltip>
              );
            })}
          </div>
        </div>
      </div>

      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="group h-16 w-3 flex items-center justify-center rounded-full bg-gray-500/30 backdrop-blur-md border border-gray-500/20 shadow-sm hover:bg-gray-500/50 transition-colors duration-200 cursor-pointer z-50"
        aria-label={isCollapsed ? "Expand toolbar" : "Collapse toolbar"}
      >
        {isCollapsed ? (
            <ChevronRight size={14} className="text-gray-700 opacity-70" />
        ) : (
            <ChevronLeft size={14} className="text-gray-700 opacity-70" />
        )}
      </button>

    </div>
  );
}