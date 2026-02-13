export interface FileInfo {
  name: string
  path: string
  isDir: boolean
  children?: FileInfo[]
}

export interface FileConnection {
  from: string
  to: string
  fromFile: string
  toFile: string
  type: string
}
