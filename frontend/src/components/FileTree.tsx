import React, { useState } from 'react'
import { ChevronRight, ChevronDown, Folder, FolderOpen, File } from 'lucide-react'
import { cn } from '../lib/utils'

interface FileInfo {
  name: string
  path: string
  isDir: boolean
  children?: FileInfo[]
}

interface FileTreeProps {
  files: FileInfo[]
  onSelectFile?: (file: FileInfo) => void
}

interface FileTreeNodeProps {
  file: FileInfo
  level: number
  onSelectFile?: (file: FileInfo) => void
}

function FileTreeNode({ file, level, onSelectFile }: FileTreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const hasChildren = file.children && file.children.length > 0

  const handleClick = () => {
    if (hasChildren) {
      setIsExpanded(!isExpanded)
    } else if (onSelectFile) {
      onSelectFile(file)
    }
  }

  const ChevronIcon = isExpanded ? ChevronDown : ChevronRight
  const FolderIcon = isExpanded ? FolderOpen : Folder

  return (
    <div>
      <div
        className={cn(
          "flex items-center py-1.5 px-2 rounded-sm cursor-pointer hover:bg-accent hover:text-accent-foreground",
          level > 0 && "ml-4"
        )}
        style={{ marginLeft: `${level * 12}px` }}
        onClick={handleClick}
      >
        <ChevronIcon className={cn(
          "w-4 h-4 mr-1",
          !hasChildren && "invisible"
        )} />
        {file.isDir ? (
          <FolderIcon className="w-4 h-4 mr-2 text-blue-500" />
        ) : (
          <File className="w-4 h-4 mr-2 text-gray-500" />
        )}
        <span className="text-sm truncate">{file.name}</span>
      </div>
      {isExpanded && hasChildren && (
        <div>
          {file.children?.map((child) => (
            <FileTreeNode
              key={child.path}
              file={child}
              level={level + 1}
              onSelectFile={onSelectFile}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function FileTree({ files, onSelectFile }: FileTreeProps) {
  return (
    <div className="text-sm">
      {files.map((file) => (
        <FileTreeNode
          key={file.path}
          file={file}
          level={0}
          onSelectFile={onSelectFile}
        />
      ))}
    </div>
  )
}
