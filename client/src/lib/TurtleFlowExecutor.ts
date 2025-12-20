import { TurtleGraphicsEngine } from "./TurtleGraphics";
import type { TurtleCommand } from "./TurtleGraphics";
import type { Edge, Node } from "@xyflow/react";
import type { NodeRegistry } from "./flowUtils";

export type ExecutionState = "IDLE" | "RUNNING" | "PAUSED";

interface TurtlePath {
  id: string;
  commands: Array<TurtleCommand>;
}

export class TurtleFlowExecutor {
  private engine: TurtleGraphicsEngine;
  private state: ExecutionState = "IDLE";
  private onStateChange?: (state: ExecutionState) => void;
  private pathCounter = 0;

  constructor(drawingCanvas: HTMLCanvasElement, turtleCanvas: HTMLCanvasElement) {
    this.engine = new TurtleGraphicsEngine(drawingCanvas, turtleCanvas);
    this.engine.onComplete = () => this.setState("IDLE");
  }

  subscribe(callback: (state: ExecutionState) => void) {
    this.onStateChange = callback;
  }

  executeFlow(nodes: Array<Node>, edges: Array<Edge>) {
    if (this.state !== "IDLE") this.reset();

    const startNode = nodes.find((n) => n.type === "startNode");
    if (!startNode) return;

    this.pathCounter = 0;
    const paths = this.collectPaths(startNode.id, nodes, edges);

    console.log("=== EXECUTION PATHS ===");
    // paths.forEach(path => {
    //   console.log(`Path ${path.id}:`, path.commands.length, "commands");
    // });

    this.engine.reset();

    if (paths.length === 0) {
      this.engine.createTurtle("default", 0, 0, 90);
    } else {
      paths.forEach((path) => {
        this.engine.createTurtle(path.id, 0, 0, 90);
        this.engine.queueCommands(path.id, path.commands);
      });
    }

    this.engine.start();
    this.setState("RUNNING");
  }

  pause() {
    if (this.state === "RUNNING") {
      this.engine.pause();
      this.setState("PAUSED");
    }
  }

  resume() {
    if (this.state === "PAUSED") {
      this.engine.resume();
      this.setState("RUNNING");
    }
  }

  reset() {
    this.engine.reset();
    this.setState("IDLE");
  }

  setDelay(delay: number) {
    this.engine.setDelay(delay);
  }

  private setState(newState: ExecutionState) {
    this.state = newState;
    this.onStateChange?.(newState);
  }

  private collectPaths(
    nodeId: string,
    nodes: Array<Node>,
    edges: Array<Edge>,
    commandsSoFar: Array<TurtleCommand> = [],
  ): Array<TurtlePath> {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return [];

    // 1. Add this node's commands to current trace
    const currentCommands = [...commandsSoFar];
    if (!node.data.muted) {
      currentCommands.push(...this.nodeToCommands(node));
    }

    // 2. Handle Loop Node Special Logic
    if (node.type === "loopNode" && !node.data.muted) {
      return this.handleLoopNode(node, currentCommands, nodes, edges);
    }

    // 3. Standard Flow (Find outgoing edges)
    const outEdges = edges.filter((e) => e.source === nodeId);

    // Leaf node (End of a path)
    if (outEdges.length === 0) {
      return [{ id: `path_${++this.pathCounter}`, commands: currentCommands }];
    }

    // Branching Logic (Handles 1 or more edges automatically)
    const paths: Array<TurtlePath> = [];
    for (const edge of outEdges) {
      paths.push(...this.collectPaths(edge.target, nodes, edges, currentCommands));
    }
    return paths;
  }

  private handleLoopNode(
    node: Node,
    commandsBeforeLoop: Array<TurtleCommand>,
    nodes: Array<Node>,
    edges: Array<Edge>,
  ): Array<TurtlePath> {
    const loopData = node.data as NodeRegistry["loopNode"];
    const loopCount = loopData.loopCount || 0;

    // Find connections
    const loopEdges = edges.filter((e) => e.source === node.id && e.sourceHandle === "loop");
    const outEdges = edges.filter((e) => e.source === node.id && e.sourceHandle === "out");

    // 1. COLLECT LOOP BODY PATHS
    // We treat the "loop" output as a start point for a sub-graph.
    // We pass an empty array [] as start commands because we just want the body segments.
    let loopBodySequences: Array<Array<TurtleCommand>> = [];

    if (loopEdges.length > 0) {
      // Collect ALL paths that stem from the loop handle (handles branching/merging body)
      for (const edge of loopEdges) {
        const paths = this.collectPaths(edge.target, nodes, edges, []);
        loopBodySequences.push(...paths.map((p) => p.commands));
      }
    } else {
      // Empty loop body is valid (just an empty sequence)
      loopBodySequences = [[]];
    }

    const finalPaths: Array<TurtlePath> = [];

    // CASE A: SNOWFLAKE MODE (Spawn Turtle On Iteration)
    if (loopData.createTurtleOnIteration && loopCount > 0) {
      // For each possible path through the loop body...
      for (const bodySeq of loopBodySequences) {
        const accumulatedState = [...commandsBeforeLoop];

        for (let i = 0; i < loopCount; i++) {
          // Accumulate the transformation (Loop Body)
          accumulatedState.push(...bodySeq);

          // Spawn a turtle for the "Action" (Out handle) at this state
          if (outEdges.length > 0) {
            for (const edge of outEdges) {
              finalPaths.push(
                ...this.collectPaths(edge.target, nodes, edges, [...accumulatedState]),
              );
            }
          } else {
            // No out handle? Just spawn the turtle at the accumulated point
            finalPaths.push({
              id: `path_${++this.pathCounter}`,
              commands: [...accumulatedState],
            });
          }
        }
      }
      return finalPaths;
    }

    // CASE B: STANDARD LOOP MODE (Inline Expansion)
    // If the loop body branches into 2 paths, we get 2 separate turtles exiting the loop
    for (const bodySeq of loopBodySequences) {
      const expandedCommands = [...commandsBeforeLoop];

      // Repeat this specific body path N times
      for (let i = 0; i < loopCount; i++) {
        expandedCommands.push(...bodySeq);
      }

      // Continue flow after loop
      if (outEdges.length > 0) {
        for (const edge of outEdges) {
          finalPaths.push(...this.collectPaths(edge.target, nodes, edges, expandedCommands));
        }
      } else {
        // Dead end after loop
        finalPaths.push({
          id: `path_${++this.pathCounter}`,
          commands: expandedCommands,
        });
      }
    }

    return finalPaths;
  }

  private nodeToCommands(node: Node): Array<TurtleCommand> {
    switch (node.type) {
      case "startNode":
        return [];
      case "moveNode":
        return [{ type: "move", value: { distance: (node.data as any).distance || 10 } }];
      case "rotateNode":
        return [{ type: "rotate", value: { angle: -((node.data as any).angle || 0) } }];
      case "penNode": {
        const d = node.data as any;
        return [{ type: "pen", value: { isDrawing: d.penDown, color: d.color || "#000" } }];
      }
      default:
        return [];
    }
  }
}
