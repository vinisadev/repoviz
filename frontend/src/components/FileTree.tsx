import React, { useState, useEffect } from 'react'
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
  selectedFile?: FileInfo | null
}

interface FileTreeNodeProps {
  file: FileInfo
  level: number
  onSelectFile?: (file: FileInfo) => void
  selectedFile?: FileInfo | null
}

function FileTreeNode({ file, level, onSelectFile, selectedFile }: FileTreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const hasChildren = file.children && file.children.length > 0
  const isSelected = selectedFile && selectedFile.path === file.path && !file.isDir

  const isParentOfSelected = selectedFile && selectedFile.path.startsWith(file.path + '/') && file.isDir

  const shouldExpand = isParentOfSelected || isSelected

  React.useEffect(() => {
    if (shouldExpand && hasChildren) {
      setIsExpanded(true)
    }
  }, [shouldExpand, hasChildren])

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
          isSelected && "bg-primary text-primary-foreground",
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
          <File className={cn(
            "w-4 h-4 mr-2",
            isSelected ? "text-primary-foreground" : "text-gray-500"
          )} />
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
              selectedFile={selectedFile}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function FileTree({ files, onSelectFile, selectedFile }: FileTreeProps) {
  return (
    <div className="text-sm">
      {files.map((file) => (
        <FileTreeNode
          key={file.path}
          file={file}
          level={0}
          onSelectFile={onSelectFile}
          selectedFile={selectedFile}
        />
      ))}
    </div>
  )
}
