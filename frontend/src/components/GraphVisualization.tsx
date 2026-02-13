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
import * as d3 from 'd3-force'

interface GraphVisualizationProps {
  connections: FileConnection[]
  selectedFile?: FileInfo | null
  onFileSelect?: (file: FileInfo) => void
  className?: string
}

interface FileInfo {
  name: string
  path: string
  isDir: boolean
  children?: FileInfo[]
}

export function GraphVisualization({ connections, selectedFile, onFileSelect, className }: GraphVisualizationProps) {
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    const nodeMap = new Map<string, Node>()
    const edges: Edge[] = []

    let filteredConnections = connections

    console.log('GraphVisualization - Total connections:', connections.length)
    console.log('GraphVisualization - Selected file:', selectedFile)

    if (selectedFile && !selectedFile.isDir) {
      const normalizePath = (path: string) => {
        return path.replace(/\\/g, '/')
      }

      const filePath = normalizePath(selectedFile.path)
      console.log('GraphVisualization - Normalized file path:', filePath)

      const relatedFilePaths = new Set<string>()
      relatedFilePaths.add(filePath)

      connections.forEach((conn, idx) => {
        const fromId = normalizePath(conn.from || conn.fromFile)
        const toId = normalizePath(conn.to || conn.toFile)

        console.log(`Connection ${idx}:`, { fromId, toId, filePath })

        if (fromId === filePath) {
          relatedFilePaths.add(toId)
          console.log(`Match found: fromId (${fromId}) === filePath (${filePath}), adding toId:`, toId)
        } else if (toId === filePath) {
          relatedFilePaths.add(fromId)
          console.log(`Match found: toId (${toId}) === filePath (${filePath}), adding fromId:`, fromId)
        }
      })

      console.log('Related file paths:', Array.from(relatedFilePaths))

      filteredConnections = connections.filter((conn) => {
        const fromId = normalizePath(conn.from || conn.fromFile)
        const toId = normalizePath(conn.to || conn.toFile)
        const included = relatedFilePaths.has(fromId) && relatedFilePaths.has(toId)
        console.log(`Filtering connection:`, { fromId, toId, included })
        return included
      })

      console.log('Filtered connections count:', filteredConnections.length)
    }

    filteredConnections.forEach((conn, index) => {
      const fromId = conn.from || conn.fromFile
      const toId = conn.to || conn.toFile

      if (!nodeMap.has(fromId)) {
        const isSelected = selectedFile && (selectedFile.path === fromId || selectedFile.name === fromId)
        nodeMap.set(fromId, {
          id: fromId,
          data: { label: conn.fromFile || fromId },
          position: { x: 0, y: 0 },
          style: {
            background: isSelected ? '#3b82f6' : '#1e293b',
            color: '#f8fafc',
            border: isSelected ? '#60a5fa' : '1px solid #334155',
            borderRadius: '8px',
            padding: '10px',
            fontSize: '12px',
            minWidth: '120px',
            fontWeight: isSelected ? 'bold' : 'normal',
          },
        })
      }

      if (!nodeMap.has(toId)) {
        const isSelected = selectedFile && (selectedFile.path === toId || selectedFile.name === toId)
        nodeMap.set(toId, {
          id: toId,
          data: { label: conn.toFile || toId },
          position: { x: 0, y: 0 },
          style: {
            background: isSelected ? '#3b82f6' : '#1e293b',
            color: '#f8fafc',
            border: isSelected ? '#60a5fa' : '1px solid #334155',
            borderRadius: '8px',
            padding: '10px',
            fontSize: '12px',
            minWidth: '120px',
            fontWeight: isSelected ? 'bold' : 'normal',
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

    const nodes = Array.from(nodeMap.values())

    if (nodes.length > 0) {
      const width = 1200
      const height = 800
      const simulation = d3.forceSimulation(nodes as d3.SimulationNodeDatum[])
        .force('charge', d3.forceManyBody().strength(-400))
        .force('link', d3.forceLink(edges).distance(200).id((d: any) => d.id))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collision', d3.forceCollide().radius(100))
        .stop()

      simulation.tick(300)

      nodes.forEach((node) => {
        node.position.x = (node as any).x || 0
        node.position.y = (node as any).y || 0
      })
    }

    return {
      nodes,
      edges,
    }
  }, [connections, selectedFile])

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

  const onNodeClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.stopPropagation()

      const filePath = node.id
      const fileName = node.data.label as string

      const fileInfo: FileInfo = {
        name: fileName,
        path: filePath,
        isDir: false,
      }

      console.log('GraphVisualization - Node clicked:', { filePath, fileName, fileInfo })

      if (onFileSelect) {
        onFileSelect(fileInfo)
      }
    },
    [onFileSelect]
  )

  if (nodes.length === 0 && selectedFile) {
    return (
      <div className={cn('w-full h-full flex items-center justify-center', className)}>
        <div className="text-center">
          <p className="text-muted-foreground">No connections found for this file</p>
        </div>
      </div>
    )
  }

  if (!selectedFile) {
    return (
      <div className={cn('w-full h-full flex items-center justify-center', className)}>
        <div className="text-center">
          <p className="text-muted-foreground">Select a file from the sidebar to view its connections</p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('w-full h-full', className)}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
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
