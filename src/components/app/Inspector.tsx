import { useRef, useEffect, useLayoutEffect } from "react"
import {
  Tag,
  Copy,
  Trash2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Info,
  ArrowUpToLine,
  ArrowDownToLine,
  Maximize2,
  Layers,
  Type,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Slider } from "@/components/ui/slider"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import type { PlacedField } from "@/types"
import { cn } from "@/lib/utils"

interface InspectorProps {
  selectedField: PlacedField | undefined
  selectedFields: PlacedField[]
  primaryField: PlacedField | undefined
  selectedFieldCount: number
  onUpdate: (updates: Partial<PlacedField>) => void
  onCommit: () => void
  onUpdateCommit: (updates: Partial<PlacedField>) => void
  onDuplicate: (field: PlacedField) => void
  onDelete: (id: string) => void
  onMoveSelectedToFront: () => void
  onMoveSelectedToBack: () => void
  onMoveFieldForward: (id: string) => void
  onMoveFieldBackward: (id: string) => void
  onAutoFitWidth: () => void
  nativeWidth: number
  nativeHeight: number
}

// Self-contained multi-select inspector with no shared refs
function MultiInspector({
  selectedFields,
  primaryField,
  onUpdate,
  onCommit,
  onUpdateCommit,
  onMoveSelectedToFront,
  onMoveSelectedToBack,
  onAutoFitWidth,
}: {
  selectedFields: PlacedField[]
  primaryField: PlacedField | undefined
  onUpdate: (updates: Partial<PlacedField>) => void
  onCommit: () => void
  onUpdateCommit: (updates: Partial<PlacedField>) => void
  onMoveSelectedToFront: () => void
  onMoveSelectedToBack: () => void
  onAutoFitWidth: () => void
}) {
  const mixedFont: string | null =
    selectedFields.length >= 2
      ? selectedFields.every((f) => f.font === selectedFields[0].font)
        ? selectedFields[0].font
        : null
      : null
  const mixedFontSize =
    selectedFields.length >= 2 &&
    !selectedFields.every((f) => f.fontSize === selectedFields[0].fontSize)

  return (
    <ScrollArea className="flex-1">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <Layers className="size-4 text-muted-foreground" />
        <span className="text-sm font-semibold">
          {selectedFields.length} fields selected
        </span>
      </div>
      <div className="flex flex-col gap-3 px-4 py-3">
        <p className="text-xs font-semibold text-muted-foreground">
          Typography
        </p>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Font family</Label>
          <Select
            value={mixedFont ?? "Mixed"}
            onValueChange={(val: string) => {
              if (val !== "Mixed")
                onUpdateCommit({ font: val as PlacedField["font"] })
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper">
              <SelectItem value="Mixed">
                <span className="text-sm font-medium text-muted-foreground">
                  Mixed
                </span>
              </SelectItem>
              {[
                "Helvetica",
                "Times-Roman",
                "Courier",
                "Arimo",
                "Carlito",
                "EB Garamond",
                "Lora",
                "Open Sans",
                "Open Sans Condensed",
                "Poppins",
              ].map((f) => (
                <SelectItem key={f} value={f}>
                  <span className="text-sm font-medium">{f}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Font size</Label>
          <div className="flex items-center gap-3">
            <Slider
              min={1}
              max={144}
              step={1}
              value={[primaryField?.fontSize ?? 14]}
              onValueChange={([val]) => onUpdate({ fontSize: val })}
              onValueCommit={() => onCommit()}
              className="flex-1"
            />
            <div className="relative w-16 shrink-0">
              <Input
                type="number"
                min={1}
                max={144}
                value={mixedFontSize ? "--" : (primaryField?.fontSize ?? 14)}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10)
                  if (!isNaN(val))
                    onUpdate({ fontSize: Math.max(1, Math.min(144, val)) })
                }}
                onBlur={() => onCommit()}
                className={cn(
                  "w-full pr-3 text-center text-sm",
                  mixedFontSize && "text-muted-foreground italic"
                )}
              />
              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                pt
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Style &amp; alignment</Label>
          <div className="flex items-center justify-between">
            <ToggleGroup
              type="multiple"
              spacing={0}
              onValueChange={(values) =>
                onUpdateCommit({
                  isBold: values.includes("bold"),
                  isItalic: values.includes("italic"),
                })
              }
              variant="outline"
              size="sm"
            >
              <ToggleGroupItem
                value="bold"
                className="w-9 font-bold"
                title="Bold (Ctrl+B)"
              >
                B
              </ToggleGroupItem>
              <ToggleGroupItem
                value="italic"
                className="w-9 font-mono italic font-bold"
                title="Italic (Ctrl+I)"
              >
                I
              </ToggleGroupItem>
            </ToggleGroup>
            <ToggleGroup
              type="single"
              spacing={0}
              onValueChange={(val) => {
                if (val)
                  onUpdateCommit({ align: val as "left" | "center" | "right" })
              }}
              variant="outline"
              size="sm"
            >
              <ToggleGroupItem
                value="left"
                className="w-9"
                title="Align left (Ctrl+Shift+L)"
              >
                <AlignLeft className="size-3.5" />
              </ToggleGroupItem>
              <ToggleGroupItem
                value="center"
                className="w-9"
                title="Align center (Ctrl+Shift+E)"
              >
                <AlignCenter className="size-3.5" />
              </ToggleGroupItem>
              <ToggleGroupItem
                value="right"
                className="w-9"
                title="Align right (Ctrl+Shift+R)"
              >
                <AlignRight className="size-3.5" />
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>
      </div>
      <Separator />
      <div className="flex flex-col gap-3 px-4 py-3">
        <p className="text-xs font-semibold text-muted-foreground">Color</p>
        <BulkColorPicker
          onUpdate={onUpdate}
          onCommit={onCommit}
          primaryColor={primaryField?.color ?? "#000000"}
        />
      </div>
      <Separator />
      <div className="flex flex-col gap-3 px-4 py-3">
        <p className="text-xs font-semibold text-muted-foreground">Actions</p>
        <Button
          variant="outline"
          size="sm"
          className="h-7 gap-1 text-xs w-full"
          onClick={onAutoFitWidth}
          title="Fit width to longest CSV value"
        >
          <Maximize2 className="size-3" /> Fit width
        </Button>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => onMoveSelectedToBack()}
            title="Send to back"
          >
            <ArrowDownToLine className="size-3.5" /> Send to back
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => onMoveSelectedToFront()}
            title="Bring to front"
          >
            <ArrowUpToLine className="size-3.5" /> Bring to front
          </Button>
        </div>
      </div>
    </ScrollArea>
  )
}

