import React, { useCallback, useMemo, useEffect } from 'react'
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  MarkerType,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { FileConnection } from '../types'
import { cn } from '../lib/utils'

interface GraphVisualizationProps {
  connections: FileConnection[]
  className?: string
}

export function GraphVisualization({ connections, className }: GraphVisualizationProps) {
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    const nodeMap = new Map<string, Node>()
    const edges: Edge[] = []
    
    const targetFiles = new Set<string>()
    const sourceFiles = new Set<string>()

    connections.forEach((conn) => {
      const fromId = conn.from || conn.fromFile
      const toId = conn.to || conn.toFile
      
      if (fromId) {
        sourceFiles.add(fromId)
        targetFiles.add(toId)
      }
    })

    connections.forEach((conn, index) => {
      const fromId = conn.from || conn.fromFile
      const toId = conn.to || conn.toFile

      if (!nodeMap.has(fromId)) {
        const isOrphaned = !targetFiles.has(fromId)
        nodeMap.set(fromId, {
          id: fromId,
          data: { label: conn.fromFile || fromId },
          position: { x: 0, y: 0 },
          style: {
            background: isOrphaned ? '#f97316' : '#1e293b',
            color: '#f8fafc',
            border: '1px solid #334155',
            borderRadius: '8px',
            padding: '10px',
            fontSize: '12px',
            minWidth: '120px',
          },
        })
      }

      if (!nodeMap.has(toId)) {
        const isOrphaned = !sourceFiles.has(toId)
        nodeMap.set(toId, {
          id: toId,
          data: { label: conn.toFile || toId },
          position: { x: 0, y: 0 },
          style: {
            background: isOrphaned ? '#f97316' : '#1e293b',
            color: '#f8fafc',
            border: '1px solid #334155',
            borderRadius: '8px',
            padding: '10px',
            fontSize: '12px',
            minWidth: '120px',
          },
        })
      }

      edges.push({
        id: `e${fromId}-${toId}-${index}`,
        source: fromId,
        target: toId,
        type: 'smoothstep',
        animated: conn.type === 'import',
        style: {
          stroke: conn.type === 'external' ? '#ef4444' : '#3b82f6',
          strokeWidth: 2,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: conn.type === 'external' ? '#ef4444' : '#3b82f6',
        },
        label: conn.type,
        labelStyle: {
          fontSize: '10px',
          fill: '#94a3b8',
        },
      })
    })

    const allFilePaths = Array.from(nodeMap.keys())
    const folderNodes = buildFolderTree(allFilePaths)
    folderNodes.forEach(node => {
      if (!nodeMap.has(node.id)) {
        nodeMap.set(node.id, node)
      }
    })

    const nodes = Array.from(nodeMap.values())
    applyTreeLayout(nodes, edges)

    return {
      nodes,
      edges,
    }
  }, [connections])

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  useEffect(() => {
    setNodes(initialNodes)
    setEdges(initialEdges)
  }, [initialNodes, initialEdges, setNodes, setEdges])

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  )

  return (
    <div className={cn('w-full h-full', className)}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
        className="bg-background"
      >
        <Background color="#334155" gap={16} />
        <Controls />
        <MiniMap
          nodeColor="#1e293b"
          nodeStrokeColor="#334155"
          maskColor="rgba(15, 23, 42, 0.6)"
        />
      </ReactFlow>
    </div>
  )
}

function buildFolderTree(filePaths: string[]): Node[] {
  const folderNodes = new Map<string, Node>()
  const filePathsSet = new Set(filePaths)
  
  filePaths.forEach(path => {
    const parts = path.split('/')
    for (let i = 0; i < parts.length - 1; i++) {
      const folderPath = parts.slice(0, i + 1).join('/')
      if (!filePathsSet.has(folderPath) && !folderNodes.has(folderPath)) {
        folderNodes.set(folderPath, {
          id: folderPath,
          data: { label: parts[i] },
          position: { x: 0, y: 0 },
          style: {
            background: '#facc15',
            color: '#0f172a',
            border: '1px solid #eab308',
            borderRadius: '8px',
            padding: '10px',
            fontSize: '12px',
            fontWeight: 'bold',
            minWidth: '100px',
          },
        })
      }
    }
  })
  
  return Array.from(folderNodes.values())
}

function applyTreeLayout(nodes: Node[], edges: Edge[]) {
  const rootNodes: Node[] = []
  const childrenMap = new Map<string, Node[]>()
  
  nodes.forEach(node => {
    const parts = node.id.split('/')
    if (parts.length === 1) {
      rootNodes.push(node)
    } else {
      const parentPath = parts.slice(0, -1).join('/')
      if (!childrenMap.has(parentPath)) {
        childrenMap.set(parentPath, [])
      }
      childrenMap.get(parentPath)!.push(node)
    }
  })
  
  const horizontalSpacing = 280
  const verticalSpacing = 100
  
  function layoutNodes(currentNodes: Node[], depth: number, startY: number): number {
    let yOffset = startY
    
    currentNodes.forEach(node => {
      node.position.x = depth * horizontalSpacing
      node.position.y = yOffset
      
      const children = childrenMap.get(node.id)
      let childrenHeight = 0
      if (children && children.length > 0) {
        childrenHeight = layoutNodes(children, depth + 1, yOffset)
        yOffset += childrenHeight
        yOffset += verticalSpacing / 2
      } else {
        yOffset += verticalSpacing
      }
    })
    
    return yOffset - startY
  }
  
  layoutNodes(rootNodes, 0, 50)
}
