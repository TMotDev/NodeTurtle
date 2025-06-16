import { createFileRoute } from '@tanstack/react-router'
import {
  Background,
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from '@xyflow/react'
import { useCallback, useRef, useState } from 'react'
import type {
  Edge,
  Node,
  OnConnect,
  OnEdgesChange,
  OnNodesChange,
} from '@xyflow/react'
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { DnDProvider, useDnD } from '@/hooks/DnDContext'
import NodeBase from '@/components/baseNode'
import NodeSiderbar from '@/components/nodeSiderbar'

export const Route = createFileRoute('/new')({
  component: Flow,
})

let id = 0
const getId = () => `dndnode_${id++}`

const NODE_TYPES = {
  start: { label: 'Start', color: 'bg-green-500', executable: true },
  move: { label: 'Process', color: 'bg-blue-500', executable: true },
}

// TODO: nodeData types
const NODE_EXECUTORS = {
  start: (nodeData: any) => {
    console.log('Executing Start Node:', nodeData)
    return { success: true, output: 'Started' }
  },
  move: (nodeData: any) => {
    console.log('Executing Move Node:', nodeData)

    return {
      success: true,
      output: `Processed: ${nodeData.value || 'default'}`,
    }
  },
}

const initialNodes: Array<Node> = [
  {
    id: '1',
    type: 'nodeBase',
    position: { x: 300, y: 300 },
    data: {},
  },
]

const initialEdges: Array<Edge> = []

function FlowEditor() {
  const [nodes, setNodes] = useNodesState(initialNodes)
  const [edges, setEdges] = useEdgesState(initialEdges)

  const {
    screenToFlowPosition,
    getIntersectingNodes,
    deleteElements,
    getNodes,
    getEdges,
    setViewport,
    getViewport,
  } = useReactFlow()

  const [type, setType] = useDnD()
  const nodeTypes = {
    nodeBase: NodeBase,
  }

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [setNodes],
  )
  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [setEdges],
  )
  const onConnect: OnConnect = useCallback(
    (connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges],
  )

  const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const onNodeContextMenu = useCallback(
    (event:React.MouseEvent, node:Node) => {
      event.preventDefault()



    },
    [],
  )

  const onDrop = useCallback(
    (event: { preventDefault: () => void; clientX: any; clientY: any }) => {
      event.preventDefault()

      if (!type) {
        return
      }

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })
      const newNode = {
        id: getId(),
        type,
        position,
        data: { label: `${type} node` },
      }

      setNodes((nds) => nds.concat(newNode))
    },
    [screenToFlowPosition, type],
  )

  const onDragStart = (event: React.DragEvent<HTMLDivElement>) => {
    const nodeType = event.dataTransfer.getData('text/plain')
    setType(nodeType)
    event.dataTransfer.setData('text/plain', nodeType)
    event.dataTransfer.effectAllowed = 'move'
  }

  return (
    <SidebarProvider>
      <NodeSiderbar />
      <main className="w-screen h-screen">
        <SidebarTrigger />
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onDrop={onDrop}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onNodeContextMenu={onNodeContextMenu}
          fitView
          nodeTypes={nodeTypes}
          panOnScroll
          panOnDrag={[1, 2]}
          selectionOnDrag
        >
          <Background />
        </ReactFlow>
      </main>
    </SidebarProvider>
  )
}

function Flow() {
  return (
    <ReactFlowProvider>
      <DnDProvider>
        <FlowEditor />
      </DnDProvider>
    </ReactFlowProvider>
  )
}