// Self-contained color picker with its own ref
function BulkColorPicker({
  onUpdate,
  onCommit,
  primaryColor,
}: {
  onUpdate: (updates: Partial<PlacedField>) => void
  onCommit: () => void
  primaryColor: string
}) {
  const ref = useRef<HTMLInputElement>(null)

  useLayoutEffect(() => {
    if (ref.current) {
      ref.current.value = primaryColor
    }
  }, [primaryColor])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const handleInput = (e: Event) => {
      onUpdate({ color: (e.target as HTMLInputElement).value })
    }
    const handleChange = (e: Event) => {
      onUpdate({ color: (e.target as HTMLInputElement).value })
      onCommit()
    }
    el.addEventListener("input", handleInput)
    el.addEventListener("change", handleChange)
    return () => {
      el.removeEventListener("input", handleInput)
      el.removeEventListener("change", handleChange)
    }
  }, [onUpdate, onCommit, primaryColor])

  return (
    <div className="flex items-center gap-2">
      <label
        className="relative size-11 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-border shadow-sm transition-shadow hover:ring-2 hover:ring-ring hover:ring-offset-1"
        style={{ backgroundColor: primaryColor }}
        title="Pick color"
        aria-label="Pick color"
      >
        <input
          ref={ref}
          type="color"
          defaultValue={primaryColor}
          className="absolute -inset-1 cursor-pointer opacity-0"
        />
      </label>
      <div className="flex flex-1 items-center rounded-md border border-input px-2.5 h-9">
        <span className="font-mono text-sm text-muted-foreground">#</span>
        <input
          type="text"
          value={primaryColor.replace("#", "").toUpperCase()}
          onChange={(e) => {
            const v = e.target.value.replace(/[^0-9a-fA-F]/g, "").slice(0, 6)
            onUpdate({ color: "#" + v })
          }}
          onBlur={() => onCommit()}
          aria-label="Hex color value"
          className="flex-1 bg-transparent font-mono text-sm uppercase outline-none placeholder:text-muted-foreground"
          placeholder="000000"
          maxLength={6}
        />
      </div>
    </div>
  )
}

