import React from "react"
import type { RefObject } from "react"
import { Document, Page } from "react-pdf"
import { FileText, FileUp, GripVerticalIcon, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { PlacedField } from "@/types"
import { cn } from "@/lib/utils"
import { CanvasToolbar } from "@/components/app/CanvasToolbar"
import { Skeleton } from "@/components/ui/skeleton"
import { Ruler } from "@/components/app/Ruler"
import { GuidesOverlay } from "@/components/app/GuidesOverlay"

function fontFamilyFor(font: PlacedField["font"]): string {
  if (font === "Arimo") return "Arimo, Arial, sans-serif"
  if (font === "Carlito") return "Carlito, Calibri, sans-serif"
  if (font === "EB Garamond") return '"EB Garamond", Garamond, serif'
  if (font === "Lora") return "Lora, Georgia, serif"
  if (font === "Open Sans") return '"Open Sans", Tahoma, Verdana, sans-serif'
  if (font === "Open Sans Condensed")
    return '"Open Sans Condensed", "Open Sans", Tahoma, Verdana, sans-serif'
  if (font === "Poppins") return "Poppins, sans-serif"
  if (font === "Courier") return '"Courier New", Courier, monospace'
  if (font === "Times-Roman") return '"Times New Roman", Times, Georgia, serif'
  return 'Helvetica, "Helvetica Neue", Arial, sans-serif'
}

function getFieldStyle(
  field: PlacedField,
  zoom: number,
  isPreviewMode: boolean
): React.CSSProperties {
  const base: React.CSSProperties = {
    left: `${field.x * zoom}px`,
    top: `${field.y * zoom}px`,
    width: `${field.width * zoom}px`,
  }

  const align = field.align ?? "left"
  const fontSizeVal = Math.max(8, (field.fontSize ?? 12) * zoom)
  const heightVal = fontSizeVal * 1.5

  if (isPreviewMode) {
    return {
      ...base,
      color: field.color,
      fontFamily: fontFamilyFor(field.font),
      fontSize: `${fontSizeVal}px`,
      height: `${heightVal}px`,
      fontWeight: field.isBold ? "bold" : "normal",
      fontStyle: field.isItalic ? "italic" : "normal",
      textAlign: align,
      justifyContent:
        align === "center"
          ? "center"
          : align === "right"
            ? "flex-end"
            : "flex-start",
    }
  }

  return {
    ...base,
    fontSize: `${fontSizeVal}px`,
    height: `${heightVal}px`,
    fontFamily: fontFamilyFor(field.font),
    fontWeight: field.isBold ? "bold" : "normal",
    fontStyle: field.isItalic ? "italic" : "normal",
  }
}

function PdfPageSkeleton({ width, height }: { width: number; height: number }) {
  const w = width || 600
  const h = height || Math.round(w * 1.414)
  return (
    <div
      style={{ width: w, height: h }}
      className="flex flex-col gap-3 bg-white p-8"
    >
      <Skeleton className="h-5 w-2/3 bg-zinc-100" />
      <Skeleton className="h-3 w-full bg-zinc-100" />
      <Skeleton className="h-3 w-full bg-zinc-100" />
      <Skeleton className="h-3 w-4/5 bg-zinc-100" />
      <Skeleton className="mt-2 h-3 w-full bg-zinc-100" />
      <Skeleton className="h-3 w-full bg-zinc-100" />
      <Skeleton className="h-3 w-3/4 bg-zinc-100" />
      <Skeleton className="mt-2 h-24 w-full bg-zinc-100" />
      <Skeleton className="mt-2 h-3 w-full bg-zinc-100" />
      <Skeleton className="h-3 w-5/6 bg-zinc-100" />
    </div>
  )
}

interface PdfPageWithFadeProps {
  pageNumber: number
  scale: number
  pdfDimensions: { width: number; height: number }
  onLoadSuccess: (page: { width: number; height: number }) => void
}

function PdfPageWithFade({
  pageNumber,
  scale,
  pdfDimensions,
  onLoadSuccess,
}: PdfPageWithFadeProps) {
  const [rendered, setRendered] = React.useState(false)
  return (
    <div className="relative">
      <Page
        pageNumber={pageNumber}
        scale={scale}
        renderTextLayer={false}
        renderAnnotationLayer={false}
        onLoadSuccess={onLoadSuccess}
        onRenderSuccess={() => setRendered(true)}
      />
      {/* ponytail: overlay is the skeleton; loading prop removed as redundant */}
      <div
        className={cn(
          "pointer-events-none absolute inset-0 transition-opacity duration-500",
          rendered ? "opacity-0" : "opacity-100"
        )}
      >
        <PdfPageSkeleton
          width={pdfDimensions.width}
          height={pdfDimensions.height}
        />
      </div>
    </div>
  )
}


interface EditorCanvasProps {
  pdfBytes: ArrayBuffer | null
  totalPages: number
  currentPage: number
  pdfDimensions: { width: number; height: number }
  placedFields: PlacedField[]
  selectedFieldIds: string[]
  isPreviewMode: boolean
  previewRowIndex: number
  csvRows: Record<string, string>[]
  zoom: number
  canUndo: boolean
  canRedo: boolean
  onPageChange: (page: number) => void
  onZoomChange: (zoom: number) => void
  onTogglePreview: () => void
  onPreviewRowChange: (index: number) => void
  onSelectField: (id: string | null) => void
  onSelectFields: (ids: string[]) => void
  onClearAllFields: () => void
  onUndo: () => void
  onRedo: () => void
  onFieldMouseDown: (e: React.MouseEvent, field: PlacedField) => void
  onFieldTouchStart: (e: React.TouchEvent, field: PlacedField) => void
  onResizeMouseDown: (e: React.MouseEvent, field: PlacedField) => void
  onResizeTouchStart: (e: React.TouchEvent, field: PlacedField) => void
  containerRef: RefObject<HTMLDivElement | null>
  onLoadSuccess: (totalPages: number) => void
  onPageRenderSuccess: (width: number, height: number) => void
  onDropField?: (header: string, x: number, y: number) => void
  snapToGuides: boolean
  showRulers: boolean
  onSnapToGuidesChange: (v: boolean) => void
  onShowRulersChange: (v: boolean) => void
  guides: import("@/lib/editorTypes").Guide[]
  onAddGuide: (orientation: "horizontal" | "vertical", position: number) => void
  onRemoveGuide: (id: string) => void
  onUpdateGuidePosition: (id: string, position: number) => void
  onAddTextField?: () => void
}

export function EditorCanvas({
  pdfBytes,
  totalPages,
  currentPage,
  pdfDimensions,
  placedFields,
  selectedFieldIds,
  isPreviewMode,
  previewRowIndex,
  csvRows,
  zoom,
  canUndo,
  canRedo,
  onPageChange,
  onZoomChange,
  onTogglePreview,
  onPreviewRowChange,
  onSelectField,
  onSelectFields,
  onClearAllFields,
  onUndo,
  onRedo,
  onFieldMouseDown,
  onFieldTouchStart,
  onResizeMouseDown,
  onResizeTouchStart,
  containerRef,
  onLoadSuccess,
  onPageRenderSuccess,
  onDropField,
  snapToGuides,
  showRulers,
  onSnapToGuidesChange,
  onShowRulersChange,
  guides,
  onAddGuide,
  onRemoveGuide,
  onUpdateGuidePosition,
  onAddTextField,
}: EditorCanvasProps) {
  const memoizedFile = React.useMemo(() => {
    return pdfBytes ? pdfBytes.slice(0) : null
  }, [pdfBytes])

  // Marquee selection state
  const [marqueeRect, setMarqueeRect] = React.useState<{
    left: number
    top: number
    width: number
    height: number
  } | null>(null)
  const marqueeStartRef = React.useRef<{ x: number; y: number } | null>(null)
  const [ghostPos, setGhostPos] = React.useState<number | null>(null)
  const [ghostOrient, setGhostOrient] = React.useState<
    "horizontal" | "vertical"
  >("horizontal")

  const getContainerCoords = React.useCallback(
    (clientX: number, clientY: number) => {
      const el = containerRef.current
      if (!el) return { x: 0, y: 0 }
      const rect = el.getBoundingClientRect()
      return { x: clientX - rect.left, y: clientY - rect.top }
    },
    [containerRef]
  )

  const handleWorkspaceMouseDown = React.useCallback(
    (e: React.MouseEvent) => {
      if (isPreviewMode) return
      // Only start marquee on left click in the workspace (not on a field)
      if (e.button !== 0) return
      const target = e.target as HTMLElement
      // If clicking a field or its children, don't start marquee
      if (target.closest('[role="button"]')) return
      const coords = getContainerCoords(e.clientX, e.clientY)
      marqueeStartRef.current = coords
      setMarqueeRect({ left: coords.x, top: coords.y, width: 0, height: 0 })
      onSelectField(null)
    },
    [isPreviewMode, getContainerCoords, onSelectField]
  )

  React.useEffect(() => {
    if (!marqueeRect) return
    const handleMouseMove = (e: MouseEvent) => {
      const coords = getContainerCoords(e.clientX, e.clientY)
      const start = marqueeStartRef.current
      if (!start) return
      setMarqueeRect({
        left: Math.min(start.x, coords.x),
        top: Math.min(start.y, coords.y),
        width: Math.abs(coords.x - start.x),
        height: Math.abs(coords.y - start.y),
      })
    }
    const handleMouseUp = (e: MouseEvent) => {
      const start = marqueeStartRef.current
      if (!start) {
        setMarqueeRect(null)
        return
      }
      const end = getContainerCoords(e.clientX, e.clientY)
      const selLeft = Math.min(start.x, end.x)
      const selTop = Math.min(start.y, end.y)
      const selRight = Math.max(start.x, end.x)
      const selBottom = Math.max(start.y, end.y)
      const container = containerRef.current
      if (container) {
        // Select ALL fields intersecting the selection rect
        const hitIds: string[] = []
        for (const f of placedFields) {
          if (f.page !== currentPage) continue
          if (f.visible === false) continue
          const fontSizeVal = Math.max(8, (f.fontSize ?? 12) * zoom)
          const fHeight = fontSizeVal * 1.5
          const fLeft = f.x * zoom
          const fTop = f.y * zoom
          const fRight = fLeft + f.width * zoom
          const fBottom = fTop + fHeight
          if (
            fLeft < selRight &&
            fRight > selLeft &&
            fTop < selBottom &&
            fBottom > selTop
          ) {
            hitIds.push(f.id)
          }
        }
        if (hitIds.length > 0) onSelectFields(hitIds)
      }
      marqueeStartRef.current = null
      setMarqueeRect(null)
    }
    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)
    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }
  }, [
    marqueeRect,
    getContainerCoords,
    containerRef,
    placedFields,
    currentPage,
    onSelectField,
    onSelectFields,
    zoom,
  ])

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <CanvasToolbar
        isPreviewMode={isPreviewMode}
        csvRows={csvRows}
        previewRowIndex={previewRowIndex}
        totalPages={totalPages}
        currentPage={currentPage}
        zoom={zoom}
        placedFields={placedFields}
        canUndo={canUndo}
        canRedo={canRedo}
        onTogglePreview={onTogglePreview}
        onPreviewRowChange={onPreviewRowChange}
        onPageChange={onPageChange}
        onZoomChange={onZoomChange}
        onClearAllFields={onClearAllFields}
        onUndo={onUndo}
        onRedo={onRedo}
        snapToGuides={snapToGuides}
        showRulers={showRulers}
        onSnapToGuidesChange={onSnapToGuidesChange}
        onShowRulersChange={onShowRulersChange}
        onAddTextField={onAddTextField}
      />

      {/* Horizontal ruler — fixed below toolbar */}
      {showRulers && pdfBytes && (
        <div
          className="shrink-0 overflow-hidden border-b border-border bg-card"
          style={{ height: 18, paddingLeft: 18 }}
        >
          <div
            className="mx-auto"
            style={{
              width: pdfDimensions.width || 600,
              height: 18,
              position: "relative",
            }}
          >
            <Ruler
              orientation="horizontal"
              containerWidth={pdfDimensions.width || 600}
              containerHeight={pdfDimensions.height || 800}
              zoom={zoom}
              onGuideCreate={onAddGuide}
              onGuidePreview={(p) => {
                setGhostPos(p)
                setGhostOrient("horizontal")
              }}
            />
          </div>
        </div>
      )}

      {/* Workspace */}
      <div
        role="none"
        data-workspace
        className="relative flex flex-1 overflow-auto bg-muted/30"
        onMouseDown={() => !isPreviewMode && onSelectField(null)}
      >
        {/* Vertical ruler — sticky left */}
        {showRulers && pdfBytes && (
          <div
            className="sticky left-0 z-50 shrink-0 self-start border-r border-border bg-card pt-6"
            style={{ width: 18, minHeight: (pdfDimensions.height || 800) + 24 }}
          >
            <Ruler
              orientation="vertical"
              containerWidth={pdfDimensions.width || 600}
              containerHeight={pdfDimensions.height || 800}
              zoom={zoom}
              onGuideCreate={onAddGuide}
              onGuidePreview={(p) => {
                setGhostPos(p)
                setGhostOrient("vertical")
              }}
            />
          </div>
        )}

        {pdfBytes ? (
          <div className="flex-1 flex items-start justify-center p-6">
            <div
              ref={containerRef}
              data-canvas-container
              className="relative inline-block select-none rounded-sm border border-border bg-white shadow-2xl dark:bg-slate-900"
              style={{
                width: pdfDimensions.width
                  ? `${pdfDimensions.width}px`
                  : "auto",
              }}
              onMouseDown={handleWorkspaceMouseDown}
              onDragOver={(e) => {
                if (isPreviewMode || !onDropField) return
                e.preventDefault()
                e.stopPropagation()
              }}
              onDrop={(e) => {
                if (isPreviewMode || !onDropField) return
                e.preventDefault()
                e.stopPropagation()
                const header = e.dataTransfer.getData("text/plain")
                if (!header) return
                const rect = containerRef.current?.getBoundingClientRect()
                if (!rect) return
                const x = (e.clientX - rect.left) / zoom
                const y = (e.clientY - rect.top) / zoom
                onDropField(header, x, y)
              }}
            >
              {/* Rendered PDF canvas using react-pdf */}
              <Document
                file={memoizedFile}
                onLoadSuccess={({ numPages }) => onLoadSuccess(numPages)}
                loading={
                  <PdfPageSkeleton
                    width={pdfDimensions.width}
                    height={pdfDimensions.height}
                  />
                }
              >
                <PdfPageWithFade
                  key={currentPage}
                  pageNumber={currentPage}
                  scale={zoom}
                  pdfDimensions={pdfDimensions}
                  onLoadSuccess={(page) =>
                    onPageRenderSuccess(page.width, page.height)
                  }
                />
              </Document>

              {/* Marquee selection overlay */}
              {marqueeRect && (
                <div
                  className="pointer-events-none absolute z-30 rounded border-2 border-blue-600/80 bg-blue-600/20"
                  style={{
                    left: marqueeRect.left,
                    top: marqueeRect.top,
                    width: marqueeRect.width,
                    height: marqueeRect.height,
                  }}
                />
              )}

              {/* Field overlay layer */}
              <div className="absolute inset-0 z-10 overflow-visible">
                {placedFields.flatMap((field) => {
                  if (field.page !== currentPage) return []
                  if (field.visible === false && !isPreviewMode) return []
                  const isSelected = selectedFieldIds.includes(field.id)
                  const displayVal = field.isStatic
                    ? field.fieldName
                    : isPreviewMode && csvRows[previewRowIndex]
                      ? csvRows[previewRowIndex][field.fieldName] || ""
                      : `{{${field.fieldName}}}`

                  const align = field.align ?? "left"

                  const fieldEl = (
                    <div
                      key={field.id}
                      role="button"
                      tabIndex={isPreviewMode ? -1 : 0}
                      aria-disabled={isPreviewMode || undefined}
                      style={getFieldStyle(field, zoom, isPreviewMode)}
                      onMouseDown={(e) => onFieldMouseDown(e, field)}
                      onTouchStart={(e) => onFieldTouchStart(e, field)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault()
                          onFieldMouseDown(
                            e as unknown as React.MouseEvent,
                            field
                          )
                        }
                      }}
                      className={cn(
                        "absolute z-20 flex items-center overflow-visible whitespace-nowrap select-none rounded transition-colors",
                        isPreviewMode
                          ? "pointer-events-none cursor-default bg-transparent"
                          : cn(
                              field.locked
                                ? "cursor-not-allowed"
                                : "cursor-grab active:cursor-grabbing",
                              "bg-white/90 border pl-2 pr-8 shadow-sm",
                              isSelected
                                ? "border-zinc-300 ring-1 ring-blue-400"
                                : "border-zinc-300 hover:border-primary/60",
                              field.visible === false && "opacity-40"
                            )
                      )}
                    >
                      {/* Text content */}
                      <div
                        className={cn(
                          "flex-1 overflow-hidden",
                          !isPreviewMode &&
                            (align === "right"
                              ? "text-right"
                              : align === "center"
                                ? "text-center"
                                : "text-left")
                        )}
                        style={
                          !isPreviewMode ? { color: field.color } : undefined
                        }
                      >
                        <span className="truncate leading-none">
                          {displayVal || (
                            <span className="italic opacity-30">empty</span>
                          )}
                        </span>
                      </div>

                      {/* Lock icon (bottom-left) — hidden in preview */}
                      {field.locked && !isPreviewMode && (
                        <div className="absolute bottom-0 left-0 flex size-4 items-center justify-center rounded-tr bg-zinc-200/80 text-zinc-500">
                          <Lock className="size-2.5" />
                        </div>
                      )}

                      {/* Width resize grip (right edge) */}
                      {!isPreviewMode && (
                        <button
                          type="button"
                          tabIndex={0}
                          onMouseDown={(e) => {
                            e.stopPropagation()
                            onResizeMouseDown(e, field)
                          }}
                          onTouchStart={(e) => {
                            e.stopPropagation()
                            onResizeTouchStart(e, field)
                          }}
                          className={cn(
                            "absolute bottom-0 right-0 top-0 flex w-5 items-center justify-center rounded-r select-none transition-colors",
                            field.locked
                              ? "pointer-events-none opacity-30"
                              : "cursor-ew-resize",
                            isSelected
                              ? "bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/80"
                              : "bg-zinc-200 text-zinc-500 hover:bg-zinc-300 active:bg-zinc-400"
                          )}
                          aria-label="Drag to resize field width"
                          title={
                            field.locked
                              ? "Field is locked"
                              : "Drag to resize field width"
                          }
                        >
                          <GripVerticalIcon className="size-3" />
                        </button>
                      )}
                    </div>
                  )

                  return [fieldEl]
                })}
              </div>
            </div>
          </div>
        ) : (
          /* Empty state */
          <div className="flex h-full w-full max-w-lg flex-col items-center justify-center gap-5 rounded-2xl border-2 border-dashed border-border px-6 py-16 text-center">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <FileText className="size-8" />
            </div>
            <div>
              <h3 className="text-base font-bold">No PDF Template Loaded</h3>
              <p className="mt-1.5 max-w-xs text-xs leading-relaxed text-muted-foreground">
                Upload your PDF document template and a CSV dataset to get
                started placing fields.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => document.getElementById("pdf-upload")?.click()}
              className="gap-2"
            >
              <FileUp className="size-4" />
              Upload PDF Template
            </Button>
          </div>
        )}
      </div>

      {/* Fixed guide overlay (viewport-level) */}
      <GuidesOverlay
        guides={guides}
        currentPage={currentPage}
        isPreviewMode={isPreviewMode}
        onRemoveGuide={onRemoveGuide}
        onUpdateGuidePosition={onUpdateGuidePosition}
        ghostPosition={ghostPos}
        ghostOrientation={ghostOrient}
        versionKey={pdfDimensions.width + pdfDimensions.height}
        zoom={zoom}
      />
    </div>
  )
}
