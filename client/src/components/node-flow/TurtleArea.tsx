import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Play, RotateCcw, Square, Trash2, Turtle, Zap } from 'lucide-react';
import { Slider } from '../ui/slider';
import type { Edge, Node } from "@xyflow/react";
import  { TurtleFlowExecutor } from '@/lib/TurtleFlowExecutor';

interface TurtleAreaProps {
  nodes: Array<Node>;
  edges: Array<Edge>;
}

export const TurtleArea: React.FC<TurtleAreaProps> = ({ nodes, edges }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const executorRef = useRef<TurtleFlowExecutor | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [turtleCount, setTurtleCount] = useState(0);
  const [hasStartNode, setHasStartNode] = useState(false);
  const [speed, setSpeed] = useState([5]); // Speed from 1-10, default 5

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
    const startNodeExists = nodes.some(node => node.type === 'startNode');
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
      console.log('Executing flow with nodes:', nodes.length, 'edges:', edges.length);
      await executorRef.current.executeFlow(nodes, edges);
      // setTurtleCount(executorRef.current.getTurtleEngine().getTurtleCount());
    } catch (error) {
      console.error('Error executing turtle flow:', error);
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

  const clearCanvas = useCallback(() => {
    if (executorRef.current) {
      executorRef.current.clear();
    }
  }, []);

  const resetTurtles = useCallback(() => {
    if (executorRef.current) {
      executorRef.current.reset();
      setIsExecuting(false);
      setTurtleCount(0);
    }
  }, []);

  const getStatusColor = () => {
    if (isExecuting) return 'text-blue-600';
    if (!hasStartNode) return 'text-red-500';
    if (turtleCount > 0) return 'text-green-600';
    return 'text-gray-500';
  };

  const getStatusText = () => {
    if (isExecuting) return 'Executing...';
    if (!hasStartNode) return 'No start node found';
    if (turtleCount > 0) return `Completed with ${turtleCount} turtle${turtleCount !== 1 ? 's' : ''}`;
    return 'Ready to execute';
  };

  const getSpeedLabel = (value: number) => {
    if (value <= 2) return 'Very Slow';
    if (value <= 4) return 'Slow';
    if (value <= 6) return 'Normal';
    if (value <= 8) return 'Fast';
    return 'Very Fast';
  };

  return (
    <div className="bg-amber-50 w-[30vw] flex flex-col border-l border-amber-200">
      {/* Header */}
      <div className="bg-amber-100 border-b border-amber-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Turtle className="text-amber-700" size={20} />
            <h3 className="font-semibold text-amber-800">Turtle Graphics</h3>
          </div>
          <div className="text-sm text-amber-700">
            {turtleCount > 0 && (
              <div className="flex items-center gap-1">
                <Zap size={14} />
                <span className="font-medium">{turtleCount}</span>
              </div>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={executeFlow}
            disabled={isExecuting || !hasStartNode}
            className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Play size={14} />
            {isExecuting ? 'Running...' : 'Run'}
          </button>

          <button
            onClick={stopExecution}
            disabled={!isExecuting}
            className="flex items-center gap-1 px-3 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Square size={14} />
            Stop
          </button>

          <button
            onClick={clearCanvas}
            className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
          >
            <Trash2 size={14} />
            Clear
          </button>

          <button
            onClick={resetTurtles}
            className="flex items-center gap-1 px-2 py-2 bg-gray-600 text-white rounded text-sm hover:bg-gray-700 transition-colors"
          >
            <RotateCcw size={14} />
          </button>
        </div>

        {/* Speed Control */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-amber-800">
              Speed: {getSpeedLabel(speed[0])}
            </label>
            <span className="text-xs text-amber-600">
              {speed[0]}/10
            </span>
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

      {/* Canvas Container */}
      <div className="flex-1 p-4">
        <div className="bg-white rounded-lg shadow-sm border border-amber-200 h-full flex items-center justify-center">
          <canvas
            ref={canvasRef}
            width={400}
            height={400}
            className="border border-gray-300 rounded max-w-full max-h-full"
            style={{
              aspectRatio: '1/1',
              width: 'auto',
              height: 'auto',
              maxWidth: '100%',
              maxHeight: '100%'
            }}
          />
        </div>
      </div>

      {/* Status Bar */}
      <div className="bg-amber-100 border-t border-amber-200 p-3">
        <div className={`text-sm flex items-center gap-2 ${getStatusColor()}`}>
          {isExecuting && (
            <div className="animate-spin h-3 w-3 border-2 border-blue-600 border-t-transparent rounded-full"></div>
          )}
          <span>{getStatusText()}</span>
        </div>

        {!hasStartNode && nodes.length > 0 && (
          <div className="text-xs text-amber-600 mt-1">
            Add a Start Node to begin execution
          </div>
        )}

        {hasStartNode && nodes.length > 1 && !isExecuting && (
          <div className="text-xs text-amber-600 mt-1">
            Flow ready with {nodes.length} nodes, {edges.length} connections
          </div>
        )}
      </div>
    </div>
  );
};