export function Inspector({
  selectedField,
  selectedFields,
  primaryField,
  selectedFieldCount,
  onUpdate,
  onCommit,
  onUpdateCommit,
  onDuplicate,
  onDelete,
  onMoveSelectedToFront,
  onMoveSelectedToBack,
  onMoveFieldForward,
  onMoveFieldBackward,
  onAutoFitWidth,
  nativeWidth,
  nativeHeight,
}: InspectorProps) {
  const colorInputRef = useRef<HTMLInputElement>(null)

  // Sync DOM value imperatively when the field's color changes externally (undo/redo, field switch).
  // The input is uncontrolled so React won't fight the native picker's in-flight value.
  useLayoutEffect(() => {
    if (selectedField && colorInputRef.current) {
      colorInputRef.current.value = selectedField.color
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedField?.color])

  // 'input' fires on every drag frame — live preview, no snapshot.
  // 'change' fires on picker close — snapshot only (final value already applied by last 'input').
  // Uncontrolled input means React never resets .value mid-session, so e.target.value is reliable.
  useEffect(() => {
    const el = colorInputRef.current
    if (!el) return
    const handleInput = (e: Event) => {
      onUpdate({ color: (e.target as HTMLInputElement).value })
    }
    const handleChange = (e: Event) => {
      onUpdate({ color: (e.target as HTMLInputElement).value })
      onCommit()
    }
    el.addEventListener("input", handleInput)
    el.addEventListener("change", handleChange)
    return () => {
      el.removeEventListener("input", handleInput)
      el.removeEventListener("change", handleChange)
    }
  }, [onUpdate, onCommit, selectedField?.id])

  return (
    <div className="flex h-full w-75 shrink-0 flex-col overflow-hidden border-l border-border bg-card">
      {/* Header */}
      <div className="flex h-11 shrink-0 items-center gap-2 border-b border-border px-4">
        <Tag className="size-4 text-muted-foreground" />
        <span className="text-sm font-semibold">Field Inspector</span>
      </div>

      {/* Empty state / multi-select */}
      {!selectedField && selectedFieldCount === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
          <div className="flex size-14 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <Tag className="size-6" />
          </div>
          <div>
            <p className="text-sm font-semibold">No field selected</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Click a field on the template to edit its font, color, and
              position — or add one from the sidebar.
            </p>
          </div>
        </div>
      ) : selectedFieldCount > 1 ? (
        <MultiInspector
          selectedFields={selectedFields}
          primaryField={primaryField}
          onUpdate={onUpdate}
          onCommit={onCommit}
          onUpdateCommit={onUpdateCommit}
          onMoveSelectedToFront={onMoveSelectedToFront}
          onMoveSelectedToBack={onMoveSelectedToBack}
          onAutoFitWidth={onAutoFitWidth}
        />
      ) : selectedField ? (
        <ScrollArea className="flex-1">
          {/* Field header */}
            <div className="flex items-center gap-1 border-b border-border px-3 py-2">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
              {selectedField.isStatic ? <Type className="size-3.5" /> : <Tag className="size-3.5" />}
            </div>
            <div className="min-w-0 flex-1 px-1">
              {selectedField.isStatic ? (
                <Input
                  value={selectedField.fieldName}
                  onChange={(e) => onUpdate({ fieldName: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onCommit()
                  }}
                  onBlur={() => onCommit()}
                  className="h-7 text-sm font-semibold"
                />
              ) : (
                <p className="truncate text-sm font-semibold leading-tight">
                  {selectedField.fieldName}
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 shrink-0 text-muted-foreground hover:text-foreground"
              onClick={() => onDuplicate(selectedField)}
              title="Duplicate field"
            >
              <Copy className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 shrink-0 text-muted-foreground hover:text-destructive"
              onClick={() => onDelete(selectedField.id)}
              title="Delete field"
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>

          {/* Typography group */}
          <div className="flex flex-col gap-3 px-4 py-3">
            <p className="text-xs font-semibold text-muted-foreground">
              Typography
            </p>

            {/* Font family */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Font family</Label>
              <Select
                value={selectedField.font}
                onValueChange={(val: PlacedField["font"]) =>
                  onUpdateCommit({ font: val })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper">
                  <SelectItem value="Helvetica">
                    <div className="flex flex-col text-left">
                      <span className="text-sm font-medium">Helvetica</span>
                      <span className="text-[9px] text-muted-foreground leading-none">
                        Pre-installed Standard Sans
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="Times-Roman">
                    <div className="flex flex-col text-left">
                      <span className="text-sm font-medium">
                        Times New Roman
                      </span>
                      <span className="text-[9px] text-muted-foreground leading-none">
                        Pre-installed Standard Serif
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="Courier">
                    <div className="flex flex-col text-left">
                      <span className="text-sm font-medium">Courier</span>
                      <span className="text-[9px] text-muted-foreground leading-none">
                        Pre-installed Standard Mono
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="Arimo">
                    <div className="flex flex-col text-left">
                      <span className="text-sm font-medium">Arimo</span>
                      <span className="text-[9px] text-muted-foreground leading-none">
                        equivalent to Arial
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="Carlito">
                    <div className="flex flex-col text-left">
                      <span className="text-sm font-medium">Carlito</span>
                      <span className="text-[9px] text-muted-foreground leading-none">
                        equivalent to Calibri
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="EB Garamond">
                    <div className="flex flex-col text-left">
                      <span className="text-sm font-medium">EB Garamond</span>
                      <span className="text-[9px] text-muted-foreground leading-none">
                        equivalent to Garamond
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="Lora">
                    <div className="flex flex-col text-left">
                      <span className="text-sm font-medium">Lora</span>
                      <span className="text-[9px] text-muted-foreground leading-none">
                        equivalent to Georgia
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="Open Sans">
                    <div className="flex flex-col text-left">
                      <span className="text-sm font-medium">Open Sans</span>
                      <span className="text-[9px] text-muted-foreground leading-none">
                        equivalent to Tahoma / Verdana
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="Open Sans Condensed">
                    <div className="flex flex-col text-left">
                      <span className="text-sm font-medium">
                        Open Sans Condensed
                      </span>
                      <span className="text-[9px] text-muted-foreground leading-none">
                        equivalent to Tahoma / Verdana Condensed
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="Poppins">
                    <div className="flex flex-col text-left">
                      <span className="text-sm font-medium">Poppins</span>
                      <span className="text-[9px] text-muted-foreground leading-none">
                        equivalent to Geometric Sans
                      </span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Font size */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Font size</Label>
              <div className="flex items-center gap-3">
                <Slider
                  min={1}
                  max={144}
                  step={1}
                  value={[selectedField.fontSize]}
                  onValueChange={([val]) => onUpdate({ fontSize: val })}
                  onValueCommit={() => onCommit()}
                  className="flex-1"
                />
                <div className="relative w-16 shrink-0">
                  <Input
                    type="number"
                    min={1}
                    max={144}
                    value={selectedField.fontSize}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10)
                      if (!isNaN(val))
                        onUpdate({ fontSize: Math.max(1, Math.min(144, val)) })
                    }}
                    onBlur={() => onCommit()}
                    className="w-full pr-3 text-center text-sm"
                  />
                  <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    pt
                  </span>
                </div>
              </div>
            </div>

            {/* Style + alignment */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Style &amp; alignment</Label>
              <div className="flex items-center justify-between">
                {/* Bold / Italic */}
                <ToggleGroup
                  type="multiple"
                  spacing={0}
                  value={[
                    ...(selectedField.isBold ? ["bold"] : []),
                    ...(selectedField.isItalic ? ["italic"] : []),
                  ]}
                  onValueChange={(values) =>
                    onUpdateCommit({
                      isBold: values.includes("bold"),
                      isItalic: values.includes("italic"),
                    })
                  }
                  variant="outline"
                  size="sm"
                >
                  <ToggleGroupItem
                    value="bold"
                    className="w-9 font-bold"
                    title="Bold (Ctrl+B)"
                  >
                    B
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value="italic"
                    className="w-9 font-mono italic font-bold"
                    title="Italic (Ctrl+I)"
                  >
                    I
                  </ToggleGroupItem>
                </ToggleGroup>

                {/* Alignment */}
                <ToggleGroup
                  type="single"
                  spacing={0}
                  value={selectedField.align ?? "left"}
                  onValueChange={(val) => {
                    if (val)
                      onUpdateCommit({
                        align: val as "left" | "center" | "right",
                      })
                  }}
                  variant="outline"
                  size="sm"
                >
                  <ToggleGroupItem
                    value="left"
                    className="w-9"
                    title="Align left (Ctrl+Shift+L)"
                  >
                    <AlignLeft className="size-3.5" />
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value="center"
                    className="w-9"
                    title="Align center (Ctrl+Shift+E)"
                  >
                    <AlignCenter className="size-3.5" />
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value="right"
                    className="w-9"
                    title="Align right (Ctrl+Shift+R)"
                  >
                    <AlignRight className="size-3.5" />
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
            </div>
          </div>

          <Separator />

          {/* Color group */}
          <div className="flex flex-col gap-3 px-4 py-3">
            <p className="text-xs font-semibold text-muted-foreground">Color</p>

            {/* Color wheel + hex input */}
            <div className="flex items-center gap-2">
              <label
                className="relative size-11 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-border shadow-sm transition-shadow hover:ring-2 hover:ring-ring hover:ring-offset-1"
                style={{ backgroundColor: selectedField.color }}
                title="Pick color"
                aria-label="Pick color"
              >
                <input
                  ref={colorInputRef}
                  type="color"
                  defaultValue={selectedField.color}
                  className="absolute -inset-1 cursor-pointer opacity-0"
                />
              </label>
              <div className="flex flex-1 items-center rounded-md border border-input px-2.5 h-9">
                <span className="font-mono text-sm text-muted-foreground">
                  #
                </span>
                <input
                  type="text"
                  value={selectedField.color.replace("#", "").toUpperCase()}
                  onChange={(e) => {
                    const v = e.target.value
                      .replace(/[^0-9a-fA-F]/g, "")
                      .slice(0, 6)
                    onUpdate({ color: "#" + v })
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onCommit()
                  }}
                  onBlur={() => onCommit()}
                  aria-label="Hex color value"
                  className="flex-1 bg-transparent font-mono text-sm uppercase outline-none placeholder:text-muted-foreground"
                  placeholder="000000"
                  maxLength={6}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Position & size group */}
          <div className="flex flex-col gap-3 px-4 py-3">
            <p className="text-xs font-semibold text-muted-foreground">
              Position &amp; size
            </p>

            <div className="grid grid-cols-3 gap-2">
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">X</Label>
                <Input
                  type="number"
                  min={0}
                  max={nativeWidth}
                  step={1}
                  value={Math.round(selectedField.x)}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value)
                    if (!isNaN(val))
                      onUpdate({ x: Math.max(0, Math.min(nativeWidth, val)) })
                  }}
                  onBlur={() => onCommit()}
                  className="h-8 text-center text-xs"
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">Y</Label>
                <Input
                  type="number"
                  min={0}
                  max={nativeHeight}
                  step={1}
                  value={Math.round(selectedField.y)}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value)
                    if (!isNaN(val))
                      onUpdate({ y: Math.max(0, Math.min(nativeHeight, val)) })
                  }}
                  onBlur={() => onCommit()}
                  className="h-8 text-center text-xs"
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">W</Label>
                <Input
                  type="number"
                  min={10}
                  max={nativeWidth}
                  step={1}
                  value={Math.round(selectedField.width)}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value)
                    if (!isNaN(val))
                      onUpdate({
                        width: Math.max(10, Math.min(nativeWidth, val)),
                      })
                  }}
                  onBlur={() => onCommit()}
                  className="h-8 text-center text-xs"
                />
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1 text-xs w-full"
              onClick={onAutoFitWidth}
              title="Fit width to longest CSV value"
            >
              <Maximize2 className="size-3" />
              Fit width
            </Button>

            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Info className="size-3 shrink-0" />
              Arrow keys nudge position. Hold Shift for larger steps.
            </p>
          </div>

          <Separator />

          {/* Layer order group */}
          <div className="flex flex-col gap-2.5 px-4 py-3">
            <p className="text-xs font-semibold text-muted-foreground">
              Layer order
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={() => onMoveFieldBackward(selectedField.id)}
                title="Send to back (render behind all fields)"
              >
                <ArrowDownToLine className="size-3.5" />
                Send to back
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={() => onMoveFieldForward(selectedField.id)}
                title="Bring to front (render above all fields)"
              >
                <ArrowUpToLine className="size-3.5" />
                Bring to front
              </Button>
            </div>
          </div>
        </ScrollArea>
      ) : null}
    </div>
  )
}
