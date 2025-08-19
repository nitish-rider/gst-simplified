"use client"

import { useCallback, useState } from "react"
import { useDropzone } from "react-dropzone"
import { Upload, File, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface FileUploadZoneProps {
  title: string
  instruction: string
  onFileSelect: (file: File | null) => void
  accept?: Record<string, string[]>
}

export function FileUploadZone({ title, instruction, onFileSelect, accept }: FileUploadZoneProps) {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0]
        setUploadedFile(file)
        onFileSelect(file)
      }
    },
    [onFileSelect],
  )

  const removeFile = () => {
    setUploadedFile(null)
    onFileSelect(null)
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: accept || {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
    },
    maxFiles: 1,
  })

  return (
    <div className="space-y-2">
      <h3 className="text-lg font-semibold">{title}</h3>
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50",
        )}
      >
        <input {...getInputProps()} />
        {uploadedFile ? (
          <div className="flex items-center justify-center space-x-2">
            <File className="h-8 w-8 text-primary" />
            <div className="flex-1 text-left min-w-0">
              <p className="font-medium truncate">{uploadedFile.name}</p>
              <p className="text-sm text-muted-foreground">{(uploadedFile.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                removeFile()
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
            <div>
              <p className="text-lg font-medium">
                {isDragActive ? "Drop the file here" : "Drag & drop your Excel file here"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">or click to browse files</p>
            </div>
          </div>
        )}
      </div>
      <p className="text-sm text-muted-foreground">{instruction}</p>
    </div>
  )
}
