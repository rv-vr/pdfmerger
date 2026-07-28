import { useState, useEffect, useRef } from "react"
import {
  FileSpreadsheet,
  Search,
  Tag,
  Plus,
  GripVertical,
  Lock,
  Unlock,
  Info,
  Hash,
  Type,
  Eye,
  EyeOff,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { PlacedField } from "@/types"
import { cn } from "@/lib/utils"

function getColumnIcon(header: string) {
  const lower = header.toLowerCase()
  if (
    lower.includes("date") ||
    lower.includes("id") ||
    lower.includes("num") ||
    lower.includes("grade") ||
    lower.includes("hours")
  ) {
    return <Hash className="size-3.5 shrink-0" />
  }
  return <Type className="size-3.5 shrink-0" />
}

interface FieldsSidebarProps {
  csvFileName: string
  csvHeaders: string[]
  csvRows: Record<string, string>[]
  placedFields: PlacedField[]
  selectedFieldId: string | null
  selectedFieldIds: string[]
  onAddField: (header: string) => void
  onSelectField: (id: string | null) => void
  /** displayOrderIds: topmost-first (index 0 = rendered on top of PDF) */
  onReorderFields: (displayOrderIds: string[]) => void
  onToggleVisibility: (id: string) => void
  onToggleFieldSelection: (id: string) => void
  onToggleLock: (id: string) => void
}

export function FieldsSidebar({
  csvFileName,
  csvHeaders,
  csvRows,
  placedFields,
  selectedFieldId,
  selectedFieldIds,
  onAddField,
  onSelectField,
  onReorderFields,
  onToggleVisibility,
  onToggleFieldSelection,
  onToggleLock,
}: FieldsSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOrder, setDragOrder] = useState<string[]>([])

  const dragOrderRef = useRef<string[]>([])
  const onReorderFieldsRef = useRef(onReorderFields)

  useEffect(() => {
    dragOrderRef.current = dragOrder
  }, [dragOrder])
  useEffect(() => {
    onReorderFieldsRef.current = onReorderFields
  }, [onReorderFields])

  // placedFields: last item = topmost (rendered on top). Display reversed so top = front.
  const baseOrder = [...placedFields].reverse().map((f) => f.id)
  const activeOrder = dragId ? dragOrder : baseOrder
  const displayFields = activeOrder
    .map((id) => placedFields.find((f) => f.id === id))
    .filter(Boolean) as PlacedField[]

  const handleGripPointerDown = (e: React.PointerEvent, id: string) => {
    e.preventDefault()
    const initialOrder = [...placedFields].reverse().map((f) => f.id)
    dragOrderRef.current = initialOrder
    setDragOrder(initialOrder)
    setDragId(id)
  }

  const handleItemPointerEnter = (overId: string) => {
    if (!dragId || overId === dragId) return
    setDragOrder((prev) => {
      const from = prev.indexOf(dragId)
      const to = prev.indexOf(overId)
      if (from < 0 || to < 0 || from === to) return prev
      const next = [...prev]
      next.splice(from, 1)
      next.splice(to, 0, dragId)
      dragOrderRef.current = next
      return next
    })
  }

  useEffect(() => {
    if (!dragId) return
    const handlePointerUp = () => {
      onReorderFieldsRef.current(dragOrderRef.current)
      setDragId(null)
    }
    document.addEventListener("pointerup", handlePointerUp)
    return () => document.removeEventListener("pointerup", handlePointerUp)
  }, [dragId])

  const filtered = csvHeaders.filter((h) =>
    h.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const countOf = (col: string) =>
    placedFields.filter((f) => f.fieldName === col).length

  return (
    <div
      className={cn(
        "flex min-h-0 w-67 shrink-0 flex-col overflow-hidden border-r border-border bg-card",
        dragId && "select-none cursor-grabbing"
      )}
    >
      {/* Dataset summary */}
      <div className="shrink-0 border-b border-border px-4 py-3">
        <div className="mb-3 flex items-center gap-2">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <FileSpreadsheet className="size-3.5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium leading-tight">
              {csvFileName || "No CSV loaded"}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {csvHeaders.length} columns · {csvRows.length} rows
            </p>
          </div>
        </div>
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search columns…"
            className="h-8 pl-8 text-sm"
          />
        </div>
      </div>

      {/* Scrollable content */}
      <ScrollArea className="flex-1 overflow-hidden w-full">
        <div className="px-3 py-3">
          {/* Insert Fields section */}
          <div className="mb-2 flex items-center justify-between px-1">
            <span className="text-xs font-semibold text-muted-foreground">
              Insert fields
            </span>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="rounded p-0.5 text-muted-foreground hover:text-foreground"
                >
                  <Info className="size-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-45 text-xs">
                Click a column to place it on the PDF canvas
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Column cards */}
          <div className="flex flex-col gap-1">
            {csvHeaders.length === 0 ? (
              <p className="px-1 py-2 text-xs text-muted-foreground">
                No CSV dataset loaded. Use{" "}
                <span className="font-semibold">Add Text</span> in the toolbar
                to place static text, or upload a CSV from the file menu.
              </p>
            ) : filtered.length === 0 ? (
              <p className="px-1 py-2 text-xs text-muted-foreground">
                No matching columns.
              </p>
            ) : (
              filtered.map((header) => {
                const count = countOf(header)
                const sample = csvRows[0]?.[header] ?? ""
                return (
                  <button
                    key={header}
                    type="button"
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", header)
                      e.dataTransfer.effectAllowed = "copy"
                    }}
                    onClick={() => onAddField(header)}
                    className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm transition-colors hover:bg-accent cursor-grab active:cursor-grabbing"
                  >
                    <span className="text-muted-foreground">
                      {getColumnIcon(header)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium leading-tight">
                        {header}
                      </span>
                      <span className="block truncate font-mono text-[10px] text-muted-foreground">
                        {sample}
                      </span>
                    </span>
                    {count > 0 && (
                      <Badge
                        variant="secondary"
                        className="shrink-0 px-1.5 text-[10px]"
                      >
                        {count}
                      </Badge>
                    )}
                    <Plus className="size-3.5 shrink-0 text-muted-foreground" />
                  </button>
                )
              })
            )}
          </div>

          {/* Placed fields section */}
          {placedFields.length > 0 && (
            <>
              <Separator className="my-3" />
              <div className="mb-2 px-1">
                <span className="text-xs font-semibold text-muted-foreground">
                  Placed on template ({placedFields.length})
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                {displayFields.map((f) => {
                  const isDragging = f.id === dragId
                  return (
                    <div
                      key={f.id}
                      data-field-id={f.id}
                      onPointerEnter={() => handleItemPointerEnter(f.id)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 transition-colors",
                        f.id === selectedFieldId &&
                          !isDragging &&
                          "bg-accent ring-1 ring-ring/20",
                        isDragging &&
                          "opacity-40 ring-1 ring-dashed ring-ring/50 bg-accent/50",
                        !isDragging && "hover:bg-accent",
                        !isDragging &&
                          selectedFieldIds.includes(f.id) &&
                          "bg-accent/60"
                      )}
                    >
                      <button
                        type="button"
                        className={cn(
                          "touch-none text-muted-foreground",
                          isDragging ? "cursor-grabbing" : "cursor-grab"
                        )}
                        onPointerDown={(e) => handleGripPointerDown(e, f.id)}
                        aria-label="Drag to reorder"
                      >
                        <GripVertical className="size-3.5 shrink-0" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          if (dragId) return
                          if (e.ctrlKey || e.metaKey) {
                            onToggleFieldSelection(f.id)
                          } else {
                            onSelectField(f.id)
                          }
                        }}
                        className="flex min-w-0 flex-1 items-center gap-2 text-left"
                      >
                        <Tag className="size-3.5 shrink-0 text-muted-foreground" />
                        <span className="min-w-0 flex-1 truncate text-sm font-medium">
                          {f.fieldName}
                        </span>
                        <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                          {f.fontSize}pt
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          onToggleVisibility(f.id)
                        }}
                        className="flex size-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:text-foreground"
                        title={
                          f.visible === false ? "Show field" : "Hide field"
                        }
                      >
                        {f.visible === false ? (
                          <EyeOff className="size-3" />
                        ) : (
                          <Eye className="size-3" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          onToggleLock(f.id)
                        }}
                        className={cn(
                          "flex size-6 shrink-0 items-center justify-center rounded",
                          f.locked
                            ? "text-amber-500 hover:text-amber-600 bg-amber-500/10"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                        title={f.locked ? "Unlock field" : "Lock field"}
                      >
                        {f.locked ? (
                          <Lock className="size-3" />
                        ) : (
                          <Unlock className="size-3" />
                        )}
                      </button>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
