"use client"

import { useState } from "react"
import { FileUploadZone } from "@/components/file-upload-zone"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Download, Loader2 } from "lucide-react"
import { processBankFiles } from "@/lib/excel-processor"

export default function BankPage() {
  const [reckonFile, setReckonFile] = useState<File | null>(null)
  const [bankFile, setBankFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const handleProcess = async () => {
    if (!reckonFile || !bankFile) return

    setIsProcessing(true)
    try {
      await processBankFiles(reckonFile, bankFile)
    } catch (error) {
      console.error("Error processing files:", error)
    } finally {
      setIsProcessing(false)
    }
  }

  const canProcess = reckonFile && bankFile && !isProcessing

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Bank Reconciliation</h1>
        <p className="text-muted-foreground">Upload your Reckon and Bank files to generate a reconciled Excel report</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Upload Files</CardTitle>
            <CardDescription>Select your Reckon and Bank Excel files for processing</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <FileUploadZone
              title="Reckon File"
              instruction="Upload your Reckon Excel file (.xlsx or .xls format)"
              onFileSelect={setReckonFile}
            />

            <FileUploadZone
              title="Bank File"
              instruction="Upload your Bank statement Excel file (.xlsx or .xls format)"
              onFileSelect={setBankFile}
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
                <div className="text-muted-foreground">Please upload both Reckon and Bank files to continue</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
