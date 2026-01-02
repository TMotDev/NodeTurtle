export interface TurtleState {
  id: string;
  x: number;
  y: number;
  angle: number;
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
  private drawingCtx: CanvasRenderingContext2D;
  private turtleCtx: CanvasRenderingContext2D;
  private turtles = new Map<string, TurtleState>();
  private commandQueues = new Map<string, Array<TurtleCommand>>();
  private isExecuting = new Map<string, boolean>();
  private isRunning = false;
  private drawDelay = 0;
  private animationId: number | null = null;

  onComplete?: () => void;

  constructor(
    private drawingCanvas: HTMLCanvasElement,
    private turtleCanvas: HTMLCanvasElement,
  ) {
    const dCtx = drawingCanvas.getContext("2d");
    const tCtx = turtleCanvas.getContext("2d");

    if (!dCtx || !tCtx) {
      throw new Error("Failed to get canvas contexts");
    }

    this.drawingCtx = dCtx;
    this.turtleCtx = tCtx;
    // No initCanvas call needed here anymore as we don't draw the static grid
  }

  setDelay(delay: number) {
    this.drawDelay = delay;
  }

  createTurtle(id: string, x = 0, y = 0, angle = 0, color = "#000"): TurtleState {
    const centerX = this.drawingCanvas.width / 2;
    const centerY = this.drawingCanvas.height / 2;

    const turtle: TurtleState = {
      id,
      x: centerX + x,
      y: centerY - y,
      angle,
      penDown: true,
      color,
      lineWidth: 2,
    };

    this.turtles.set(id, turtle);
    this.commandQueues.set(id, []);
    this.isExecuting.set(id, false);
    return turtle;
  }

  queueCommands(turtleId: string, commands: Array<TurtleCommand>) {
    const queue = this.commandQueues.get(turtleId);
    if (queue) queue.push(...commands);
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.animate();
  }

  pause() {
    this.isRunning = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  resume() {
    this.start();
  }

  reset() {
    this.pause();
    this.clearCanvas();
    this.turtles.clear();
    this.commandQueues.clear();
    this.isExecuting.clear();
  }

  private animate = () => {
    if (!this.isRunning) return;

    this.turtles.forEach((_, id) => {
      this.processTurtleQueue(id);
    });

    this.drawTurtles();
    this.animationId = requestAnimationFrame(this.animate);
  };

  private async processTurtleQueue(turtleId: string) {
    // Prevent concurrent execution for same turtle
    if (this.isExecuting.get(turtleId)) return;

    const turtle = this.turtles.get(turtleId);
    const queue = this.commandQueues.get(turtleId);

    if (!turtle || !queue || queue.length === 0) return;

    this.isExecuting.set(turtleId, true);

    const command = queue.shift()!;
    await this.executeCommand(turtle, command);

    this.isExecuting.set(turtleId, false);

    // Check if all turtles are done
    if (this.isRunning && this.isAllDone()) {
      this.isRunning = false;
      if (this.animationId) {
        cancelAnimationFrame(this.animationId);
        this.animationId = null;
      }
      this.turtles.clear();
      this.commandQueues.clear();
      this.isExecuting.clear();
      this.onComplete?.();
    }
  }

  private isAllDone(): boolean {
    for (const queue of this.commandQueues.values()) {
      if (queue.length > 0) return false;
    }
    for (const executing of this.isExecuting.values()) {
      if (executing) return false;
    }
    return true;
  }

  private async executeCommand(turtle: TurtleState, command: TurtleCommand) {
    switch (command.type) {
      case "move": {
        const { distance } = command.value as MoveCommand;
        const radians = (turtle.angle * Math.PI) / 180;
        const endX = turtle.x + Math.cos(radians) * distance;
        const endY = turtle.y - Math.sin(radians) * distance;

        if (turtle.penDown) {
          this.drawingCtx.save();
          this.drawingCtx.strokeStyle = turtle.color;
          this.drawingCtx.lineWidth = turtle.lineWidth;
          this.drawingCtx.lineCap = "round";
          this.drawingCtx.beginPath();
          this.drawingCtx.moveTo(turtle.x, turtle.y);
          this.drawingCtx.lineTo(endX, endY);
          this.drawingCtx.stroke();
          this.drawingCtx.restore();
        }

        turtle.x = endX;
        turtle.y = endY;

        if (this.drawDelay > 0) {
          await new Promise((resolve) => setTimeout(resolve, this.drawDelay));
        }
        break;
      }

      case "rotate": {
        const { angle } = command.value as RotateCommand;
        turtle.angle += angle;
        break;
      }

      case "pen": {
        const { isDrawing, color } = command.value as PenCommand;
        turtle.penDown = isDrawing;
        turtle.color = color;
        break;
      }
    }
  }

  private drawTurtles() {
    this.turtleCtx.clearRect(0, 0, this.turtleCanvas.width, this.turtleCanvas.height);

    for (const turtle of this.turtles.values()) {
      this.turtleCtx.save();
      this.turtleCtx.translate(turtle.x, turtle.y);
      this.turtleCtx.rotate(((-turtle.angle + 90) * Math.PI) / 180);

      this.turtleCtx.fillStyle = turtle.color;
      this.turtleCtx.strokeStyle = "transparent";
      this.turtleCtx.lineWidth = 0.1;

      this.turtleCtx.beginPath();
      this.turtleCtx.moveTo(0, -8);
      this.turtleCtx.lineTo(6, 6);
      this.turtleCtx.lineTo(-6, 6);
      this.turtleCtx.closePath();
      this.turtleCtx.fill();
      this.turtleCtx.stroke();

      this.turtleCtx.restore();
    }
  }

  private clearCanvas() {
    // Only clear the drawing (trails), do not fill white
    this.drawingCtx.clearRect(0, 0, this.drawingCanvas.width, this.drawingCanvas.height);
    // Clear turtle canvas
    this.turtleCtx.clearRect(0, 0, this.turtleCanvas.width, this.turtleCanvas.height);
  }
}