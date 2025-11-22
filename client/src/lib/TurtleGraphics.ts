export interface TurtleState {
  id: string;
  x: number;
  y: number;
  angle: number; // in degrees
  penDown: boolean;
  color: string;
  lineWidth: number;
}

export interface MoveCommand {
  distance: number;
}

export interface RotateCommand {
  angle: number;
}

export interface PenCommand {
  color: string;
  isDrawing: boolean;
}

export interface TurtleCommand {
  type: "move" | "rotate" | "pen";
  value: MoveCommand | RotateCommand | PenCommand;
}

export class TurtleGraphicsEngine {
  private canvas: HTMLCanvasElement;
  private turtleCanvas: HTMLCanvasElement;
  private drawingCtx: CanvasRenderingContext2D;
  private turtleCtx: CanvasRenderingContext2D;
  private turtles: Map<string, TurtleState> = new Map();
  private isRunning = false;
  private drawDelay = 70;
  private commandQueues: Map<string, Array<TurtleCommand>> = new Map();
  private executingCommands: Map<string, boolean> = new Map();
  private animationId: number | null = null;

  constructor(drawingCanvas: HTMLCanvasElement, turtleCanvas: HTMLCanvasElement) {
    this.canvas = drawingCanvas;
    this.turtleCanvas = turtleCanvas;

    const dContext = drawingCanvas.getContext("2d");
    if (!dContext) {
      throw new Error("Could not get 2D context from drawing canvas");
    }
    this.drawingCtx = dContext;

    const tContext = turtleCanvas.getContext("2d");
    if (!tContext) {
      throw new Error("Could not get 2D context from turtle canvas");
    }
    this.turtleCtx = tContext;

    this.setupCanvas();
  }

  private setupCanvas() {
    const width = this.canvas.width;
    const height = this.canvas.height;

    this.drawingCtx.fillStyle = "#ffffff";
    this.drawingCtx.fillRect(0, 0, width, height);

    this.drawGrid();
  }

  setDrawDelay(delay: number) {
    this.drawDelay = Math.max(1, delay); // Ensure minimum delay of 1ms
  }

  private drawGrid() {
    const width = this.canvas.width;
    const height = this.canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const gridSize = 20;

    this.drawingCtx.save();
    this.drawingCtx.strokeStyle = "#f8f9fa";
    this.drawingCtx.lineWidth = 1;

    // Vertical lines
    for (let x = 0; x <= width; x += gridSize) {
      this.drawingCtx.beginPath();
      this.drawingCtx.moveTo(x, 0);
      this.drawingCtx.lineTo(x, height);
      this.drawingCtx.stroke();
    }

    // Horizontal lines
    for (let y = 0; y <= height; y += gridSize) {
      this.drawingCtx.beginPath();
      this.drawingCtx.moveTo(0, y);
      this.drawingCtx.lineTo(width, y);
      this.drawingCtx.stroke();
    }

    // Draw axes
    this.drawingCtx.strokeStyle = "#dee2e6";
    this.drawingCtx.lineWidth = 2;

    // X-axis
    this.drawingCtx.beginPath();
    this.drawingCtx.moveTo(0, centerY);
    this.drawingCtx.lineTo(width, centerY);
    this.drawingCtx.stroke();

    // Y-axis
    this.drawingCtx.beginPath();
    this.drawingCtx.moveTo(centerX, 0);
    this.drawingCtx.lineTo(centerX, height);
    this.drawingCtx.stroke();

    this.drawingCtx.restore();
  }

  createTurtle(
    id: string,
    x: number = 0,
    y: number = 0,
    angle: number = 0,
    color = "#000",
  ): TurtleState {
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;

    const turtle: TurtleState = {
      id,
      x: centerX + x,
      y: centerY - y, // Flip Y coordinate (canvas Y increases downward)
      angle,
      penDown: true,
      color: color,
      lineWidth: 2,
    };

    this.turtles.set(id, turtle);
    this.commandQueues.set(id, []);
    this.executingCommands.set(id, false);

    return turtle;
  }

  addCommand(turtleId: string, command: TurtleCommand) {
    const queue = this.commandQueues.get(turtleId);
    if (queue) {
      queue.push(command);
    }
  }

  addCommands(turtleId: string, commands: Array<TurtleCommand>) {
    commands.forEach((cmd) => this.addCommand(turtleId, cmd));
  }

