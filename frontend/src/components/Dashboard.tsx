import React from 'react'
import { Sidebar, SidebarHeader, SidebarContent, SidebarFooter } from './ui/sidebar'
import { FileTree } from './FileTree'
import { SelectDirectory, ScanRepository } from '../../wailsjs/go/main/App'
import { ArrowLeft } from 'lucide-react'
import { Button } from './ui/button'

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
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    async function loadFileTree() {
      try {
        setLoading(true)
        setError(null)
        const tree = await ScanRepository(repoPath)
        if (tree) {
          setFileTree([tree])
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load repository')
      } finally {
        setLoading(false)
      }
    }

    loadFileTree()
  }, [repoPath])

  const handleSelectFile = (file: FileInfo) => {
    console.log('Selected file:', file)
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="h-8 w-8"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-semibold truncate">{repoPath}</span>
          </div>
        </SidebarHeader>
        <SidebarContent>
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
          <div className="text-xs text-muted-foreground">
            {fileTree.length > 0 ? `${countFiles(fileTree)} items` : ''}
          </div>
        </SidebarFooter>
      </Sidebar>
      <div className="flex-1 p-6">
        <div className="h-full rounded-lg border bg-card p-8 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-semibold mb-2">Repository Visualization</h2>
            <p className="text-muted-foreground">
              Select a file from the sidebar to view its contents and connections
            </p>
          </div>
        </div>
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
