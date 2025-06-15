import React, { useCallback, useMemo, useRef, useState } from 'react'
import {
  Background,
  Controls,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

// Custom Components
import { Copy, Play, Plus, Save, Trash2, Upload } from 'lucide-react'
import { createFileRoute } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export const Route = createFileRoute('/create')({
  component: Flow,
})

// Node Types Registry
const NODE_TYPES = {
  start: { label: 'Start', color: 'bg-green-500', executable: true },
  process: { label: 'Process', color: 'bg-blue-500', executable: true },
  condition: { label: 'Condition', color: 'bg-yellow-500', executable: true },
  end: { label: 'End', color: 'bg-red-500', executable: true },
  custom: { label: 'Custom', color: 'bg-purple-500', executable: true },
}

// Node execution functions
const NODE_EXECUTORS = {
  start: (nodeData) => {
    console.log('Executing Start Node:', nodeData)
    return { success: true, output: 'Started' }
  },
  process: (nodeData) => {
    console.log('Executing Process Node:', nodeData)
    // Simulate processing
    return {
      success: true,
      output: `Processed: ${nodeData.value || 'default'}`,
    }
  },
  condition: (nodeData) => {
    console.log('Executing Condition Node:', nodeData)
    // Simple condition check
    const result = Math.random() > 0.5
    return {
      success: true,
      output: result ? 'true' : 'false',
      condition: result,
    }
  },
  end: (nodeData) => {
    console.log('Executing End Node:', nodeData)
    return { success: true, output: 'Completed' }
  },
  custom: (nodeData) => {
    console.log('Executing Custom Node:', nodeData)
    return {
      success: true,
      output: `Custom execution: ${nodeData.value || 'custom'}`,
    }
  },
}

// Custom Node Header Component
const NodeHeader = ({ title, nodeType, onDelete }) => (
  <div
    className={`${NODE_TYPES[nodeType]?.color || 'bg-gray-500'} text-white p-2 rounded-t-lg flex justify-between items-center`}
  >
    <span className="font-semibold text-sm">{title}</span>
    <Button
      size="sm"
      variant="ghost"
      className="h-6 w-6 p-0 text-white hover:bg-white/20"
      onClick={onDelete}
    >
      <Trash2 className="h-3 w-3" />
    </Button>
  </div>
)

// TODO: remake with shadcn base node
// Base Custom Node Component
const BaseNode = ({ id, data, selected }) => {
  const { deleteElements } = useReactFlow()

  const handleDelete = useCallback(() => {
    deleteElements({ nodes: [{ id }] })
  }, [id, deleteElements])

  return (
    <Card className={`min-w-[200px] ${selected ? 'ring-2 ring-blue-500' : ''}`}>
      <NodeHeader
        title={data.label || NODE_TYPES[data.type]?.label || 'Node'}
        nodeType={data.type}
        onDelete={handleDelete}
      />
      <CardContent className="p-3">
        <div className="space-y-2">
          <div>
            <Label className="text-xs">Type: {data.type}</Label>
          </div>
          <div>
            <Label className="text-xs">Value</Label>
            <Input
              value={data.value || ''}
              onChange={(e) => data.onChange?.(id, 'value', e.target.value)}
              className="h-7 text-xs"
              placeholder="Enter value..."
            />
          </div>
          {data.description && (
            <div className="text-xs text-gray-600">{data.description}</div>
          )}
        </div>
      </CardContent>

      {/* Custom Handles */}
      <Handle type="target" position={Position.Left} id="left"/>
      <Handle type="source" position={Position.Right} id="right" />

    </Card>
  )
}

// Custom Edge with Delete Button
const CustomEdge = ({ id, sourceX, sourceY, targetX, targetY, selected }) => {
  const { deleteElements } = useReactFlow()

  const handleDelete = useCallback(() => {
    deleteElements({ edges: [{ id }] })
  }, [id, deleteElements])

  const edgePath = `M${sourceX},${sourceY} L${targetX},${targetY}`
  const midX = (sourceX + targetX) / 2
  const midY = (sourceY + targetY) / 2

  return (
    <>
      <path
        id={id}
        className={`react-flow__edge-path ${selected ? 'stroke-blue-500' : 'stroke-gray-400'}`}
        d={edgePath}
        strokeWidth={2}
        fill="none"
      />
      {selected && (
        <foreignObject
          width={20}
          height={20}
          x={midX - 10}
          y={midY - 10}
          className="react-flow__edge-button"
        >
          <Button
            size="sm"
            variant="destructive"
            className="h-5 w-5 p-0 rounded-full"
            onClick={handleDelete}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </foreignObject>
      )}
    </>
  )
}

// Context Menu Component
const ContextMenu = ({
  id,
  top,
  left,
  right,
  bottom,
  onClose,
  onDuplicate,
  onDelete,
}) => (
  <div
    className="bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50 fixed"
    style={{ top, left, right, bottom }}
  >
    <Button
      variant="ghost"
      size="sm"
      className="w-full justify-start px-3 py-1 h-8"
      onClick={() => {
        onDuplicate(id)
        onClose()
      }}
    >
      <Copy className="h-3 w-3 mr-2" />
      Duplicate
    </Button>
    <Button
      variant="ghost"
      size="sm"
      className="w-full justify-start px-3 py-1 h-8 text-red-600 hover:text-red-700"
      onClick={() => {
        onDelete(id)
        onClose()
      }}
    >
      <Trash2 className="h-3 w-3 mr-2" />
      Delete
    </Button>
  </div>
)

// Draggable Node Item
const DragItem = ({ type, label }) => {
  const onDragStart = (event) => {
    event.dataTransfer.setData('application/reactflow', type)
    event.dataTransfer.effectAllowed = 'move'
  }

  return (
    <div
      className={`${NODE_TYPES[type].color} text-white p-2 rounded cursor-grab text-sm font-medium hover:opacity-80`}
      draggable
      onDragStart={onDragStart}
    >
      {label}
    </div>
  )
}

// Main Flow Component
function FlowEditor() {
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [contextMenu, setContextMenu] = useState(null)
  const [executionResults, setExecutionResults] = useState([])
  const [isExecuting, setIsExecuting] = useState(false)
  const reactFlowWrapper = useRef(null)
  const reactFlowInstance = useReactFlow()

  const {
    screenToFlowPosition,
    getIntersectingNodes,
    deleteElements,
    getNodes,
    getEdges,
    setViewport,
    getViewport,
  } = useReactFlow()

  // Node types configuration
  const nodeTypes = useMemo(
    () => ({
      custom: BaseNode,
    }),
    [],
  )

  const edgeTypes = useMemo(
    () => ({
      custom: CustomEdge,
    }),
    [],
  )

  // Prevent cycles
  const isValidConnection = useCallback(
    (connection) => {
      const { source, target } = connection
      if (source === target) return false

      // Simple cycle detection using DFS
      const visited = new Set()
      const stack = [target]

      while (stack.length > 0) {
        const current = stack.pop()
        if (current === source) return false

        if (!visited.has(current)) {
          visited.add(current)
          const outgoingEdges = edges.filter((edge) => edge.source === current)
          stack.push(...outgoingEdges.map((edge) => edge.target))
        }
      }
      return true
    },
    [edges],
  )

  const onConnect = useCallback(
    (params) => {
      if (isValidConnection(params)) {
        setEdges((eds) => addEdge({ ...params, type: 'custom' }, eds))
      }
    },
    [setEdges, isValidConnection],
  )

  // Update node data
  const updateNodeData = useCallback(
    (nodeId, field, value) => {
      setNodes((nds) =>
        nds.map((node) =>
          node.id === nodeId
            ? { ...node, data: { ...node.data, [field]: value } }
            : node,
        ),
      )
    },
    [setNodes],
  )

  // Add nodes with data update capability
  const createNode = useCallback(
    (type, position) => {
      const id = `${type}_${Date.now()}`
      return {
        id,
        type: 'custom',
        position,
        data: {
          type,
          label: NODE_TYPES[type].label,
          value: '',
          onChange: updateNodeData,
        },
      }
    },
    [updateNodeData],
  )

  // Drag and drop handling
  const onDragOver = useCallback((event) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  // TODO: https://reactflow.dev/examples/interaction/drag-and-drop
  // TODO: remove getData, create dnd context
  // TODO: move everything bit by bit
  const onDrop = useCallback(
    (event) => {
      event.preventDefault()
      const type = event.dataTransfer.getData('application/reactflow')

      if (!type || !NODE_TYPES[type]) return

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode = createNode(type, position)
      setNodes((nds) => nds.concat(newNode))
    },
    [screenToFlowPosition, createNode, setNodes],
  )

  // Context menu handling
  const onNodeContextMenu = useCallback((event, node) => {
    event.preventDefault()
    setContextMenu({
      id: node.id,
      top: event.clientY < window.innerHeight - 200 ? event.clientY : undefined,
      left: event.clientX < window.innerWidth - 200 ? event.clientX : undefined,
      right:
        event.clientX >= window.innerWidth - 200
          ? window.innerWidth - event.clientX
          : undefined,
      bottom:
        event.clientY >= window.innerHeight - 200
          ? window.innerHeight - event.clientY
          : undefined,
    })
  }, [])

  const onPaneClick = useCallback(() => setContextMenu(null), [])

  // Duplicate node
  const duplicateNode = useCallback(
    (nodeId) => {
      const node = nodes.find((n) => n.id === nodeId)
      if (node) {
        const newNode = {
          ...node,
          id: `${node.data.type}_${Date.now()}`,
          position: { x: node.position.x + 50, y: node.position.y + 50 },
        }
        setNodes((nds) => [...nds, newNode])
      }
    },
    [nodes, setNodes],
  )

  // Delete node
  const deleteNode = useCallback(
    (nodeId) => {
      deleteElements({ nodes: [{ id: nodeId }] })
    },
    [deleteElements],
  )

  // Copy/Paste functionality
  const [copiedElements, setCopiedElements] = useState(null)

  const copyElements = useCallback(() => {
    const selectedNodes = nodes.filter((node) => node.selected)
    const selectedEdges = edges.filter((edge) => edge.selected)
    setCopiedElements({ nodes: selectedNodes, edges: selectedEdges })
  }, [nodes, edges])

  const pasteElements = useCallback(() => {
    if (!copiedElements) return

    const nodeIdMap = {}
    const newNodes = copiedElements.nodes.map((node) => {
      const newId = `${node.data.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      nodeIdMap[node.id] = newId
      return {
        ...node,
        id: newId,
        position: { x: node.position.x + 50, y: node.position.y + 50 },
        selected: false,
      }
    })

    const newEdges = copiedElements.edges
      .map((edge) => ({
        ...edge,
        id: `edge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        source: nodeIdMap[edge.source],
        target: nodeIdMap[edge.target],
        selected: false,
      }))
      .filter((edge) => edge.source && edge.target)

    setNodes((nds) => [...nds, ...newNodes])
    setEdges((eds) => [...eds, ...newEdges])
  }, [copiedElements, setNodes, setEdges])

  // Keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.ctrlKey || event.metaKey) {
        if (event.key === 'c') {
          event.preventDefault()
          copyElements()
        } else if (event.key === 'v') {
          event.preventDefault()
          pasteElements()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [copyElements, pasteElements])

  // Save and restore
  const saveFlow = useCallback(() => {
    const flow = {
      nodes: getNodes(),
      edges: getEdges(),
      viewport: getViewport(),
    }
    localStorage.setItem('reactflow-foundation', JSON.stringify(flow))
    alert('Flow saved!')
  }, [getNodes, getEdges, getViewport])

  const restoreFlow = useCallback(() => {
    const saved = localStorage.getItem('reactflow-foundation')
    if (saved) {
      const flow = JSON.parse(saved)
      setNodes(flow.nodes || [])
      setEdges(flow.edges || [])
      setViewport(flow.viewport)
    }
  }, [setNodes, setEdges, setViewport])

  // Flow execution logic
  const executeFlow = useCallback(async () => {
    setIsExecuting(true)
    setExecutionResults([])

    // Find start nodes
    const startNodes = nodes.filter((node) => node.data.type === 'start')
    if (startNodes.length === 0) {
      alert('No start node found!')
      setIsExecuting(false)
      return
    }

    const results = []

    // Execute from each start node
    for (const startNode of startNodes) {
      await executeFromNode(startNode.id, results, new Set())
    }

    setExecutionResults(results)
    setIsExecuting(false)
  }, [nodes, edges])

  const executeFromNode = async (nodeId, results, visited) => {
    if (visited.has(nodeId)) return
    visited.add(nodeId)

    const node = nodes.find((n) => n.id === nodeId)
    if (!node) return

    const executor = NODE_EXECUTORS[node.data.type]
    if (executor) {
      const result = executor(node.data)
      results.push({
        nodeId,
        nodeType: node.data.type,
        nodeLabel: node.data.label,
        result,
        timestamp: new Date().toLocaleTimeString(),
      })

      // Simulate execution delay
      await new Promise((resolve) => setTimeout(resolve, 500))

      // Find next nodes
      const outgoingEdges = edges.filter((edge) => edge.source === nodeId)

      for (const edge of outgoingEdges) {
        // Handle conditional execution
        if (node.data.type === 'condition' && result.condition !== undefined) {
          if (
            (edge.sourceHandle === 'true' && result.condition) ||
            (edge.sourceHandle === 'false' && !result.condition) ||
            !edge.sourceHandle
          ) {
            await executeFromNode(edge.target, results, visited)
          }
        } else {
          await executeFromNode(edge.target, results, visited)
        }
      }
    }
  }

  return (
    <div className="h-screen flex">
      {/* Sidebar */}
      <div className="w-64 bg-gray-50 p-4 border-r">
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Node Types</h3>
            <div className="space-y-2">
              {Object.entries(NODE_TYPES).map(([type, config]) => (
                <DragItem key={type} type={type} label={config.label} />
              ))}
            </div>
          </div>

          <div className="space-y-2 pt-4 border-t">
            <Button onClick={saveFlow} size="sm" className="w-full">
              <Save className="h-4 w-4 mr-2" />
              Save Flow
            </Button>
            <Button
              onClick={restoreFlow}
              size="sm"
              variant="outline"
              className="w-full"
            >
              <Upload className="h-4 w-4 mr-2" />
              Load Flow
            </Button>
            <Button
              onClick={executeFlow}
              size="sm"
              variant="secondary"
              className="w-full"
              disabled={isExecuting}
            >
              <Play className="h-4 w-4 mr-2" />
              {isExecuting ? 'Executing...' : 'Execute Flow'}
            </Button>
          </div>

          {/* Execution Results */}
          {executionResults.length > 0 && (
            <div className="pt-4 border-t">
              <h4 className="font-semibold mb-2 text-sm">Execution Results</h4>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {executionResults.map((result, idx) => (
                  <div
                    key={idx}
                    className="text-xs p-2 bg-white rounded border"
                  >
                    <div className="font-medium">{result.nodeLabel}</div>
                    <div className="text-gray-600">{result.result.output}</div>
                    <div className="text-gray-400">{result.timestamp}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Flow Area */}
      <div className="flex-1" ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onNodeContextMenu={onNodeContextMenu}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          defaultMarkerColor="#374151"
          isValidConnection={isValidConnection}
          fitView
        >
          <Background />
          <Controls />
        </ReactFlow>

        {/* Context Menu */}
        {contextMenu && (
          <ContextMenu
            {...contextMenu}
            onClose={() => setContextMenu(null)}
            onDuplicate={duplicateNode}
            onDelete={deleteNode}
          />
        )}
      </div>
    </div>
  )
}

function Flow() {
  return (
    <ReactFlowProvider>
      <FlowEditor />
    </ReactFlowProvider>
  )
}