  private async executeCommand(turtle: TurtleState, command: TurtleCommand): Promise<void> {
    return new Promise((resolve) => {
        switch (command.type) {
          case "move": {
            const cmd = command.value as MoveCommand;
            const endX = turtle.x + Math.cos((turtle.angle * Math.PI) / 180) * cmd.distance;
            const endY = turtle.y - Math.sin((turtle.angle * Math.PI) / 180) * cmd.distance; // Flip Y

            if (turtle.penDown) {
              this.drawingCtx.save();
              this.drawingCtx.fillStyle = turtle.color;
              this.drawingCtx.strokeStyle = turtle.color;
              this.drawingCtx.lineWidth = turtle.lineWidth;
              this.drawingCtx.lineCap = "round";
              this.drawingCtx.lineJoin = "round";
              this.drawingCtx.beginPath();
              this.drawingCtx.moveTo(turtle.x, turtle.y);
              this.drawingCtx.lineTo(endX, endY);
              this.drawingCtx.stroke();
              this.drawingCtx.restore();
            }
            turtle.x = endX;
            turtle.y = endY;
            resolve();

            break;
          }

          case "rotate": {
            const cmd = command.value as RotateCommand;
            turtle.angle += cmd.angle;
            resolve();
            break;
          }

          case "pen": {
            const cmd = command.value as PenCommand;
            turtle.penDown = cmd.isDrawing;
            turtle.color = cmd.color;
            resolve();
            break;
          }

          default:
            resolve();
        }
    });
  }

  private async processTurtleQueue(turtleId: string) {
    if (this.executingCommands.get(turtleId)) return;

    const turtle = this.turtles.get(turtleId);
    const queue = this.commandQueues.get(turtleId);

    if (!turtle || !queue || queue.length === 0) return;

    this.executingCommands.set(turtleId, true);

    while (queue.length > 0 && this.isRunning) {
      const command = queue.shift()!;
      await this.executeCommand(turtle, command);
    }

    this.executingCommands.set(turtleId, false);
  }

  private drawTurtles() {
    this.turtleCtx.clearRect(0, 0, this.turtleCanvas.width, this.turtleCanvas.height);
    this.turtles.forEach((turtle) => {
      this.turtleCtx.save();

      this.turtleCtx.translate(turtle.x, turtle.y);
      this.turtleCtx.rotate((-turtle.angle + 90) * Math.PI / 180); // Orient the turtle

      // Draw a triangle for the turtle
      this.turtleCtx.fillStyle = turtle.color;
      this.turtleCtx.strokeStyle = "#FFF";
      this.turtleCtx.lineWidth = 1.5;

      this.turtleCtx.beginPath();
      this.turtleCtx.moveTo(0, -8); // Tip
      this.turtleCtx.lineTo(6, 6);  // Right corner
      this.turtleCtx.lineTo(-6, 6); // Left corner
      this.turtleCtx.closePath();
      this.turtleCtx.fill();
      this.turtleCtx.stroke();

      this.turtleCtx.restore();
    });
  }

  private animate = () => {
    if (!this.isRunning) return;

    this.turtles.forEach((_, turtleId) => {
      this.processTurtleQueue(turtleId);
    });

    this.drawTurtles();

    this.animationId = requestAnimationFrame(this.animate);
  };

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.animate();
  }

  stop() {
    this.isRunning = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  clear() {
    console.log("clearing")
    this.drawingCtx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.turtleCtx.clearRect(0, 0, this.turtleCanvas.width, this.turtleCanvas.height);
    this.setupCanvas();
  }

  reset() {
    this.stop();
    this.clear();
    this.turtles.clear();
    this.commandQueues.clear();
    this.executingCommands.clear();
  }

  getTurtle(id: string): TurtleState | undefined {
    return this.turtles.get(id);
  }

  getAllTurtles(): Array<TurtleState> {
    return Array.from(this.turtles.values());
  }

  getTurtleCount(): number {
    return this.turtles.size;
  }

  // Utility method to check if any turtle is still executing commands
  isAnyTurtleExecuting(): boolean {
    return (
      Array.from(this.executingCommands.values()).some((executing) => executing) ||
      Array.from(this.commandQueues.values()).some((queue) => queue.length > 0)
    );
  }
}
