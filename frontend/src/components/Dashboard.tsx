import React from 'react'
import { Sidebar, SidebarHeader, SidebarContent, SidebarFooter } from './ui/sidebar'
import { FileTree } from './FileTree'
import { GraphVisualization } from './GraphVisualization'
import { SelectDirectory, ScanRepository, GetFileConnections } from '../../wailsjs/go/main/App'
import { ArrowLeft } from 'lucide-react'
import { Button } from './ui/button'
import { FileConnection } from '../types'

interface FileInfo {
  name: string
  path: string
  isDir: boolean
  children?: FileInfo[]
}

interface DashboardProps {
  repoPath: string
  onBack: () => void
}

export function Dashboard({ repoPath, onBack }: DashboardProps) {
  const [fileTree, setFileTree] = React.useState<FileInfo[]>([])
  const [connections, setConnections] = React.useState<FileConnection[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [showGraph, setShowGraph] = React.useState(true)

  React.useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        setError(null)

        const [tree, conns] = await Promise.all([
          ScanRepository(repoPath),
          GetFileConnections(repoPath),
        ])

        if (tree) {
          setFileTree([tree])
        }
        setConnections(conns)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load repository')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [repoPath])

  const handleSelectFile = (file: FileInfo) => {
    console.log('Selected file:', file)
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={onBack}
                className="h-8 w-8 shrink-0"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-semibold truncate">{repoPath}</span>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <div className="mb-4 p-2 rounded-md bg-muted">
            <div className="flex gap-2">
              <Button
                variant={showGraph ? 'default' : 'ghost'}
                size="sm"
                className="flex-1"
                onClick={() => setShowGraph(true)}
              >
                Graph
              </Button>
              <Button
                variant={!showGraph ? 'default' : 'ghost'}
                size="sm"
                className="flex-1"
                onClick={() => setShowGraph(false)}
              >
                Tree
              </Button>
            </div>
          </div>
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading...</div>
          ) : error ? (
            <div className="text-sm text-destructive">{error}</div>
          ) : fileTree.length > 0 ? (
            <FileTree files={fileTree} onSelectFile={handleSelectFile} />
          ) : (
            <div className="text-sm text-muted-foreground">No files found</div>
          )}
        </SidebarContent>
        <SidebarFooter>
          <div className="text-xs text-muted-foreground space-y-1">
            <div>{fileTree.length > 0 ? `${countFiles(fileTree)} files` : ''}</div>
            <div>{connections.length} connections</div>
          </div>
        </SidebarFooter>
      </Sidebar>
      <div className="flex-1">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-sm text-muted-foreground">Loading visualization...</div>
          </div>
        ) : showGraph ? (
          <GraphVisualization connections={connections} className="h-full" />
        ) : (
          <div className="p-6 h-full">
            <div className="h-full rounded-lg border bg-card p-8 flex items-center justify-center">
              <div className="text-center">
                <h2 className="text-2xl font-semibold mb-2">File Tree View</h2>
                <p className="text-muted-foreground">
                  Navigate files in the sidebar to explore the repository structure
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function countFiles(files: FileInfo[]): number {
  let count = 0
  files.forEach((file) => {
    count++
    if (file.children) {
      count += countFiles(file.children)
    }
  })
  return count
}
