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
  loopChildren?: Array<NodeTree>;
}

export class TurtleFlowExecutor {
  private turtleEngine: TurtleGraphicsEngine;
  private pathCounter = 0;

  constructor(drawingCanvas: HTMLCanvasElement, turtleCanvas: HTMLCanvasElement) {
    this.turtleEngine = new TurtleGraphicsEngine(drawingCanvas, turtleCanvas);
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

      let outgoingEdges = edges.filter((edge) => edge.source === nodeId);
      let loopBodyEdges: Array<Edge> = [];

      if (node.type === "loopNode") {
        loopBodyEdges = outgoingEdges.filter((edge) => edge.sourceHandle === "loop");
        outgoingEdges = outgoingEdges.filter(
          (edge) => edge.sourceHandle === "out" || !edge.sourceHandle,
        );
      }

      const children = outgoingEdges.map((edge) => buildTree(edge.target, newVisited));
      const loopChildren = loopBodyEdges.map((edge) => buildTree(edge.target, newVisited));

      const treeNode: NodeTree = {
        node: { id: node.id, type: node.type || "unknown", data: node.data },
        children,
      };

      if (loopChildren.length > 0) {
        treeNode.loopChildren = loopChildren;
      }

      return treeNode;
    };

    return buildTree(startNode.id);
  }

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
        return [{ type: "pen", value: cmd }];
      }
      case "loopNode":
        return []; // Loop logic is handled during path collection
      default:
        return [];
    }
  }

  private collectSubtreeCommands(node: NodeTree): Array<TurtleCommand> {
    const commands: Array<TurtleCommand> = [];
    let currentNode: NodeTree | undefined = node;

    while (currentNode) {
      commands.push(...this.nodeToCommands(currentNode.node));

      // Handle nested loops within the loop body
      if (currentNode.node.type === "loopNode" && currentNode.loopChildren) {
        const loopCount = currentNode.node.data?.loopCount || 3;
        let loopBodyCmds: Array<TurtleCommand> = [];
        if (currentNode.loopChildren.length > 0) {
          loopBodyCmds = this.collectSubtreeCommands(currentNode.loopChildren[0]);
        }
        for (let i = 0; i < loopCount; i++) {
          commands.push(...loopBodyCmds);
        }
      }

      currentNode = currentNode.children.length > 0 ? currentNode.children[0] : undefined;
    }

    return commands;
  }

  private collectPaths(nodeTree: NodeTree): Array<ExecutionPath> {
    const paths: Array<ExecutionPath> = [];

    const walkPath = (node: NodeTree, commandsSoFar: Array<TurtleCommand> = []) => {
      const nodeCommands = this.nodeToCommands(node.node);
      const currentCommands = [...commandsSoFar, ...nodeCommands];

      if (node.node.type === "loopNode" && node.loopChildren && node.loopChildren.length > 0) {
        const loopCount = node.node.data?.loopCount || 3;
        const loopBodyCommands = this.collectSubtreeCommands(node.loopChildren[0]);

        for (let i = 0; i < loopCount; i++) {
          currentCommands.push(...loopBodyCommands);
        }

        if (node.children.length === 0) {
          paths.push({ id: `path_${++this.pathCounter}`, commands: currentCommands });
        } else {
          node.children.forEach((child) => walkPath(child, currentCommands));
        }
        return;
      }

      if (node.children.length === 0) {
        paths.push({ id: `path_${++this.pathCounter}`, commands: currentCommands });
      } else {
        node.children.forEach((child) => walkPath(child, currentCommands));
      }
    };

    walkPath(nodeTree);
    return paths;
  }

  async executeFlow(nodes: Array<Node>, edges: Array<Edge>): Promise<void> {
    this.pathCounter = 0;
    const nodeTree = this.convertFlowToNodeTree(nodes, edges);
    if (!nodeTree) {
      console.error("Could not create node tree from flow");
      return;
    }

    const paths = this.collectPaths(nodeTree);
    console.log(`Found ${paths.length} execution paths:`);

    this.turtleEngine.reset();

    if (paths.length === 0 && nodes.some(n => n.type === 'startNode')) {
        this.turtleEngine.createTurtle('default', 0, 0, 90);
    } else {
        paths.forEach((path) => {
            this.turtleEngine.createTurtle(path.id, 0, 0, 90);
            this.turtleEngine.addCommands(path.id, path.commands);
        });
    }

    this.turtleEngine.start();

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
    const delay = speedLevel === 10 ? 0 : Math.max(10, 160 - speedLevel * 15);
    this.turtleEngine.setDrawDelay(delay);
  }

  clear(){
    this.turtleEngine.clear();
  }

  stop() {
    this.turtleEngine.stop();
  }

  reset() {
    this.turtleEngine.reset();
    this.pathCounter = 0;
  }
}

