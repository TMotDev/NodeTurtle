import { TurtleGraphicsEngine  } from './TurtleGraphics';
import { createAsciiTree, createFlowSummary } from './flowUtils';
import type {TurtleCommand} from './TurtleGraphics';

import type { NodeRegistry, NodeTree} from './flowUtils';
import type { Edge, Node } from "@xyflow/react";

interface ExecutionContext {
  turtleEngine: TurtleGraphicsEngine;
  turtleId: string;
  position: { x: number; y: number };
  angle: number;
  branchIndex: number;
  parentPath: Array<string>;
}

interface BranchResult {
  turtleId: string;
  commands: Array<TurtleCommand>;
  finalPosition: { x: number; y: number };
  finalAngle: number;
}

export class TurtleFlowExecutor {
  private turtleEngine: TurtleGraphicsEngine;
  private executionResults: Array<{ turtleId: string; log: string; path: Array<any> }> = [];
  private turtleCounter = 0;
  private isExecuting = false;

  constructor(canvas: HTMLCanvasElement) {
    this.turtleEngine = new TurtleGraphicsEngine(canvas);
  }

  private generateTurtleId(): string {
    return `turtle_${++this.turtleCounter}`;
  }

  // Convert ReactFlow nodes and edges to NodeTree format
  convertFlowToNodeTree(nodes: Array<Node>, edges: Array<Edge>): NodeTree | null {
    // Find the start node
    const startNode = nodes.find(node => node.type === 'startNode');
    if (!startNode) {
      console.warn('No start node found in flow');
      return null;
    }

    const visited = new Set<string>();
    const loopRefs = new Set<string>();

    const buildTree = (nodeId: string, visitedInPath = new Set<string>()): NodeTree => {
      const node = nodes.find(n => n.id === nodeId);
      if (!node) {
        throw new Error(`Node ${nodeId} not found`);
      }

      // Check for cycles in the current path (loops)
      const isLoopRef = visitedInPath.has(nodeId);
      if (isLoopRef) {
        loopRefs.add(nodeId);
        return {
          node: {
            id: node.id,
            type: node.type || 'unknown',
            data: node.data
          },
          children: [],
          isLoop: true
        };
      }

      // Add to current path
      const newVisitedInPath = new Set(visitedInPath);
      newVisitedInPath.add(nodeId);

      // Find outgoing edges
      const outgoingEdges = edges.filter(edge => edge.source === nodeId);

      // Group edges by source handle for loop nodes
      const edgesByHandle = new Map<string, Array<Edge>>();
      outgoingEdges.forEach(edge => {
        const handle = edge.sourceHandle || 'default';
        if (!edgesByHandle.has(handle)) {
          edgesByHandle.set(handle, []);
        }
        edgesByHandle.get(handle)!.push(edge);
      });

      const children: Array<NodeTree> = [];

      // Process each handle group
      for (const [handle, handleEdges] of edgesByHandle.entries()) {
        for (const edge of handleEdges) {
          const childTree = buildTree(edge.target, newVisitedInPath);
          // Add source handle info for loop processing
          if (handle !== 'default') {
            childTree.node.source = { handle };
          }
          children.push(childTree);
        }
      }

      return {
        node: {
          id: node.id,
          type: node.type || 'unknown',
          data: node.data
        },
        children,
        isLoop: false
      };
    };

    try {
      return buildTree(startNode.id);
    } catch (error) {
      console.error('Error building node tree:', error);
      return null;
    }
  }

  private nodeTypeToCommands(node: NodeTree['node'], context: ExecutionContext): Array<TurtleCommand> {
    const commands: Array<TurtleCommand> = [];
    const nodeType = node.type as keyof NodeRegistry;
    const nodeData = node.data;

    if (nodeData.muted) {
      // Add a small wait for muted nodes to show they were processed
      commands.push({ type: 'wait', duration: 100 });
      return commands;
    }

    switch (nodeType) {
      case 'startNode':
        // Start node doesn't generate commands, just marks the beginning
        break;

      case 'moveNode': {
        const distance = nodeData.distance || 10;
        commands.push({ type: 'move', value: distance });
        break;
      }

      case 'rotateNode': {
        const angle = nodeData.angle || 0;
        commands.push({ type: 'rotate', value: angle });
        break;
      }

      case 'loopNode':
        // Loop commands are handled in the execution logic, not here
        break;

      case 'penNode': {
        const color = nodeData.color
        const penIsDown = nodeData.penDown ? 1 : 0;
        commands.push({ type: 'pen', value: penIsDown , color})
        break;
      }

      default:
        console.warn(`Unknown node type: ${nodeType}`);
    }

    return commands;
  }

