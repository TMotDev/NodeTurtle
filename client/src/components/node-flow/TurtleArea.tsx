import React, { useCallback, useEffect, useRef, useState } from "react";
import { Home, Play, RotateCcw, Save, Square, Trash2, Turtle, Undo2, Zap } from "lucide-react";
import { toast } from "sonner";
import { Link, useRouter } from "@tanstack/react-router";
import { Slider } from "../ui/slider";
import { Button } from "../ui/button";
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
  const executorRef = useRef<TurtleFlowExecutor | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [turtleCount, setTurtleCount] = useState(0);
  const [hasStartNode, setHasStartNode] = useState(false);
  const [speed, setSpeed] = useState([5]); // Speed from 1-10, default 5
  const { changeTitle } = useFlowManagerContext();
  const [title, setTitle] = useState(project.title);
  const { saveFlow, hasUnsavedChanges } = useFlowManagerContext();
  const { user } = useAuthStore();
  const router = useRouter();
  // Initialize turtle executor
  useEffect(() => {
    if (canvasRef.current) {
      executorRef.current = new TurtleFlowExecutor(canvasRef.current);
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
  useEffect(() => {
    if (executorRef.current) {
      executorRef.current.setSpeed(speed[0]);
    }
  }, [speed]);

  // Execute the turtle flow
  const executeFlow = useCallback(async () => {
    if (!executorRef.current || isExecuting || !hasStartNode) return;

    setIsExecuting(true);

    try {
      console.log("Executing flow with nodes:", nodes.length, "edges:", edges.length);
      await executorRef.current.executeFlow(nodes, edges);
      // setTurtleCount(executorRef.current.getTurtleEngine().getTurtleCount());
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
    if (value <= 2) return "Very Slow";
    if (value <= 4) return "Slow";
    if (value <= 6) return "Normal";
    if (value <= 9) return "Fast";
    return "instant";
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
    <div className="bg-white w-[30vw] flex flex-col border-l border">
      {/* Header */}
      <div className="bg-white border-b border">
        <div className="flex flex-col">
          <div className="flex items-center justify-between border-b-1 bg-gray-200 p-4 border-white">
            <div className="flex flex-row items-center justify-between gap-3">
              {user?.id === project.creator_id && (
                <button
                  className={`cursor-pointer group relative disabled:cursor-default`}
                  onClick={() => saveFlow(project.id)}
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
                  console.log(router.history.canGoBack())
                  if (router.history.canGoBack()) {
                    router.history.back();
                    console.log("going back")
                  } else {
                    router.navigate({ to: "/" });
                    console.log("root")
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
          {nodes.length > 0 && (
            <div className="text-xs text-primary mt-1 flex flex-col items-start justify-center bg-gray-200 p-4 ">
              <span className="text-md">{nodes.length} nodes</span>
              <span className="font-md">{edges.length} connections</span>
            </div>
          )}
        </div>

          // TODO: additional canvas for turtle position
        {/* Canvas Container */}
        <div className="flex-1 p-4">
          <div className="bg-white rounded-lg shadow-sm border h-full flex items-center justify-center">
            <canvas
              ref={canvasRef}
              width={400}
              height={400}
              className="border border-gray-300 rounded max-w-full max-h-full"
              style={{
                aspectRatio: "1/1",
                width: "auto",
                height: "auto",
                maxWidth: "100%",
                maxHeight: "100%",
              }}
            />
          </div>
        </div>

        {/* Controls */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={isExecuting ? stopExecution : executeFlow}
            disabled={!hasStartNode && !isExecuting}
            className={`flex items-center gap-2 px-3 py-2 rounded text-sm text-white transition-colors ${
              isExecuting ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isExecuting ? <Square size={14} /> : <Play size={14} />}
            {isExecuting ? "Stop" : "Run"}
          </button>
        </div>

        {/* Speed Control */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-primary">
              Speed: {getSpeedLabel(speed[0])}
            </label>
            <span className="text-xs text-primary">{speed[0]}/10</span>
          </div>
          <Slider
            value={speed}
            onValueChange={setSpeed}
            max={10}
            min={1}
            step={1}
            className="w-full"
            disabled={isExecuting}
          />
        </div>
      </div>
    </div>
  );
};
