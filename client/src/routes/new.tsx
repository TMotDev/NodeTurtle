import { createFileRoute } from '@tanstack/react-router'
import {
  Background,
  ReactFlow,
  ReactFlowProvider,
  SelectionMode,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from '@xyflow/react'
import { useCallback, useState } from 'react'
import type {
  Edge,
  Node,
  OnConnect,
  OnEdgesChange,
  OnNodesChange,
} from '@xyflow/react'
import { ContextMenu } from '@/components/node-flow/ContextMenu'
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { DnDProvider, useDnD } from '@/hooks/DnDContext'
import NodeBase from '@/components/node-flow/baseNode'
import NodeSiderbar from '@/components/node-flow/NodeSiderbar'
import { DevTools } from '@/components/devtools'

export const Route = createFileRoute('/new')({
  component: Flow,
})

let id = 0
const getId = () => `n_${id++}`

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
  const [contextMenu, setContextMenu] = useState<{
    id: string
    top: number
    left: number
  } | null>(null)
  const [selectionContextMenu, setSelectionContextMenu] = useState<{
    top: number
    left: number
  } | null>(null)

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

  const duplicateNode = useCallback(
    (nodeId: string) => {
      const node = getNodes().find((n) => n.id === nodeId)
      const selectedNodes = getNodes().filter((n) => n.selected)

      // check if nodes are selected using shift button
      if (selectedNodes.length > 1) {
        duplicateSelection()
        return
      }

      if (node) {
        const newNode = {
          ...node,
          id: getId(),
          position: {
            x: node.position.x + 50,
            y: node.position.y + 50,
          },
          selected: true,
        }
        setNodes((nds) =>
          nds.map((n) => ({ ...n, selected: false })).concat(newNode),
        )
      }
    },
    [getNodes, setNodes],
  )

  const deleteNode = useCallback(
    (nodeId: string) => {
      const selectedNodes = getNodes().filter((n) => n.selected)

      if (selectedNodes.length > 1) {
        deleteSelection()
        return
      }

      deleteElements({ nodes: [{ id: nodeId }] })
    },
    [deleteElements],
  )

  const deleteSelection = useCallback(() => {
    const selectedNodes = getNodes().filter((n) => n.selected)
    const selectedEdges = getEdges().filter((e) => e.selected)
    deleteElements({ nodes: selectedNodes, edges: selectedEdges })
    setSelectionContextMenu(null)
  }, [getNodes, getEdges, deleteElements])

  const duplicateSelection = useCallback(() => {
    const selectedNodes = getNodes().filter((n) => n.selected)
    const selectedNodeIds = new Set(selectedNodes.map((n) => n.id))
    const selectedEdges = getEdges().filter(
      (edge) =>
        selectedNodeIds.has(edge.source) && selectedNodeIds.has(edge.target),
    )

    if (selectedNodes.length === 0) return

    const nodeIdMap: Record<string, string> = {}
    const newNodes = selectedNodes.map((node) => {
      const newId = getId()
      nodeIdMap[node.id] = newId
      return {
        ...node,
        id: newId,
        position: { x: node.position.x + 50, y: node.position.y + 50 },
        selected: true,
      }
    })

    const newEdges = selectedEdges.map((edge) => ({
      ...edge,
      id: `e${nodeIdMap[edge.source]}-${nodeIdMap[edge.target]}`,
      source: nodeIdMap[edge.source],
      target: nodeIdMap[edge.target],
      selected: true,
    }))

    setNodes((nds) => [
      ...nds.map((n) => ({ ...n, selected: false })),
      ...newNodes,
    ])
    setEdges((eds) => [
      ...eds.map((e) => ({ ...e, selected: false })),
      ...newEdges,
    ])
    setSelectionContextMenu(null)
  }, [getNodes, getEdges, setNodes, setEdges])

  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.preventDefault()
      setSelectionContextMenu(null)
      setContextMenu({
        id: node.id,
        top: event.clientY,
        left: event.clientX,
      })
    },
    [setContextMenu],
  )

  const onSelectionContextMenu = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault()
      setContextMenu(null)
      setSelectionContextMenu({
        top: event.clientY,
        left: event.clientX,
      })
    },
    [setSelectionContextMenu],
  )

  const onPaneClick = useCallback(() => {
    setContextMenu(null)
    setSelectionContextMenu(null)
  }, [])

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
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onDrop={onDrop}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onNodeContextMenu={onNodeContextMenu}
          onPaneClick={onPaneClick}
          onSelectionContextMenu={onSelectionContextMenu}
          fitView
          panOnScroll
          panOnDrag={[1, 2]}
          selectionOnDrag
          selectionMode={SelectionMode.Partial}
          multiSelectionKeyCode={'Shift'}
        >
          <Background />
          <DevTools position="top-left" />
        </ReactFlow>
      </main>
      {contextMenu && (
        <ContextMenu
          onClose={() => setContextMenu(null)}
          onDuplicate={() => duplicateNode(contextMenu.id)}
          onDelete={() => deleteNode(contextMenu.id)}
          data={contextMenu}
        />
      )}
      {selectionContextMenu && (
        <ContextMenu
          onClose={() => setSelectionContextMenu(null)}
          onDuplicate={duplicateSelection}
          onDelete={deleteSelection}
          data={selectionContextMenu}
        />
      )}
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
