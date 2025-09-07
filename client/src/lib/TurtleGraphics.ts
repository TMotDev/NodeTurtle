export interface TurtleState {
  id: string;
  x: number;
  y: number;
  angle: number; // in degrees
  penDown: boolean;
  color: string;
  lineWidth: number;
  speed: number; // animation speed multiplier
  trail: Array<{ x: number; y: number; penDown: boolean }>;
}

export interface TurtleCommand {
  type: "move" | "rotate" | "penUp" | "penDown" | "setColor" | "setSpeed" | "wait" | "pen";
  value?: number;
  color?: string;
  duration?: number;
}

export class TurtleGraphicsEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private turtles: Map<string, TurtleState> = new Map();
  private animationId: number | null = null;
  private isRunning = false;
  private drawDelay = 70;
  private commandQueues: Map<string, Array<TurtleCommand>> = new Map();
  private executingCommands: Map<string, boolean> = new Map();

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Could not get 2D context from canvas");
    }
    this.ctx = context;
    this.setupCanvas();
  }

  private setupCanvas() {
    const width = this.canvas.width;
    const height = this.canvas.height;

    this.ctx.fillStyle = "#ffffff";
    this.ctx.fillRect(0, 0, width, height);

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

    this.ctx.save();
    this.ctx.strokeStyle = "#f8f9fa";
    this.ctx.lineWidth = 1;

    // Vertical lines
    for (let x = 0; x <= width; x += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, height);
      this.ctx.stroke();
    }

    // Horizontal lines
    for (let y = 0; y <= height; y += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(width, y);
      this.ctx.stroke();
    }

    // Draw axes
    this.ctx.strokeStyle = "#dee2e6";
    this.ctx.lineWidth = 2;

    // X-axis
    this.ctx.beginPath();
    this.ctx.moveTo(0, centerY);
    this.ctx.lineTo(width, centerY);
    this.ctx.stroke();

    // Y-axis
    this.ctx.beginPath();
    this.ctx.moveTo(centerX, 0);
    this.ctx.lineTo(centerX, height);
    this.ctx.stroke();

    this.ctx.restore();
  }

  createTurtle(id: string, x: number = 0, y: number = 0, angle: number = 0): TurtleState {
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;

    const turtle: TurtleState = {
      id,
      x: centerX + x,
      y: centerY - y, // Flip Y coordinate (canvas Y increases downward)
      angle,
      penDown: true,
      color: "#000",
      lineWidth: 2,
      speed: 1,
      trail: [],
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
      setTimeout(() => {
        switch (command.type) {
          case "move": {
            const distance = command.value || 0;
            const endX = turtle.x + Math.cos((turtle.angle * Math.PI) / 180) * distance;
            const endY = turtle.y - Math.sin((turtle.angle * Math.PI) / 180) * distance; // Flip Y

            if (turtle.penDown) {
              console.log("down");
              this.ctx.save();
              this.ctx.fillStyle = turtle.color;
              this.ctx.strokeStyle = turtle.color;
              this.ctx.lineWidth = turtle.lineWidth;
              this.ctx.lineCap = "round";
              this.ctx.lineJoin = "round";
              this.ctx.beginPath();
              this.ctx.moveTo(turtle.x, turtle.y);
              this.ctx.lineTo(endX, endY);
              this.ctx.stroke();
              this.ctx.restore();
            }
            turtle.x = endX;
            turtle.y = endY;
            turtle.trail.push({ x: turtle.x, y: turtle.y, penDown: turtle.penDown });

            resolve();

            break;
          }

          case "rotate": {
            const angleChange = command.value || 0;
            turtle.angle += angleChange;
            resolve();
            break;
          }

          case "pen": {
            turtle.penDown = !!command.value;
            turtle.color = command.color || "#000000";
            resolve();
            break;
          }

          case "penUp":
            turtle.penDown = false;
            resolve();
            break;

          case "penDown":
            turtle.penDown = true;
            resolve();
            break;

          case "setColor":
            if (command.color) {
              turtle.color = command.color;
            }
            resolve();
            break;

          case "setSpeed":
            if (command.value) {
              turtle.speed = Math.max(0.1, command.value);
            }
            resolve();
            break;

          case "wait":
            setTimeout(resolve, command.duration || 500);
            break;

          default:
            resolve();
        }
      }, this.drawDelay);
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
    this.turtles.forEach((turtle) => {
      this.ctx.save();

      this.ctx.translate(turtle.x, turtle.y);

      this.ctx.fillStyle = turtle.color;
      this.ctx.strokeStyle = turtle.color;

      this.ctx.beginPath();
      this.ctx.arc(0, 0, 3, 0, 2 * Math.PI);
      this.ctx.fill();

      this.ctx.restore();
    });
  }

  private animate = () => {
    if (!this.isRunning) return;

    this.turtles.forEach((_, turtleId) => {
      this.processTurtleQueue(turtleId);
    });

    // this.drawTurtles();

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
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.setupCanvas();

    // Clear turtle trails
    this.turtles.forEach((turtle) => {
      turtle.trail = [];
    });
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
