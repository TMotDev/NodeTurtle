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

    const startNode = nodes.find(n => n.type === "startNode");
    if (!startNode) return;

    this.pathCounter = 0;
    const paths = this.collectPaths(startNode.id, nodes, edges);

    console.log("=== EXECUTION PATHS ===");
    // paths.forEach(path => {
    //   console.log(`Path ${path.id}:`, path.commands.length, "commands");
    //   console.log(path.commands);
    // });

    this.engine.reset();

    if (paths.length === 0) {
      // Just start node, create single turtle
      this.engine.createTurtle("default", 0, 0, 90);
    } else {
      // Create a turtle for each path
      paths.forEach(path => {
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

  // Collect all possible paths through the graph (handles branching)
  private collectPaths(
    nodeId: string,
    nodes: Array<Node>,
    edges: Array<Edge>,
    commandsSoFar: Array<TurtleCommand> = []
  ): Array<TurtlePath> {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return [];

    // Add this node's commands to current path
    const currentCommands = [...commandsSoFar];
    if (!node.data.muted) {
      currentCommands.push(...this.nodeToCommands(node));
    }

    // Handle loop node
    if (node.type === "loopNode" && !node.data.muted) {
      const loopData = node.data as NodeRegistry["loopNode"];
      const loopCount = loopData.loopCount || 0;
      const loopEdge = edges.find(e => e.source === nodeId && e.sourceHandle === "loop");
      const outEdges = edges.filter(e => e.source === nodeId && e.sourceHandle === "out");

      // CASE 1: SPAWN NEW TURTLE EACH ITERATION
      if (loopData.createTurtleOnIteration && loopEdge && loopCount > 0) {
        const loopBodyPaths = this.collectPathSegment(loopEdge.target, nodes, edges);

        const spawnedPaths: Array<TurtlePath> = [];

        const accumulatedState = [...currentCommands];

        for (let i = 0; i < loopCount; i++) {
          accumulatedState.push(...loopBodyPaths);

          if (outEdges.length > 0) {
             for (const edge of outEdges) {
                spawnedPaths.push(...this.collectPaths(edge.target, nodes, edges, [...accumulatedState]));
             }
          } else {
             spawnedPaths.push({
                 id: `path_${++this.pathCounter}`,
                 commands: [...accumulatedState]
             });
          }
        }
        return spawnedPaths;
      }

      if (loopEdge && loopCount > 0) {
        // Build loop body commands once
        const loopBodyPaths = this.collectPathSegment(loopEdge.target, nodes, edges);
        for (let i = 0; i < loopCount; i++) {
          currentCommands.push(...loopBodyPaths);
        }
      }

      if (outEdges.length === 0) {
        return [{ id: `path_${++this.pathCounter}`, commands: currentCommands }];
      }

      // Collect paths from each branch after loop
      const paths: Array<TurtlePath> = [];
      for (const edge of outEdges) {
        paths.push(...this.collectPaths(edge.target, nodes, edges, currentCommands));
      }
      return paths;
    }

    // Regular node - find all outgoing edges
    const outEdges = edges.filter(e => e.source === nodeId);

    if (outEdges.length === 0) {
      // Leaf node - this is end of a path
      return [{ id: `path_${++this.pathCounter}`, commands: currentCommands }];
    }

    if (outEdges.length === 1) {
      // Single edge - continue building path
      return this.collectPaths(outEdges[0].target, nodes, edges, currentCommands);
    }

    // Multiple edges - BRANCH! Each edge becomes a separate path
    const paths: Array<TurtlePath> = [];
    for (const edge of outEdges) {
      paths.push(...this.collectPaths(edge.target, nodes, edges, currentCommands));
    }
    return paths;
  }

  // Helper to collect commands from a segment (like loop body) without branching into separate paths
  private collectPathSegment(
    nodeId: string,
    nodes: Array<Node>,
    edges: Array<Edge>,
    visited = new Set<string>()
  ): Array<TurtleCommand> {
    if (visited.has(nodeId)) return [];

    const node = nodes.find(n => n.id === nodeId);
    if (!node) return [];

    visited.add(nodeId);
    const commands: Array<TurtleCommand> = [];

    // Add this node's commands
    if (!node.data.muted) {
      commands.push(...this.nodeToCommands(node));
    }

    // Handle nested loops
    if (node.type === "loopNode" && !node.data.muted) {
      const loopData = node.data as NodeRegistry["loopNode"];
      const loopCount = loopData.loopCount || 0;
      const loopEdge = edges.find(e => e.source === nodeId && e.sourceHandle === "loop");

      if (loopEdge && loopCount > 0) {
        const loopBody = this.collectPathSegment(loopEdge.target, nodes, edges, new Set(visited));
        for (let i = 0; i < loopCount; i++) {
          commands.push(...loopBody);
        }
      }
    }

    // Continue with next node (take first edge only for segments)
    const outEdges = edges.filter(e =>
      e.source === nodeId &&
      (node.type !== "loopNode" || e.sourceHandle === "out" || !e.sourceHandle)
    );

    if (outEdges.length > 0) {
      commands.push(...this.collectPathSegment(outEdges[0].target, nodes, edges, visited));
    }

    return commands;
  }

  private nodeToCommands(node: Node): Array<TurtleCommand> {
    switch (node.type) {
      case "startNode":
        return [];

      case "moveNode": {
        const data = node.data as NodeRegistry["moveNode"];
        return [{
          type: "move",
          value: { distance: data.distance || 10 }
        }];
      }

      case "rotateNode": {
        const data = node.data as NodeRegistry["rotateNode"];
        return [{
          type: "rotate",
          value: { angle: -(data.angle || 0) }
        }];
      }

      case "penNode": {
        const data = node.data as NodeRegistry["penNode"];
        return [{
          type: "pen",
          value: {
            isDrawing: data.penDown,
            color: data.color || "#000"
          }
        }];
      }

      default:
        return [];
    }
  }
}