  private async executeNodeTree(
    nodeTree: NodeTree,
    context: ExecutionContext,
    depth: number = 0
  ): Promise<BranchResult> {
    const node = nodeTree.node;
    const children = nodeTree.children;

    // Skip loop reference nodes
    if (nodeTree.isLoop) {
      console.log(`${"  ".repeat(depth)}Skipping loop reference: ${node.type} (${node.id})`);
      return {
        turtleId: context.turtleId,
        commands: [],
        finalPosition: context.position,
        finalAngle: context.angle
      };
    }

    const indent = "  ".repeat(depth);
    console.log(`${indent}Executing ${node.type} (${node.id})`);

    // Generate commands for current node
    const nodeCommands = this.nodeTypeToCommands(node, context);

    // Add commands to turtle's queue
    if (nodeCommands.length > 0) {
      this.turtleEngine.addCommands(context.turtleId, nodeCommands);
    }

    // Handle special case: loop node
    if (node.type === 'loopNode') {
      const loopCount = node.data.loopCount || 3;
      const loopChildren: Array<NodeTree> = [];
      const exitChildren: Array<NodeTree> = [];

      // Separate loop children from exit children
      for (const child of children) {
        if (child.node.source?.handle === 'loop') {
          loopChildren.push(child);
        } else {
          exitChildren.push(child);
        }
      }

      console.log(`${indent}  Loop ${loopCount} times with ${loopChildren.length} loop children, ${exitChildren.length} exit children`);

      // Execute loop children multiple times
      for (let i = 0; i < loopCount; i++) {
        console.log(`${indent}    Loop iteration ${i + 1}/${loopCount}`);
        for (const loopChild of loopChildren) {
          await this.executeNodeTree(loopChild, context, depth + 2);
        }
      }

      // Execute exit children once
      for (const exitChild of exitChildren) {
        await this.executeNodeTree(exitChild, context, depth + 1);
      }

      return {
        turtleId: context.turtleId,
        commands: nodeCommands,
        finalPosition: context.position,
        finalAngle: context.angle
      };
    }

    // Handle regular nodes with children
    if (children.length === 0) {
      // Leaf node - no children
      console.log(`${indent}  End of branch`);
    } else if (children.length === 1) {
      // Single child - continue with same turtle
      await this.executeNodeTree(children[0], context, depth + 1);
    } else {
      // Multiple children - create new turtles for branches
      console.log(`${indent}  Branching into ${children.length} paths`);

      const branchPromises = children.map(async (child, index) => {
        // Create new turtle for each branch (except the first one)
        const branchTurtleId = index === 0 ? context.turtleId : this.generateTurtleId();

        if (index > 0) {
          // Create new turtle at current position
          const turtle = this.turtleEngine.getTurtle(context.turtleId);
          if (turtle) {
            const canvasWidth = this.turtleEngine['canvas'].width;
            const canvasHeight = this.turtleEngine['canvas'].height;
            const newTurtle = this.turtleEngine.createTurtle(
              branchTurtleId,
              turtle.x - canvasWidth / 2,
              -(turtle.y - canvasHeight / 2),
              turtle.angle
            );
            console.log(`${indent}    Created branch turtle ${branchTurtleId} at position (${Math.round(newTurtle.x)}, ${Math.round(newTurtle.y)})`);
          }
        }

        const branchContext: ExecutionContext = {
          ...context,
          turtleId: branchTurtleId,
          branchIndex: index,
          parentPath: [...context.parentPath, `${node.type}(${node.id})`]
        };

        console.log(`${indent}    Branch ${index + 1} (${branchTurtleId}):`);
        return this.executeNodeTree(child, branchContext, depth + 2);
      });

      await Promise.all(branchPromises);
    }

    return {
      turtleId: context.turtleId,
      commands: nodeCommands,
      finalPosition: context.position,
      finalAngle: context.angle
    };
  }

