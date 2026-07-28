import React, { useState, useRef } from "react"
import {
  FileText,
  FileUp,
  RotateCcw,
  Check,
  ChevronRight,
  AlertCircle,
  XCircle,
  ScrollText,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { ChangelogDialog } from "@/components/app/ChangelogDialog"

type DragFileType = "pdf" | "csv" | "unknown"

function detectDragFileType(e: React.DragEvent): DragFileType {
  const items = e.dataTransfer?.items
  if (!items) return "unknown"
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    if (item.kind !== "file") continue
    if (item.type === "application/pdf") return "pdf"
    if (item.type === "text/csv" || item.type === "application/csv")
      return "csv"
  }
  return "unknown"
}

function resolveDroppedFileType(file: File): DragFileType {
  const name = file.name.toLowerCase()
  if (file.type === "application/pdf" || name.endsWith(".pdf")) return "pdf"
  if (
    file.type === "text/csv" ||
    file.type === "application/csv" ||
    name.endsWith(".csv")
  )
    return "csv"
  return "unknown"
}

interface DropzoneProps {
  kind: "pdf" | "csv"
  file: File | null
  csvRowCount?: number
  csvColCount?: number
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  inputId: string
  dragFileType: DragFileType | null
  error: string | null
  onClearError: () => void
}

function Dropzone({
  kind,
  file,
  csvRowCount,
  csvColCount,
  onUpload,
  inputId,
  dragFileType,
  error,
  onClearError,
}: DropzoneProps) {
  const isPdf = kind === "pdf"
  const dragActive = dragFileType !== null
  const isTarget = dragFileType === kind
  const isUnknownDrag = dragFileType === "unknown"

  return (
    <div
      className={cn(
        "relative flex flex-col items-center gap-3 rounded-lg border p-6 text-center transition-all cursor-pointer overflow-hidden",
        dragActive
          ? isTarget
            ? isPdf
              ? "border-red-400 bg-red-50/60 dark:border-red-500/60 dark:bg-red-950/25"
              : "border-emerald-400 bg-emerald-50/60 dark:border-emerald-500/60 dark:bg-emerald-950/25"
            : isUnknownDrag
              ? "border-dashed border-amber-300/70 bg-amber-50/30 dark:border-amber-500/30 dark:bg-amber-950/10"
              : "border-border/40 bg-muted/30 opacity-40 pointer-events-none"
          : error
            ? "border-destructive/50 bg-destructive/5 dark:bg-destructive/10"
            : file
              ? "border-border bg-background"
              : "border-dashed border-border bg-background hover:border-foreground/20 hover:bg-accent/20"
      )}
      onClick={() => {
        if (!dragActive) {
          onClearError()
          document.getElementById(inputId)?.click()
        }
      }}
    >
      <input
        id={inputId}
        type="file"
        accept={isPdf ? ".pdf" : ".csv"}
        onChange={(e) => {
          onClearError()
          onUpload(e)
        }}
        aria-label={isPdf ? "Upload PDF template" : "Upload CSV dataset"}
        className="absolute inset-0 cursor-pointer opacity-0"
        style={{ zIndex: -1 }}
      />

      {/* Drag overlay */}
      {dragActive && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-[7px] pointer-events-none">
          {isTarget ? (
            <>
              <div
                className={cn(
                  "flex size-11 items-center justify-center rounded-full ring-2",
                  isPdf
                    ? "bg-red-100 text-red-500 ring-red-300 dark:bg-red-900/50 dark:ring-red-600"
                    : "bg-emerald-100 text-emerald-600 ring-emerald-300 dark:bg-emerald-900/50 dark:ring-emerald-600"
                )}
              >
                <FileUp className="size-5" />
              </div>
              <p
                className={cn(
                  "text-sm font-semibold",
                  isPdf
                    ? "text-red-600 dark:text-red-400"
                    : "text-emerald-700 dark:text-emerald-400"
                )}
              >
                Drop {isPdf ? "PDF" : "CSV"} here
              </p>
            </>
          ) : isUnknownDrag ? (
            <>
              <div className="flex size-9 items-center justify-center rounded-full bg-amber-100 text-amber-500 dark:bg-amber-900/40 dark:text-amber-400">
                <FileUp className="size-4" />
              </div>
              <p className="text-xs font-medium text-amber-600 dark:text-amber-400">
                {isPdf ? ".pdf only" : ".csv only"}
              </p>
            </>
          ) : null}
        </div>
      )}

      {/* Content — hidden behind overlay when drag active */}
      <div className={cn("contents", dragActive && "invisible")}>
        {error ? (
          <>
            <div className="flex size-10 items-center justify-center rounded-lg bg-destructive/15 text-destructive dark:bg-destructive/25">
              <AlertCircle className="size-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-destructive">
                Upload failed
              </p>
              <p className="mt-1 max-w-44 text-xs text-muted-foreground">
                {error}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                onClearError()
                document.getElementById(inputId)?.click()
              }}
              className="h-7 gap-1.5 text-xs border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <FileUp className="size-3.5" />
              Try again
            </Button>
          </>
        ) : file ? (
          <>
            <div
              className={cn(
                "flex size-10 items-center justify-center rounded-lg",
                isPdf
                  ? "bg-red-50 text-red-500 dark:bg-red-950/30"
                  : "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30"
              )}
            >
              <FileText className="size-5" />
            </div>
            <div>
              <div className="flex items-center justify-center gap-1.5">
                <span className="max-w-48 truncate text-sm font-medium">
                  {file.name}
                </span>
                <Badge variant="secondary" className="gap-1 px-1.5 text-[10px]">
                  <Check className="size-2.5" />
                  Ready
                </Badge>
              </div>
              {!isPdf && csvRowCount !== undefined && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {csvRowCount} rows · {csvColCount} columns
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                document.getElementById(inputId)?.click()
              }}
              className="h-7 gap-1.5 text-xs text-muted-foreground"
            >
              <RotateCcw className="size-3" />
              Replace
            </Button>
          </>
        ) : (
          <>
            <div
              className={cn(
                "flex size-10 items-center justify-center rounded-lg",
                isPdf
                  ? "bg-red-50/80 text-red-400 dark:bg-red-950/25 dark:text-red-500"
                  : "bg-emerald-50/80 text-emerald-500 dark:bg-emerald-950/25 dark:text-emerald-500"
              )}
            >
              <FileText className="size-5" />
            </div>
            <div>
              <p className="text-sm font-medium">
                {isPdf ? "Template PDF" : "CSV Dataset"}
              </p>
              <p className="mt-1 max-w-45 text-xs leading-relaxed text-muted-foreground">
                {isPdf
                  ? "Certificate, invoice, or form to merge data into"
                  : "The records — one row becomes one merged document"}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                document.getElementById(inputId)?.click()
              }}
              className="h-7 gap-1.5 text-xs"
            >
              <FileUp className="size-3.5" />
              Choose {isPdf ? ".pdf" : ".csv"}
            </Button>
            <p className="text-[11px] text-muted-foreground/50">
              or drop files here
            </p>
          </>
        )}
      </div>
    </div>
  )
}

