import { useState } from "react"
import {
  Download,
  FileText,
  Archive,
  Loader2,
  CheckCircle2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

type ExportMode = "combined" | "zip"

interface ExportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  csvHeaders: string[]
  csvRows: Record<string, string>[]
  pdfFile: File | null
  filenameColumn: string
  onFilenameColumnChange: (col: string) => void
  isProcessing: boolean
  processingProgress: { current: number; total: number }
  processingMessage: string
  onDownloadCombined: () => void
  onDownloadZip: () => void
}

export function ExportDialog({
  open,
  onOpenChange,
  csvHeaders,
  csvRows,
  pdfFile,
  filenameColumn,
  onFilenameColumnChange,
  isProcessing,
  processingProgress,
  processingMessage,
  onDownloadCombined,
  onDownloadZip,
}: ExportDialogProps) {
  const [mode, setMode] = useState<ExportMode>("zip")

  const isDone =
    !isProcessing &&
    processingProgress.current > 0 &&
    processingProgress.current === processingProgress.total

  const isRunning = isProcessing
  const isConfig = !isRunning && !isDone

  const progressPct =
    processingProgress.total > 0
      ? Math.round(
          (processingProgress.current / processingProgress.total) * 100
        )
      : 0

  const sampleName =
    filenameColumn && csvRows[0]?.[filenameColumn]
      ? String(csvRows[0][filenameColumn])
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "")
      : "record"

  const handleExport = () => {
    if (mode === "combined") {
      onDownloadCombined()
    } else {
      onDownloadZip()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-115">
        {isConfig && csvRows.length > 0 && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Download className="size-4" />
                Export merged PDFs
              </DialogTitle>
              <DialogDescription>
                Generating{" "}
                <strong className="text-foreground">
                  {csvRows.length} documents
                </strong>{" "}
                from {pdfFile?.name ?? "template"}.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-4 py-2">
              {/* Format selector */}
              <div className="flex flex-col gap-2">
                <Label>Output format</Label>
                <div className="flex flex-col gap-2">
                  {/* Single PDF option */}
                  <button
                    type="button"
                    onClick={() => setMode("combined")}
                    className={cn(
                      "flex gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-accent/50",
                      mode === "combined"
                        ? "border-primary bg-primary/5"
                        : "border-border bg-background"
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex size-4 shrink-0 rounded-full border-2 items-center justify-center",
                        mode === "combined"
                          ? "border-primary"
                          : "border-muted-foreground/40"
                      )}
                    >
                      {mode === "combined" && (
                        <span className="size-2 rounded-full bg-primary" />
                      )}
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <FileText className="size-4 text-muted-foreground" />
                        <span className="text-sm font-semibold">
                          Single combined PDF
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        All {csvRows.length} records in one file, one record per
                        page.
                      </p>
                    </div>
                  </button>

                  {/* ZIP option */}
                  <button
                    type="button"
                    onClick={() => setMode("zip")}
                    className={cn(
                      "flex gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-accent/50",
                      mode === "zip"
                        ? "border-primary bg-primary/5"
                        : "border-border bg-background"
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex size-4 shrink-0 rounded-full border-2 items-center justify-center",
                        mode === "zip"
                          ? "border-primary"
                          : "border-muted-foreground/40"
                      )}
                    >
                      {mode === "zip" && (
                        <span className="size-2 rounded-full bg-primary" />
                      )}
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Archive className="size-4 text-muted-foreground" />
                        <span className="text-sm font-semibold">
                          ZIP of separate PDFs
                        </span>
                        <Badge variant="secondary" className="text-[10px]">
                          Recommended
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        One named PDF per record, bundled in a .zip archive.
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Filename column (ZIP mode only) */}
              <div
                className={cn(
                  "flex flex-col gap-2 transition-opacity",
                  mode !== "zip" && "pointer-events-none opacity-40"
                )}
              >
                <Label>Filename column</Label>
                <Select
                  value={filenameColumn}
                  onValueChange={onFilenameColumnChange}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a column…" />
                  </SelectTrigger>
                  <SelectContent>
                    {csvHeaders.map((h) => (
                      <SelectItem key={h} value={h}>
                        {h}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {filenameColumn && (
                  <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-2 font-mono text-xs text-muted-foreground">
                    <FileText className="size-3 shrink-0" />
                    {sampleName || "record"}.pdf
                  </div>
                )}
              </div>
            </div>

            <Separator />

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleExport}
                disabled={mode === "zip" && !filenameColumn}
                className="gap-2"
              >
                <Download className="size-4" />
                Export {csvRows.length} PDFs
              </Button>
            </div>
          </>
        )}

        {isConfig && csvRows.length === 0 && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Download className="size-4" />
                Export template
              </DialogTitle>
              <DialogDescription>
                Download your PDF template with static text fields rendered.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <div className="flex size-14 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                <FileText className="size-7" />
              </div>
              <p className="text-sm text-muted-foreground">
                No CSV dataset loaded. Static text fields will be rendered
                directly on the template.
              </p>
            </div>

            <Separator />

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={onDownloadCombined} className="gap-2">
                <Download className="size-4" />
                Download PDF
              </Button>
            </div>
          </>
        )}

        {isRunning && (
          <div className="flex flex-col items-center gap-5 py-6 text-center">
            <Loader2 className="size-12 animate-spin text-primary" />
            <div>
              <p className="text-base font-semibold">
                {processingMessage || "Rendering documents…"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {processingProgress.current} of {processingProgress.total}{" "}
                merged
              </p>
            </div>
            <div className="h-2 w-full rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <div className="flex w-full justify-between font-mono text-xs text-muted-foreground">
              <span>
                {processingProgress.current} / {processingProgress.total}
              </span>
              <span>{progressPct}%</span>
            </div>
          </div>
        )}

        {isDone && (
          <div className="flex flex-col items-center gap-5 py-6 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-emerald-500/10">
              <CheckCircle2 className="size-9 text-emerald-500" />
            </div>
            <div>
              <p className="text-lg font-semibold">Export complete</p>
              <p className="mt-1.5 text-sm text-muted-foreground">
                {csvRows.length === 0 ? (
                  <>
                    Template PDF with static text{" "}
                    <code className="font-mono">template.pdf</code> ready
                  </>
                ) : mode === "zip" ? (
                  <>
                    {csvRows.length} PDFs bundled into{" "}
                    <code className="font-mono">certificates.zip</code>
                  </>
                ) : (
                  <>
                    {csvRows.length}-page{" "}
                    <code className="font-mono">merged.pdf</code> ready
                  </>
                )}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button className="gap-2" onClick={() => onOpenChange(false)}>
                <Download className="size-4" />
                Download {mode === "zip" ? ".zip" : ".pdf"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
