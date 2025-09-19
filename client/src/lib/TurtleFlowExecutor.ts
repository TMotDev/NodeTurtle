import { TurtleGraphicsEngine } from "./TurtleGraphics";
import type { MoveCommand, PenCommand, RotateCommand, TurtleCommand } from "./TurtleGraphics";
import type { Edge, Node } from "@xyflow/react";

interface ExecutionPath {
  id: string;
  commands: Array<TurtleCommand>;
}

interface NodeTree {
  node: {
    id: string;
    type: string;
    data: any;
  };
  children: Array<NodeTree>;
}

export class TurtleFlowExecutor {
  private turtleEngine: TurtleGraphicsEngine;
  private pathCounter = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.turtleEngine = new TurtleGraphicsEngine(canvas);
  }

  private convertFlowToNodeTree(nodes: Array<Node>, edges: Array<Edge>): NodeTree | null {
    const startNode = nodes.find((node) => node.type === "startNode");
    if (!startNode) return null;

    const buildTree = (nodeId: string, visited = new Set<string>()): NodeTree => {
      if (visited.has(nodeId)) {
        const node = nodes.find((n) => n.id === nodeId)!;
        return {
          node: { id: node.id, type: node.type || "unknown", data: node.data },
          children: [],
        };
      }

      const node = nodes.find((n) => n.id === nodeId)!;
      const newVisited = new Set(visited);
      newVisited.add(nodeId);

      const outgoingEdges = edges.filter((edge) => edge.source === nodeId);
      const children = outgoingEdges.map((edge) => buildTree(edge.target, newVisited));

      return {
        node: { id: node.id, type: node.type || "unknown", data: node.data },
        children,
      };
    };

    return buildTree(startNode.id);
  }

  // Convert node to commands
  private nodeToCommands(node: NodeTree["node"]): Array<TurtleCommand> {
    if (node.data.muted) return [];

    switch (node.type) {
      case "startNode":
        return [];

      case "moveNode": {
        const cmd: MoveCommand = { distance: node.data.distance || 10 };
        return [{ type: "move", value: cmd }];
      }

      case "rotateNode": {
        const cmd: RotateCommand = { angle: -node.data.angle || 0 };
        return [{ type: "rotate", value: cmd }];
      }

      case "penNode": {
        const cmd: PenCommand = { isDrawing: node.data.penDown, color: node.data.color || "#000" };
        return [
          {
            type: "pen",
            value: cmd,
          },
        ];
      }

      case "loopNode":
        return []; // Loops are handled in path collection

      default:
        return [];
    }
  }

  // PHASE 1: Collect all execution paths
  private collectPaths(nodeTree: NodeTree): Array<ExecutionPath> {
    const paths: Array<ExecutionPath> = [];

    const walkPath = (node: NodeTree, commandsSoFar: Array<TurtleCommand> = []) => {
      // Add current node's commands
      const nodeCommands = this.nodeToCommands(node.node);
      const currentCommands = [...commandsSoFar, ...nodeCommands];

      // Handle loop nodes specially
      if (node.node.type === "loopNode") {
        const loopCount = node.node.data?.loopCount || 3;

        // For each child, repeat it loopCount times, then continue
        if (node.children.length === 0) {
          // Loop with no children - just create a path with current commands
          paths.push({
            id: `path_${++this.pathCounter}`,
            commands: currentCommands,
          });
        } else if (node.children.length === 1) {
          // Single child - repeat it in sequence
          let loopCommands = [...currentCommands];
          for (let i = 0; i < loopCount; i++) {
            // Add child commands for each iteration
            const childCommands = this.collectChildCommands(node.children[0]);
            loopCommands = [...loopCommands, ...childCommands];
          }

          // Continue with children of the loop child
          this.continueAfterLoop(node.children[0], loopCommands, paths);
        } else {
          // Multiple children - each gets repeated, then branches
          node.children.forEach((child) => {
            let branchCommands = [...currentCommands];
            for (let i = 0; i < loopCount; i++) {
              const childCommands = this.collectChildCommands(child);
              branchCommands = [...branchCommands, ...childCommands];
            }
            this.continueAfterLoop(child, branchCommands, paths);
          });
        }
        return;
      }

      // Regular node handling
      if (node.children.length === 0) {
        // Leaf node - end of path
        paths.push({
          id: `path_${++this.pathCounter}`,
          commands: currentCommands,
        });
      } else if (node.children.length === 1) {
        // Single child - continue same path
        walkPath(node.children[0], currentCommands);
      } else {
        // Multiple children - create separate paths
        node.children.forEach((child) => {
          walkPath(child, currentCommands);
        });
      }
    };

    walkPath(nodeTree);
    return paths;
  }

  // Helper: collect commands from a subtree without executing it
  private collectChildCommands(node: NodeTree): Array<TurtleCommand> {
    const commands: Array<TurtleCommand> = [];

    const collect = (n: NodeTree) => {
      commands.push(...this.nodeToCommands(n.node));
      // For loops inside loops, we'd need to handle this recursively
      if (n.node.type === "loopNode") {
        const loopCount = n.node.data?.loopCount || 3;
        for (let i = 0; i < loopCount; i++) {
          n.children.forEach((child) => collect(child));
        }
      } else {
        // Just take first child for collecting commands in sequence
        if (n.children.length > 0) {
          collect(n.children[0]);
        }
      }
    };

    collect(node);
    return commands;
  }

  // Helper: continue path after loop
  private continueAfterLoop(
    loopChild: NodeTree,
    commands: Array<TurtleCommand>,
    paths: Array<ExecutionPath>,
  ) {
    if (loopChild.children.length === 0) {
      paths.push({
        id: `path_${++this.pathCounter}`,
        commands,
      });
    } else {
      loopChild.children.forEach((child) => {
        this.walkPathFrom(child, commands, paths);
      });
    }
  }

  // Helper: continue walking from a specific node
  private walkPathFrom(
    node: NodeTree,
    commandsSoFar: Array<TurtleCommand>,
    paths: Array<ExecutionPath>,
  ) {
    const nodeCommands = this.nodeToCommands(node.node);
    const currentCommands = [...commandsSoFar, ...nodeCommands];

    if (node.children.length === 0) {
      paths.push({
        id: `path_${++this.pathCounter}`,
        commands: currentCommands,
      });
    } else if (node.children.length === 1) {
      this.walkPathFrom(node.children[0], currentCommands, paths);
    } else {
      node.children.forEach((child) => {
        this.walkPathFrom(child, currentCommands, paths);
      });
    }
  }

  // PHASE 2: Execute all paths
  async executeFlow(nodes: Array<Node>, edges: Array<Edge>): Promise<void> {
    // Convert to tree
    const nodeTree = this.convertFlowToNodeTree(nodes, edges);
    if (!nodeTree) {
      console.error("Could not create node tree");
      return;
    }

    // Collect all paths
    const paths = this.collectPaths(nodeTree);
    console.log(`Found ${paths.length} execution paths:`);
    paths.forEach((path) => {
      console.log(`  ${path.id}: ${path.commands.length} commands`);
    });

    // Reset engine
    this.turtleEngine.reset();

    // Create one turtle per path
    paths.forEach((path) => {
      const turtle = this.turtleEngine.createTurtle(path.id, 0, 0, 90);
      console.log(`Created turtle ${path.id} with ${path.commands.length} commands`);
    });

    // Queue all commands for all turtles BEFORE starting
    paths.forEach((path) => {
      this.turtleEngine.addCommands(path.id, path.commands);
    });

    // Start all turtles simultaneously
    this.turtleEngine.start();

    // Wait for completion
    await this.waitForCompletion();
    console.log("All paths completed");
  }

  private async waitForCompletion(): Promise<void> {
    return new Promise((resolve) => {
      const check = () => {
        if (!this.turtleEngine.isAnyTurtleExecuting()) {
          resolve();
        } else {
          setTimeout(check, 50);
        }
      };
      check();
    });
  }

  setSpeed(speedLevel: number) {
    const delay = Math.max(10, 160 - speedLevel * 15);
    this.turtleEngine.setDrawDelay(delay);
  }

  stop() {
    this.turtleEngine.stop();
  }

  clear() {
    this.turtleEngine.clear();
  }

  reset() {
    this.turtleEngine.reset();
    this.pathCounter = 0;
  }
}