interface UploadScreenProps {
  pdfFile: File | null
  csvFileName: string
  csvRows: Record<string, string>[]
  csvHeaders: string[]
  onPdfUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  onCsvUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  onContinue: () => void
}

export function UploadScreen({
  pdfFile,
  csvFileName: _csvFileName,
  csvRows,
  csvHeaders,
  onPdfUpload,
  onCsvUpload,
  onContinue,
}: UploadScreenProps) {
  const [dragFileType, setDragFileType] = useState<DragFileType | null>(null)
  const [pdfError, setPdfError] = useState<string | null>(null)
  const [csvError, setCsvError] = useState<string | null>(null)
  const [globalDropError, setGlobalDropError] = useState<string | null>(null)
  const [changelogOpen, setChangelogOpen] = useState(false)
  const dragCounter = useRef(0)
  const globalErrorTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const ready = !!pdfFile
  const csvFile =
    csvRows.length > 0 ? ({ name: _csvFileName || "data.csv" } as File) : null

  const statusText = !pdfFile
    ? "Upload a PDF template to continue"
    : csvRows.length > 0
      ? "PDF + CSV ready"
      : "PDF ready — CSV optional"

  const showGlobalError = (msg: string) => {
    if (globalErrorTimer.current) clearTimeout(globalErrorTimer.current)
    setGlobalDropError(msg)
    globalErrorTimer.current = setTimeout(() => setGlobalDropError(null), 4000)
  }

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    dragCounter.current++
    if (dragCounter.current === 1) {
      setDragFileType(detectDragFileType(e))
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDragLeave = () => {
    dragCounter.current--
    if (dragCounter.current === 0) {
      setDragFileType(null)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    dragCounter.current = 0
    setDragFileType(null)

    const file = e.dataTransfer.files?.[0]
    if (!file) return

    const fileType = resolveDroppedFileType(file)
    const syntheticEvent = {
      target: { files: e.dataTransfer.files },
    } as unknown as React.ChangeEvent<HTMLInputElement>

    if (fileType === "pdf") {
      setPdfError(null)
      onPdfUpload(syntheticEvent)
    } else if (fileType === "csv") {
      setCsvError(null)
      onCsvUpload(syntheticEvent)
    } else {
      showGlobalError(`"${file.name}" is not a PDF or CSV file`)
    }
  }

  return (
    <div
      className="relative flex flex-1 flex-col items-center justify-center overflow-auto bg-muted/20 p-8"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex w-full max-w-xl flex-col items-center gap-8">
        {/* Header */}
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-3xl font-bold tracking-tight">
            Bulk-merge your dataset into a PDF
          </h1>
          <p className="max-w-sm text-sm text-muted-foreground">
            Upload a template and a CSV, place fields, then export hundreds of
            personalized PDFs.
          </p>
        </div>

        {/* Dropzones */}
        <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
          <Dropzone
            kind="pdf"
            file={pdfFile}
            onUpload={onPdfUpload}
            inputId="pdf-upload"
            dragFileType={dragFileType}
            error={pdfError}
            onClearError={() => setPdfError(null)}
          />
          <Dropzone
            kind="csv"
            file={csvFile}
            csvRowCount={csvRows.length}
            csvColCount={csvHeaders.length}
            onUpload={onCsvUpload}
            inputId="csv-upload"
            dragFileType={dragFileType}
            error={csvError}
            onClearError={() => setCsvError(null)}
          />
        </div>

        {/* Footer */}
        <div className="flex w-full items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{statusText}</span>
            {globalDropError && (
              <span className="flex items-center gap-1 text-xs text-destructive">
                <XCircle className="size-3" />
                {globalDropError}
              </span>
            )}
          </div>
          <Button
            disabled={!ready}
            onClick={onContinue}
            size="sm"
            className="gap-1.5"
          >
            {pdfFile ? "Open editor" : "Upload PDF to start"}
            <ChevronRight className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Changelog button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setChangelogOpen(true)}
        className="absolute bottom-6 right-6 size-8 rounded-lg"
        title="Changelog"
      >
        <ScrollText className="size-4" />
      </Button>

      <ChangelogDialog open={changelogOpen} onOpenChange={setChangelogOpen} />
    </div>
  )
}
