import React, { useCallback, useEffect, useRef, useState } from "react";
import { Home, Play, Save, Square, Undo2, Zap } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "@tanstack/react-router";
import { Slider } from "../ui/slider";
import { FlowTitle } from "./FlowTitle";
import type { Edge, Node } from "@xyflow/react";
import type { Project } from "@/api/projects";
import { TurtleFlowExecutor } from "@/lib/TurtleFlowExecutor";
import { useFlowManagerContext } from "@/hooks/FlowManager";
import useAuthStore from "@/lib/authStore";

interface TurtleAreaProps {
  nodes: Array<Node>;
  edges: Array<Edge>;
  project: Project;
}

export const TurtleArea: React.FC<TurtleAreaProps> = ({ nodes, edges, project }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const turtleCanvasRef = useRef<HTMLCanvasElement>(null);
  const executorRef = useRef<TurtleFlowExecutor | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [turtleCount, setTurtleCount] = useState(0);
  const [hasStartNode, setHasStartNode] = useState(false);

  // Speed from 1-5 (Very Slow, Slow, Normal, Fast, Instant)
  // We default to 3 (Normal)
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
      executorRef.current = new TurtleFlowExecutor(canvasRef.current, turtleCanvasRef.current);
    }

    return () => {
      if (executorRef.current) {
        executorRef.current.reset();
      }
    };
  }, []);

  // Check if flow has start node
  useEffect(() => {
    const startNodeExists = nodes.some((node) => node.type === "startNode");
    setHasStartNode(startNodeExists);
  }, [nodes]);

  // Update speed when slider changes
  // You might need to map 1-5 back to your executor's expected range
  // if it expects 1-10 or milliseconds.
  // Assuming executor can take the raw 1-5 or you multiply here.
  useEffect(() => {
    if (executorRef.current) {
      // Example mapping: 1->1, 2->3, 3->5, 4->8, 5->10 if needed.
      // For now passing raw value x 2 to keep it similar to previous 1-10 scale
      executorRef.current.setSpeed(speed[0] * 2);
    }
  }, [speed]);

  const executeFlow = useCallback(async () => {
    if (!executorRef.current || isExecuting || !hasStartNode) return;

    setIsExecuting(true);

    try {
      await executorRef.current.executeFlow(nodes, edges);
    } catch (error) {
      console.error("Error executing turtle flow:", error);
    } finally {
      setIsExecuting(false);
    }
  }, [nodes, edges, isExecuting, hasStartNode]);

  const stopExecution = useCallback(() => {
    if (executorRef.current) {
      executorRef.current.stop();
      setIsExecuting(false);
    }
  }, []);

  const getSpeedLabel = (value: number) => {
    switch(value) {
      case 1: return "Very Slow";
      case 2: return "Slow";
      case 3: return "Normal speed";
      case 4: return "Fast";
      case 5: return "Instant";
      default: return "Normal speed";
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
    <div className="bg-gray-200 w-full h-full flex flex-col border-l border overflow-hidden">

      {/* 1. Header Section (Fixed) */}
      <div className="flex-shrink-0 border-b bg-white">
        <div className="flex items-center justify-between pattern p-4 border-white border-b-1">
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

      {/* 2. Canvas Area (Flexible) */}
      <div className="flex-1 min-h-0 w-full bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-sm border flex items-center justify-center overflow-hidden relative aspect-square w-full h-full max-h-full max-w-full">
          <div className="relative w-full h-full bg-gray-200">
            <canvas
              ref={canvasRef}
              width={400}
              height={400}
              className="absolute inset-0 w-full h-full object-contain"
            />
            <canvas
              ref={turtleCanvasRef}
              width={400}
              height={400}
              className="absolute inset-0 w-full h-full object-contain"
              style={{ pointerEvents: "none" }}
            />
          </div>
        </div>
      </div>

      {/* 3. Footer / Controls (Fixed) */}
      <div className="flex-shrink-0 flex flex-col bg-gray-100 border-t p-4 gap-4">

        {/* Play Button - Centered, Rounded Pill */}
        <div className="flex justify-center">
          <button
            onClick={isExecuting ? stopExecution : executeFlow}
            disabled={!hasStartNode && !isExecuting}
            className={`
              flex items-center gap-2 px-8 py-2.5 rounded-full text-sm text-white font-medium w-48 cursor-pointer
              shadow-sm hover:shadow-md active:scale-95 transition-all duration-200 justify-center
              ${isExecuting
                ? "bg-rose-500 hover:bg-rose-600 ring-rose-200"
                : "bg-emerald-500 hover:bg-emerald-600 ring-emerald-200"
              }
              disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-400
            `}
          >
            {isExecuting ? <Square size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
            {isExecuting ? "Stop" : "Run Code"}
          </button>
        </div>

        {/* Settings & Info Row */}
        <div className="flex flex-row items-center justify-between pt-2 border-t border-gray-100 flex-wrap">

          {/* Left: Speed Control */}
          <div className="flex items-center gap-2">

            {/* Fixed width slider so it doesn't stretch */}
            <div className="w-[120px]">
              <Slider
              className="bg-gray-300"
                value={speed}
                onValueChange={setSpeed}
                max={5}
                min={1}
                step={1}
                disabled={isExecuting}
              />
            </div>
             <span className="text-xs font-medium text-gray-500 truncate">
              {getSpeedLabel(speed[0])}
            </span>
          </div>

          {/* Right: Node Info */}
          {nodes.length > 0 ? (
            <div className="flex items-center gap-3 text-gray-500">
              <span className="text-nowrap">{nodes.length} nodes</span>
              <hr className="border-l h-4 border-gray-500" />
              <span className="text-nowrap">{edges.length} connections</span>
            </div>
          ) : (
            <div className="text-xs text-gray-300 italic">No nodes</div>
          )}
        </div>

      </div>
    </div>
  );
};