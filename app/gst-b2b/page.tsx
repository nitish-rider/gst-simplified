"use client"

import { useState } from "react"
import { FileUploadZone } from "@/components/file-upload-zone"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Download, Loader2 } from "lucide-react"
import { processGSTB2BFiles } from "@/lib/excel-processor"
import { useToast } from "@/components/ui/use-toast"

export default function GSTB2BPage() {
  const { toast } = useToast()
  const [reckonFile, setReckonFile] = useState<File | null>(null)
  const [gstFile, setGSTFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const handleProcess = async () => {
    if (!reckonFile || !gstFile) return

    setIsProcessing(true)
    try {
      const result = await processGSTB2BFiles(reckonFile, gstFile)
      if (result.success) {
        toast({
          title: "Success",
          description: "Files processed successfully. Your report has been downloaded.",
          variant: "default",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to process files",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const canProcess = reckonFile && gstFile && !isProcessing

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">GST (B2B) Processing</h1>
        <p className="text-muted-foreground">Upload your Reckon and GST files to generate a reconciled Excel report</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Upload Files</CardTitle>
            <CardDescription>Select your Reckon and GST Excel files for processing</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <FileUploadZone
              title="Reckon File"
              instruction="Upload your Reckon Excel file (.xlsx or .xls format)"
              onFileSelect={setReckonFile}
            />

            <FileUploadZone
              title="GST File"
              instruction="Upload your GST Excel file (.xlsx or .xls format)"
              onFileSelect={setGSTFile}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Process & Download</CardTitle>
            <CardDescription>Generate your reconciled Excel report</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center min-h-[300px]">
            <div className="text-center space-y-4">
              {canProcess ? (
                <>
                  <div className="text-green-600 font-medium">✓ Both files uploaded successfully</div>
                  <Button onClick={handleProcess} disabled={isProcessing} size="lg" className="w-full">
                    {isProcessing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Download className="mr-2 h-4 w-4" />
                        Generate & Download Report
                      </>
                    )}
                  </Button>
                </>
              ) : (
                <div className="text-muted-foreground">Please upload both Reckon and GST files to continue</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
