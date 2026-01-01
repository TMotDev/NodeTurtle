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

    // console.log("=== EXECUTION PATHS ===");
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
    const outEdges = edges.filter((e) => e.source === nodeId && e.sourceHandle !== "loop");

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

    const loopEdges = edges.filter((e) => e.source === node.id && e.sourceHandle === "loop");
    const outEdges = edges.filter((e) => e.source === node.id && e.sourceHandle === "out");

    // 1. PRE-CALCULATE LOOP BODY "DELTAS"
    // We find all possible command sequences (paths) inside the loop body once.
    // If the body branches (e.g. -45 and +45), this array will contain 2 sequences.
    // We pass [] as start commands because we only want the *changes* the loop body applies.
    let loopBodyDeltas: Array<Array<TurtleCommand>> = [];

    if (loopEdges.length > 0) {
      for (const edge of loopEdges) {
        const paths = this.collectPaths(edge.target, nodes, edges, []);
        loopBodyDeltas.push(...paths.map((p) => p.commands));
      }
    } else {
      // If loop input is disconnected, treat it as a "Do Nothing" op (Identity)
      loopBodyDeltas = [[]];
    }

    const finalPaths: Array<TurtlePath> = [];

    // 2. THE FRONTIER: TRACK ACTIVE STATES
    // Start with the state as it entered the node.
    let currentFrontier: Array<Array<TurtleCommand>> = [commandsBeforeLoop];

    for (let i = 0; i < loopCount; i++) {
      const nextFrontier: Array<Array<TurtleCommand>> = [];

      // For every turtle currently alive (on the frontier)...
      for (const baseState of currentFrontier) {
        // ...apply EVERY possible path through the loop body
        for (const delta of loopBodyDeltas) {
          const newState = [...baseState, ...delta];

          // This new state is now part of the frontier for the next iteration
          nextFrontier.push(newState);

          // IF SPAWNING ENABLED:
          // Immediately send this new state to the "Out" handle to draw the branch
          if (loopData.createTurtleOnIteration) {
            if (outEdges.length > 0) {
              // Continue the flow from the "Out" handle with this specific state
              for (const edge of outEdges) {
                finalPaths.push(...this.collectPaths(edge.target, nodes, edges, [...newState]));
              }
            } else {
              // If no out handle, just register the turtle at this point (visualize the growth)
              finalPaths.push({
                id: `path_${++this.pathCounter}`,
                commands: [...newState],
              });
            }
          }
        }
      }

      // Update frontier for the next loop iteration
      // Iteration 1: 1 state -> 2 states
      // Iteration 2: 2 states -> 4 states
      currentFrontier = nextFrontier;
    }

    // 3. FINAL OUTPUT (If NOT spawning on iteration)
    // If we didn't spawn during the loop, we release all accumulated turtles now.
    if (!loopData.createTurtleOnIteration) {
      for (const finalState of currentFrontier) {
        if (outEdges.length > 0) {
          for (const edge of outEdges) {
            finalPaths.push(...this.collectPaths(edge.target, nodes, edges, finalState));
          }
        } else {
          finalPaths.push({
            id: `path_${++this.pathCounter}`,
            commands: finalState,
          });
        }
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
