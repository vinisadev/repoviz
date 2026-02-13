import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card'
import { Button } from './components/ui/button'
import { FolderOpen } from 'lucide-react'
import { SelectDirectory, ScanRepository } from '../wailsjs/go/main/App'
import { Dashboard } from './components/Dashboard'

interface FileInfo {
  name: string
  path: string
  isDir: boolean
  children?: FileInfo[]
}

function App() {
  const [selectedPath, setSelectedPath] = useState<string>('')
  const [currentRepo, setCurrentRepo] = useState<string | null>(null)

  const handleSelectDirectory = async () => {
    try {
      const path = await SelectDirectory()
      if (path) {
        setSelectedPath(path)
        setCurrentRepo(path)
      }
    } catch (error) {
      console.error('Failed to select directory:', error)
    }
  }

  const handleBack = () => {
    setCurrentRepo(null)
    setSelectedPath('')
  }

  if (currentRepo) {
    return <Dashboard repoPath={currentRepo} onBack={handleBack} />
  }

  return (
    <div className="flex items-center justify-center h-screen bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Welcome to RepoViz</CardTitle>
          <CardDescription>
            Select a repository directory to visualize your codebase structure
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {selectedPath ? (
            <div className="p-4 rounded-md bg-muted text-sm">
              <p className="font-medium mb-1">Selected Repository:</p>
              <p className="text-muted-foreground break-all">{selectedPath}</p>
            </div>
          ) : (
            <div className="text-center py-8">
              <FolderOpen className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Click the button below to select a repository
              </p>
            </div>
          )}
          <Button
            onClick={handleSelectDirectory}
            className="w-full"
            size="lg"
          >
            <FolderOpen className="mr-2 h-5 w-5" />
            Select Repository
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

export default App