  async executeFlow(nodes: Array<Node>, edges: Array<Edge>): Promise<Array<{ turtleId: string; log: string; path: Array<any> }>> {
    if (this.isExecuting) {
      console.warn('Flow is already executing');
      return this.executionResults;
    }

    // Convert ReactFlow data to NodeTree
    const nodeTree = this.convertFlowToNodeTree(nodes, edges);
    if (!nodeTree) {
      console.error('Could not create node tree from flow data');
      return [];
    }

    return this.execute(nodeTree);
  }

  async execute(nodeTree: NodeTree): Promise<Array<{ turtleId: string; log: string; path: Array<any> }>> {
    if (this.isExecuting) {
      console.warn('Flow is already executing');
      return this.executionResults;
    }

    this.isExecuting = true;
    this.executionResults = [];
    this.turtleCounter = 0;

    console.log('Starting turtle flow execution...');

    // Log the tree structure
    const treeLines = createAsciiTree(nodeTree);
    console.log('Flow Structure:');
    treeLines.forEach(line => console.log(line));

    // Create summary
    const summaryLines = createFlowSummary(nodeTree, []);
    console.log('\n' + summaryLines.join('\n'));

    // Reset the turtle engine
    this.turtleEngine.reset();

    // Create the main turtle
    const mainTurtleId = this.generateTurtleId();
    const mainTurtle = this.turtleEngine.createTurtle(mainTurtleId, 0, 0, 90); // Start facing up

    console.log(`Created main turtle ${mainTurtleId} at center`);

    // Create execution context
    const context: ExecutionContext = {
      turtleEngine: this.turtleEngine,
      turtleId: mainTurtleId,
      position: { x: 0, y: 0 },
      angle: 0,
      branchIndex: 0,
      parentPath: []
    };

    try {
      // Execute the node tree
      await this.executeNodeTree(nodeTree, context);

      // Start the turtle animation
      this.turtleEngine.start();

      // Wait for all turtles to finish executing
      await this.waitForCompletion();

      console.log('Flow execution completed successfully');

      // Add results
      this.executionResults.push({
        turtleId: 'flow_structure',
        log: 'tree_visualization',
        path: treeLines
      });

      this.executionResults.push({
        turtleId: 'execution_summary',
        log: 'summary',
        path: summaryLines
      });

      // Add turtle information
      const allTurtles = this.turtleEngine.getAllTurtles();
      this.executionResults.push({
        turtleId: 'turtle_info',
        log: 'turtle_states',
        path: allTurtles.map(t => `Turtle ${t.id}: position(${Math.round(t.x)}, ${Math.round(t.y)}), angle(${Math.round(t.angle)}°)`)
      });

    } catch (error) {
      console.error('Error executing flow:', error);
      this.executionResults.push({
        turtleId: 'error',
        log: 'execution_error',
        path: [String(error)]
      });
    } finally {
      this.isExecuting = false;
    }

    return this.executionResults;
  }

  private async waitForCompletion(): Promise<void> {
    return new Promise((resolve) => {
      const checkCompletion = () => {
        if (!this.turtleEngine.isAnyTurtleExecuting()) {
          resolve();
        } else {
          setTimeout(checkCompletion, 100);
        }
      };
      checkCompletion();
    });
  }

  // Utility methods
  getTurtleEngine(): TurtleGraphicsEngine {
    return this.turtleEngine;
  }

  stop() {
    this.turtleEngine.stop();
    this.isExecuting = false;
  }

  clear() {
    this.turtleEngine.clear();
  }

  reset() {
    this.turtleEngine.reset();
    this.executionResults = [];
    this.turtleCounter = 0;
    this.isExecuting = false;
  }

  isRunning(): boolean {
    return this.isExecuting || this.turtleEngine.isAnyTurtleExecuting();
  }
}