import React, { useState, useEffect, Suspense } from "react"
import { pdfjs } from "react-pdf"
import { NavBar } from "@/components/app/NavBar"
import { UploadScreen } from "@/components/app/UploadScreen"
import { FieldsSidebar } from "@/components/app/FieldsSidebar"
import { Inspector } from "@/components/app/Inspector"
import { TooltipProvider } from "@/components/ui/tooltip"

const EditorCanvas = React.lazy(() =>
  import("@/components/app/EditorCanvas").then((m) => ({
    default: m.EditorCanvas,
  }))
)
const ExportDialog = React.lazy(() =>
  import("@/components/app/ExportDialog").then((m) => ({
    default: m.ExportDialog,
  }))
)
import { usePdf } from "@/hooks/usePdf"
import { useCsv } from "@/hooks/useCsv"
import { useFieldEditor } from "@/hooks/useFieldEditor"
import { useExport } from "@/hooks/useExport"
import { Monitor } from "lucide-react"

pdfjs.GlobalWorkerOptions.workerSrc = `${import.meta.env.BASE_URL}pdf.worker.min.mjs`

const THEME_STORAGE_KEY = "pdf-merger-theme"

export default function App() {
  const [view, setView] = useState<"upload" | "editor">("upload")
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window === "undefined") return false
    return window.localStorage.getItem(THEME_STORAGE_KEY) === "dark"
  })

  const pdf = usePdf(view)
  const csv = useCsv()
  const fields = useFieldEditor(
    pdf.currentPage,
    csv.csvRows.length,
    pdf.pdfDimensions,
    pdf.zoom
  )
  const exportState = useExport(
    pdf.pdfBytes,
    pdf.pdfFile,
    csv.csvRows,
    fields.placedFields,
    csv.filenameColumn
  )

  useEffect(() => {
    const root = window.document.documentElement
    if (isDarkMode) root.classList.add("dark")
    else root.classList.remove("dark")
    window.localStorage.setItem(
      THEME_STORAGE_KEY,
      isDarkMode ? "dark" : "light"
    )
  }, [isDarkMode])

  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    pdf.handlePdfUpload(e, fields.resetFields)
  }

  const selectedFieldIds = fields.selectedFieldIds
  const selectedField = fields.placedFields.find(
    (f) => f.id === fields.selectedFieldId
  )
  const selectedFields =
    selectedFieldIds.length > 0
      ? fields.placedFields.filter((f) => selectedFieldIds.includes(f.id))
      : []
  // ponytail: nativeWidth/nativeHeight come from hook — no recompute needed
  const { nativeWidth, nativeHeight } = fields
  const primaryField =
    selectedFieldIds.length > 0
      ? fields.placedFields.find(
          (f) => f.id === selectedFieldIds[selectedFieldIds.length - 1]
        )
      : undefined

  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 1024)
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 1024)
    window.addEventListener("resize", handler)
    return () => window.removeEventListener("resize", handler)
  }, [])

  return (
    <TooltipProvider>
      <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
        <NavBar
          isDarkMode={isDarkMode}
          onToggleDark={() => setIsDarkMode((current) => !current)}
          canExport={
            view === "editor" &&
            !!pdf.pdfBytes &&
            fields.placedFields.length > 0
          }
          onExportClick={exportState.openExportDialog}
          view={view}
          pdfFileName={pdf.pdfFile?.name}
          csvRowCount={csv.csvRows.length}
          onBackToUpload={() => setView("upload")}
        />

        {view === "upload" ? (
          <div className="relative flex flex-1 flex-col overflow-hidden">
            <div
              className={`flex flex-1 flex-col${isMobile ? " pointer-events-none select-none opacity-30 blur-[2px]" : ""}`}
            >
              <UploadScreen
                pdfFile={pdf.pdfFile}
                csvFileName={csv.csvFileName}
                csvRows={csv.csvRows}
                csvHeaders={csv.csvHeaders}
                onPdfUpload={handlePdfUpload}
                onCsvUpload={csv.handleCsvUpload}
                onContinue={() => setView("editor")}
              />
            </div>
            {isMobile && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8 text-center">
                <Monitor className="h-12 w-12 text-foreground" />
                <div className="flex flex-col gap-1">
                  <h2 className="text-xl font-semibold tracking-tight">
                    Desktop Required
                  </h2>
                  <p className="max-w-xs text-sm text-muted-foreground">
                    PDF Data Merger needs a larger screen. Open on a desktop or
                    laptop for the full experience.
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 overflow-hidden">
            <FieldsSidebar
              csvFileName={csv.csvFileName}
              csvHeaders={csv.csvHeaders}
              csvRows={csv.csvRows}
              placedFields={fields.placedFields}
              selectedFieldId={fields.selectedFieldId}
              selectedFieldIds={fields.selectedFieldIds}
              onAddField={fields.addFieldToPage}
              onSelectField={fields.setSelectedFieldId}
              onReorderFields={fields.reorderFields}
              onToggleVisibility={fields.toggleFieldVisibility}
              onToggleLock={fields.toggleFieldLock}
              onToggleFieldSelection={(id) => {
                const ids = fields.selectedFieldIds
                fields.setSelectedFieldIds(
                  ids.includes(id)
                    ? ids.filter((fid) => fid !== id)
                    : [...ids, id]
                )
              }}
            />

            <Suspense
              fallback={
                <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
                  Loading editor…
                </div>
              }
            >
              <EditorCanvas
                pdfBytes={pdf.pdfBytes}
                totalPages={pdf.totalPages}
                currentPage={pdf.currentPage}
                pdfDimensions={pdf.pdfDimensions}
                placedFields={fields.placedFields}
                selectedFieldIds={fields.selectedFieldIds}
                isPreviewMode={fields.isPreviewMode}
                previewRowIndex={fields.previewRowIndex}
                csvRows={csv.csvRows}
                zoom={pdf.zoom}
                canUndo={fields.canUndo}
                canRedo={fields.canRedo}
                onPageChange={pdf.setCurrentPage}
                onZoomChange={pdf.setZoom}
                onTogglePreview={() => {
                  fields.setIsPreviewMode(!fields.isPreviewMode)
                  fields.setSelectedFieldId(null)
                }}
                onPreviewRowChange={fields.setPreviewRowIndex}
                onSelectField={fields.setSelectedFieldId}
                onSelectFields={(ids) => fields.setSelectedFieldIds(ids)}
                onClearAllFields={fields.clearAllFields}
                onUndo={fields.undo}
                onRedo={fields.redo}
                onFieldMouseDown={fields.handleMouseDown}
                onFieldTouchStart={fields.handleTouchStart}
                onResizeMouseDown={fields.handleResizeMouseDown}
                onResizeTouchStart={fields.handleResizeTouchStart}
                containerRef={fields.containerRef}
                onLoadSuccess={pdf.setTotalPages}
                onPageRenderSuccess={(width, height) =>
                  pdf.setPdfDimensions({ width, height })
                }
                onDropField={(header, x, y) =>
                  fields.addFieldToPage(header, { x, y })
                }
                snapToGuides={fields.snapToGuides}
                showRulers={fields.showRulers}
                onSnapToGuidesChange={fields.setSnapToGuides}
                onShowRulersChange={fields.setShowRulers}
                guides={fields.guides}
                onAddGuide={fields.addGuide}
                onRemoveGuide={fields.removeGuide}
                onUpdateGuidePosition={fields.updateGuidePosition}
                onAddTextField={fields.addStaticTextField}
              />
            </Suspense>

            <Inspector
              selectedField={selectedField}
              selectedFields={selectedFields}
              primaryField={primaryField}
              selectedFieldCount={fields.selectedFieldIds.length}
              onUpdate={fields.updateSelectedField}
              onCommit={fields.commitSelectedField}
              onUpdateCommit={fields.updateAndCommitField}
              onDuplicate={fields.handleDuplicateField}
              onDelete={fields.removeField}
              onMoveSelectedToFront={fields.moveSelectedToFront}
              onMoveSelectedToBack={fields.moveSelectedToBack}
              onMoveFieldForward={fields.moveFieldForward}
              onMoveFieldBackward={fields.moveFieldBackward}
              onAutoFitWidth={() => fields.autoFitWidth(csv.csvRows)}
              nativeWidth={nativeWidth}
              nativeHeight={nativeHeight}
            />
          </div>
        )}

        <Suspense fallback={null}>
          <ExportDialog
            open={exportState.exportDialogOpen}
            onOpenChange={exportState.handleExportDialogChange}
            csvHeaders={csv.csvHeaders}
            csvRows={csv.csvRows}
            pdfFile={pdf.pdfFile}
            filenameColumn={csv.filenameColumn}
            onFilenameColumnChange={csv.setFilenameColumn}
            isProcessing={exportState.isProcessing}
            processingProgress={exportState.processingProgress}
            processingMessage={exportState.processingMessage}
            onDownloadCombined={exportState.handleDownloadCombinedPDF}
            onDownloadZip={exportState.handleDownloadZIP}
          />
        </Suspense>
      </div>
    </TooltipProvider>
  )
}
