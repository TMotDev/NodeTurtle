import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  BrushCleaning,
  Grid2x2,
  Home,
  Minus,
  Play,
  Rabbit,
  Save,
  Snail,
  Square,
  Turtle,
  Undo2,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "@tanstack/react-router";
import { TooltipArrow } from "@radix-ui/react-tooltip";
import { ToggleGroup, ToggleGroupItem } from "../ui/toggle-group";
import { Button } from "../ui/button";
import { FlowTitle } from "./FlowTitle";
import type { Edge, Node } from "@xyflow/react";
import type { Project } from "@/api/projects";
import type { ExecutionState } from "@/lib/TurtleFlowExecutor";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { TurtleFlowExecutor } from "@/lib/TurtleFlowExecutor";
import { useFlowManagerContext } from "@/hooks/FlowManager";
import useAuthStore from "@/lib/authStore";

interface TurtleAreaProps {
  nodes: Array<Node>;
  edges: Array<Edge>;
  project: Project;
}

export const TurtleArea: React.FC<TurtleAreaProps> = ({ nodes, edges, project }) => {
  // Canvases: Grid (Bottom), Drawing/Trails (Middle), Turtles (Top)
  const gridCanvasRef = useRef<HTMLCanvasElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const turtleCanvasRef = useRef<HTMLCanvasElement>(null);

  const executorRef = useRef<TurtleFlowExecutor | null>(null);
  const [executionStatus, setExecutionStatus] = useState<ExecutionState>("IDLE");
  const [turtleCount, setTurtleCount] = useState(0);
  const [hasStartNode, setHasStartNode] = useState(false);

  // View Controls
  const [showGrid, setShowGrid] = useState(true);
  const [showTurtles, setShowTurtles] = useState(true);

  const [speed, setSpeed] = useState([3]);

  const { changeTitle } = useFlowManagerContext();
  const [title, setTitle] = useState(project.title);
  const { saveFlow, hasUnsavedChanges } = useFlowManagerContext();
  const { user } = useAuthStore();
  const router = useRouter();
  const [confirmedGoBack, setConfirmedGoBack] = useState(false);

  // Initialize turtle executor
  useEffect(() => {
    if (canvasRef.current && turtleCanvasRef.current) {
      const exec = new TurtleFlowExecutor(canvasRef.current, turtleCanvasRef.current);

      exec.subscribe((newState) => {
        setExecutionStatus(newState);
      });

      executorRef.current = exec;
    }

    return () => {
      if (executorRef.current) {
        executorRef.current.reset();
      }
    };
  }, []);

  // Draw Grid Layer
  useEffect(() => {
    const canvas = gridCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear and fill white background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);

    // Draw Grid
    const centerX = width / 2;
    const centerY = height / 2;
    const gridSize = 20;

    ctx.save();
    ctx.strokeStyle = "#f8f9fa";
    ctx.lineWidth = 1;

    for (let x = 0; x <= width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    for (let y = 0; y <= height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Draw axes
    ctx.strokeStyle = "#dee2e6";
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(width, centerY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(centerX, 0);
    ctx.lineTo(centerX, height);
    ctx.stroke();

    ctx.restore();
  }, []); // Run once on mount

  // Check if flow has start node
  useEffect(() => {
    const startNodeExists = nodes.some((node) => node.type === "startNode");
    setHasStartNode(startNodeExists);
  }, [nodes]);

  useEffect(() => {
    const delayMap: Record<number, number> = {
      1: 250,
      2: 100,
      3: 50,
      4: 25,
      5: 0,
    };

    if (executorRef.current) {
      executorRef.current.setDelay(delayMap[speed[0]]);
    }
  }, [speed]);

  const handleMainButtonClick = useCallback(() => {
    if (!executorRef.current) return;

    if (executionStatus === "IDLE") {
      // Start fresh
      executorRef.current.executeFlow(nodes, edges);
    } else if (executionStatus === "RUNNING") {
      // Pause
      executorRef.current.pause();
    } else {
      // Resume
      executorRef.current.resume();
    }
  }, [executionStatus, nodes, edges]);

  const clear = useCallback(() => {
    executorRef.current?.reset();
  }, []);

  const getSpeedLabel = (value: number) => {
    switch (value) {
      case 1:
        return "Very Slow";
      case 2:
        return "Slow";
      case 3:
        return "Normal speed";
      case 4:
        return "Fast";
      case 5:
        return "Instant";
      default:
        return "Normal speed";
    }
  };

  async function handleChangeTitle(t: string) {
    const res = await changeTitle(project.id, t);
    if (!res.success) {
      toast.error("Failed to update title");
      return;
    }
    setTitle(t);
  }

  return (
    <TooltipProvider delayDuration={1000}>
      <div className="w-full h-full flex flex-col border-l border overflow-hidden">
        <div className="flex-shrink-0 border-b">
          <div className="flex items-center justify-between pattern p-4 border-white">
            <div className="flex flex-row items-center justify-between gap-3">
              {(user?.id === project.creator_id || project.creator_id === "-") && (
                <button
                  className={`cursor-pointer group relative disabled:cursor-default`}
                  onClick={() => {
                    saveFlow(project.id, project.creator_id === "-");
                    setConfirmedGoBack(false);
                  }}
                  disabled={!hasUnsavedChanges}
                >
                  <div
                    className={`min-w-12 min-h-12 rounded-xl bg-white/40 hover:bg-white/60 border-2 ${hasUnsavedChanges ? "border-blue-600/40" : "border-gray-500/20"} transition-all duration-200 ease-out flex items-center justify-center active:scale-95`}
                  >
                    <Save
                      size={22}
                      className={`group-disabled:text-gray-400 text-gray-700 transition-colors duration-200 group-hover:text-blue-600`}
                    />
                  </div>
                </button>
              )}
              <FlowTitle
                editable={user?.id === project.creator_id}
                title={title}
                onTitleChange={(t) => handleChangeTitle(t)}
              />
            </div>
            <div className="flex items-center gap-3">
              <div className="text-sm text-primary">
                {turtleCount > 0 && (
                  <div className="flex items-center gap-1">
                    <Zap size={14} />
                    <span className="font-medium">{turtleCount}</span>
                  </div>
                )}
              </div>
              <button
                className="cursor-pointer group relative"
                onClick={() => {
                  if (hasUnsavedChanges && !confirmedGoBack) {
                    toast.warning("You have unsaved changes, go back?");
                    setConfirmedGoBack(true);
                  } else if (router.history.canGoBack()) {
                    router.history.back();
                  } else {
                    router.navigate({ to: "/" });
                  }
                }}
              >
                <div className="min-w-12 min-h-12 rounded-xl bg-white/40 hover:bg-white/60 border-2 border-gray-500/20 transition-all duration-200 ease-out flex items-center justify-center active:scale-95">
                  {router.history.canGoBack() ? (
                    <Undo2
                      size={22}
                      className="text-gray-700 transition-colors duration-200 group-hover:text-blue-600"
                    />
                  ) : (
                    <Home
                      size={22}
                      className="text-gray-700 transition-colors duration-200 group-hover:text-blue-600"
                    />
                  )}
                </div>
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-0 w-full bg-gray-100 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-sm border flex items-center justify-center overflow-hidden relative aspect-square w-full h-full max-h-full max-w-full">
            <div className="relative w-full h-full">
              {/* Layer 1: Grid */}
              <canvas
                ref={gridCanvasRef}
                width={400}
                height={400}
                className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-300 ${
                  showGrid ? "opacity-100" : "opacity-0"
                }`}
              />

              {/* Layer 2: Drawing Trails */}
              <canvas
                ref={canvasRef}
                width={700}
                height={700}
                className="absolute inset-0 w-full h-full object-contain pointer-events-none"
              />

              {/* Layer 3: Turtle Cursors */}
              <canvas
                ref={turtleCanvasRef}
                width={400}
                height={400}
                className={`absolute inset-0 w-full h-full object-contain pointer-events-none transition-opacity duration-300 ${
                  showTurtles ? "opacity-100" : "opacity-0"
                }`}
              />
            </div>
          </div>
        </div>

        <div className="flex-shrink-0 flex flex-col p-3 bg-gray-100">
          <div className="flex flex-col items-center px-8 py-6 bg-white rounded-md gap-6">
            <div className="flex flex-col items-center gap-3">
              <div className="flex items-center gap-3 w-full justify-center">
                <Button
                  variant={"default"}
                  size={"lg"}
                  onClick={handleMainButtonClick}
                  disabled={!hasStartNode && executionStatus === "IDLE"}
                  className={`
                  px-8 py-3 min-w-32
                  ${
                    executionStatus === "RUNNING"
                      ? "bg-amber-600 hover:bg-amber-700"
                      : "bg-emerald-600 hover:bg-emerald-700"
                  }
                `}
                >
                  {executionStatus === "IDLE" ? (
                    <>
                      <Play size={16} fill="currentColor" /> Start
                    </>
                  ) : executionStatus === "RUNNING" ? (
                    <>
                      <Square size={16} fill="currentColor" /> Pause
                    </>
                  ) : (
                    <>
                      <Play size={16} fill="currentColor" /> Continue
                    </>
                  )}
                </Button>
                <Button
                  size={"lg"}
                  variant={"outline"}
                  onClick={clear}
                  className="text-pink-500 hover:text-ping-600"
                >
                  <BrushCleaning size={16} />
                  Clear
                </Button>
              </div>

              {/* Controls Row: Speed + Visibility Toggles */}
              <div className="flex items-center gap-4 w-full justify-center">
                {/* Speed Controls */}
                <div className="flex flex-col items-center gap-1">
                  <ToggleGroup
                    className="flex"
                    type="single"
                    variant="outline"
                    value={speed[0].toString()}
                    onValueChange={(value) => value && setSpeed([parseInt(value)])}
                  >
                    <ToggleGroupItem value="1" className="px-3">
                      <Snail size={16} />
                    </ToggleGroupItem>
                    <ToggleGroupItem value="2" className="px-3">
                      <Turtle size={16} />
                    </ToggleGroupItem>
                    <ToggleGroupItem value="3" className="px-3">
                      <Minus size={16} />
                    </ToggleGroupItem>
                    <ToggleGroupItem value="4" className="px-3">
                      <Rabbit size={16} />
                    </ToggleGroupItem>
                    <ToggleGroupItem value="5" className="px-3">
                      <Zap size={16} />
                    </ToggleGroupItem>
                  </ToggleGroup>
                  <span className="text-xs font-medium text-gray-500">
                    {getSpeedLabel(speed[0])}
                  </span>
                </div>

                <div className="h-8 w-px bg-gray-200 mx-2" />

                {/* Visibility Toggles */}
                <div className="flex flex-col items-center gap-1">
                  <div className="flex items-center gap-2 border rounded-md p-1">
                    <Tooltip delayDuration={1000}>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={`h-9 w-9 hover:bg-gray-100 ${!showGrid ? "opacity-30" : ""}`}
                          onClick={() => setShowGrid(!showGrid)}
                        >
                          <Grid2x2 size={20} className="text-gray-700" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Toggle Grid Visibility</p>
                        <TooltipArrow />
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip delayDuration={1000}>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={`h-9 w-9 hover:bg-gray-100 ${
                            !showTurtles ? "opacity-30" : ""
                          }`}
                          onClick={() => setShowTurtles(!showTurtles)}
                        >
                          <Turtle size={20} className="text-gray-700" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Toggle Turtle Visibility</p>
                        <TooltipArrow />
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <span className="text-xs font-medium text-gray-500">View</span>
                </div>
              </div>
            </div>

            <hr className="w-2/3 bg-gray-600"></hr>
            <div className="flex items-center justify-center gap-3 text-xs text-gray-500 pt-2 border-gray-200 w-full">
              {nodes.length > 0 ? (
                <>
                  <span className="text-nowrap">{nodes.length} nodes</span>
                  <span className="text-gray-300">•</span>
                  <span className="text-nowrap">{edges.length} connections</span>
                </>
              ) : (
                <span className="text-gray-400 italic">No nodes yet</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};
