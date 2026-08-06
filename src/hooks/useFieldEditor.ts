import React, { useState, useRef, useEffect, useCallback } from "react"
import type { PlacedField } from "@/types"
import type { Guide } from "@/lib/editorTypes"

// ponytail: FieldProps was a duplicate of PlacedField fields — dropped
const DEFAULT_FIELD_PROPS: Partial<PlacedField> & { visible: boolean; locked: boolean } = {
  font: "Helvetica",
  fontSize: 14,
  color: "#000000",
  isBold: false,
  isItalic: false,
  width: 100,
  align: "left",
  visible: true,
  locked: false,
}

export function useFieldEditor(
  currentPage: number,
  totalPreviewRows: number = 0,
  pdfDimensions?: { width: number; height: number },
  zoom: number = 1
) {
  const [placedFields, setPlacedFields] = useState<PlacedField[]>([])
  const [selectedFieldIds, setSelectedFieldIds] = useState<string[]>([])
  const selectedFieldId =
    selectedFieldIds.length === 1 ? selectedFieldIds[0] : null
  const setSelectedFieldId = (id: string | null) =>
    setSelectedFieldIds(id ? [id] : [])
  const [draggingFieldId, setDraggingFieldId] = useState<string | null>(null)
  const [resizingFieldId, setResizingFieldId] = useState<string | null>(null)
  const [isPreviewMode, setIsPreviewMode] = useState(false)
  const [previewRowIndex, setPreviewRowIndex] = useState(0)
  const [guides, setGuides] = useState<Guide[]>([])
  const [snapToGuides, setSnapToGuides] = useState(true)
  const [showRulers, setShowRulers] = useState(true)

  // Undo / Redo stacks (max 50 entries each)
  const [undoStack, setUndoStack] = useState<PlacedField[][]>([])
  const [redoStack, setRedoStack] = useState<PlacedField[][]>([])

  const nativeWidth = pdfDimensions
    ? Math.round(pdfDimensions.width / zoom)
    : 600
  const nativeHeight = pdfDimensions
    ? Math.round(pdfDimensions.height / zoom)
    : 800

  const containerRef = useRef<HTMLDivElement | null>(null)
  const dragStartOffset = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const resizeStartWidth = useRef<number>(0)
  const resizeStartPointerX = useRef<number>(0)
  const copiedFieldsRef = useRef<Partial<PlacedField>[]>([])
  const copiedStyleRef = useRef<Partial<PlacedField> | null>(null)
  const multiDragOrigins = useRef<{ id: string; x: number; y: number }[]>([])

  // Ref mirrors — kept current so event handlers avoid stale closures.
  const placedFieldsRef = useRef(placedFields)
  const selectedFieldIdsRef = useRef<string[]>([])
  const lastSelectedFieldIdRef = useRef<string | null>(null)

  useEffect(() => {
    placedFieldsRef.current = placedFields
  }, [placedFields])
  useEffect(() => {
    selectedFieldIdsRef.current = selectedFieldIds
    if (selectedFieldIds.length === 1)
      lastSelectedFieldIdRef.current = selectedFieldIds[0]
  }, [selectedFieldIds])

  const filterLockedIds = (ids: string[]) =>
    ids.filter(
      (id) => !placedFieldsRef.current.find((f) => f.id === id)?.locked
    )

  const getGuideSnapPoints = useCallback(
    (orientation?: "horizontal" | "vertical") => {
      const pts = guides
        .filter(
          (g) =>
            g.page === currentPage &&
            (!orientation || g.orientation === orientation)
        )
        .map((g) => g.position)
      if (orientation === "vertical" || !orientation) pts.push(0, nativeWidth)
      if (orientation === "horizontal" || !orientation)
        pts.push(0, nativeHeight)
      return pts
    },
    [guides, currentPage]
  )

  const snapWithEdge = useCallback(
    (value: number, edgeOffset: number, snapPoints: number[]): number => {
      const threshold = Math.max(8, Math.round(nativeWidth * 0.03))
      let best = value
      let bestDist = threshold
      for (const pt of snapPoints) {
        const ld = Math.abs(value - pt)
        if (ld < bestDist) {
          bestDist = ld
          best = pt
        }
        const td = Math.abs(value + edgeOffset - pt)
        const adj = pt - edgeOffset
        if (td < bestDist) {
          bestDist = td
          best = adj
        }
      }
      return best
    },
    [nativeWidth]
  )

  const canUndo = undoStack.length > 0
  const canRedo = redoStack.length > 0

  const snapshot = useCallback(() => {
    setUndoStack((prev) => [...prev.slice(-49), [...placedFieldsRef.current]])
    setRedoStack([])
  }, [])

  const undo = useCallback(() => {
    setUndoStack((prev) => {
      if (!prev.length) return prev
      const restored = prev[prev.length - 1]
      setRedoStack((r) => [...r, [...placedFieldsRef.current]])
      setPlacedFields(restored)
      setSelectedFieldIds([])
      return prev.slice(0, -1)
    })
  }, [])

  const redo = useCallback(() => {
    setRedoStack((prev) => {
      if (!prev.length) return prev
      const restored = prev[prev.length - 1]
      setUndoStack((u) => [...u, [...placedFieldsRef.current]])
      setPlacedFields(restored)
      return prev.slice(0, -1)
    })
  }, [])

  const copyStyle = () => {
    const ids = selectedFieldIdsRef.current
    if (ids.length === 0) return
    const src = placedFieldsRef.current.find(
      (f) => f.id === ids[ids.length - 1]
    )
    if (src) {
      copiedStyleRef.current = {
        font: src.font,
        fontSize: src.fontSize,
        color: src.color,
        isBold: src.isBold,
        isItalic: src.isItalic,
        align: src.align ?? "left",
      }
    }
  }

  const pasteStyle = () => {
    const ids = filterLockedIds(selectedFieldIdsRef.current)
    if (ids.length === 0 || !copiedStyleRef.current) return
    snapshot()
    setPlacedFields((prev) =>
      prev.map((f) =>
        ids.includes(f.id) ? { ...f, ...copiedStyleRef.current } : f
      )
    )
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement
      const isInputFocused =
        activeEl &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "SELECT" ||
          activeEl.tagName === "TEXTAREA")

      const ctrl = e.ctrlKey || e.metaKey

      // Undo / Redo — global, no field selection required
      if (ctrl && !isInputFocused) {
        if (e.key === "z" && !e.shiftKey) {
          e.preventDefault()
          undo()
          return
        }
        if (e.key === "y" || (e.key === "z" && e.shiftKey)) {
          e.preventDefault()
          redo()
          return
        }
      }

      // Escape — deselect all (global)
      if (e.key === "Escape" && selectedFieldIdsRef.current.length > 0) {
        e.preventDefault()
        setSelectedFieldIds([])
        return
      }

      // Preview row navigation (Ctrl+Up/Down, Ctrl+Shift+Up/Down, Ctrl+1-9)
      if (isPreviewMode && ctrl && totalPreviewRows > 0) {
        if (e.key === "ArrowUp") {
          e.preventDefault()
          setPreviewRowIndex(e.shiftKey ? 0 : (prev) => Math.max(0, prev - 1))
          return
        }
        if (e.key === "ArrowDown") {
          e.preventDefault()
          setPreviewRowIndex(
            e.shiftKey
              ? totalPreviewRows - 1
              : (prev) => Math.min(totalPreviewRows - 1, prev + 1)
          )
          return
        }
        const num = parseInt(e.key)
        if (num >= 1 && num <= 9) {
          e.preventDefault()
          setPreviewRowIndex(Math.round((num / 9) * (totalPreviewRows - 1)))
          return
        }
      }

      // Copy / Paste — no field selected required
      if (ctrl && !isInputFocused) {
        // Copy field(s) (Ctrl+C) — copy all selected
        if (
          e.key === "c" &&
          !e.shiftKey &&
          selectedFieldIdsRef.current.length > 0
        ) {
          e.preventDefault()
          const ids = selectedFieldIdsRef.current
          const selFields = placedFieldsRef.current.filter((f) =>
            ids.includes(f.id)
          )
          copiedFieldsRef.current = selFields.map((f) => ({
            fieldName: f.fieldName,
            x: f.x,
            y: f.y,
            page: f.page,
            font: f.font,
            fontSize: f.fontSize,
            color: f.color,
            isBold: f.isBold,
            isItalic: f.isItalic,
            width: f.width,
            align: f.align,
            visible: f.visible,
            isStatic: f.isStatic,
          }))
          return
        }
        // Paste field(s) (Ctrl+V)
        if (
          e.key === "v" &&
          !e.shiftKey &&
          copiedFieldsRef.current.length > 0
        ) {
          e.preventDefault()
          snapshot()
          const newFields: PlacedField[] = copiedFieldsRef.current.map(
            (src, i) => ({
              ...src,
              id: `field-${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${i}`,
              x: Math.min(
                nativeWidth,
                (src.x ?? Math.round(nativeWidth * 0.4)) +
                  Math.round(nativeWidth * 0.025) +
                  i * Math.round(nativeWidth * 0.015)
              ),
              y: Math.min(
                nativeHeight,
                (src.y ?? Math.round(nativeHeight * 0.45)) +
                  Math.round(nativeHeight * 0.025) +
                  i * Math.round(nativeHeight * 0.015)
              ),
              page: currentPage,
            })
          ) as PlacedField[]
          setPlacedFields((prev) => [...prev, ...newFields])
          setSelectedFieldIds(newFields.map((f) => f.id))
          return
        }
        // Select all (Ctrl+A) — selects all visible fields on current page
        if (e.key === "a") {
          e.preventDefault()
          const pageIds = placedFieldsRef.current
            .filter((f) => f.page === currentPage && f.visible !== false)
            .map((f) => f.id)
          if (pageIds.length > 0) setSelectedFieldIds(pageIds)
          return
        }
      }

      const ids = filterLockedIds(selectedFieldIdsRef.current)
      if (ids.length === 0 || isInputFocused) return

      // Use primary (= last selected) for single-field operations
      const primaryId = ids[ids.length - 1]

      // Tab / Shift+Tab — cycle through fields on current page
      if (e.key === "Tab") {
        e.preventDefault()
        const pageFields = placedFieldsRef.current.filter(
          (f) => f.page === currentPage
        )
        if (pageFields.length < 2) return
        const idx = pageFields.findIndex((f) => f.id === primaryId)
        if (e.shiftKey) {
          const prev =
            pageFields[(idx - 1 + pageFields.length) % pageFields.length]
          setSelectedFieldIds([prev.id])
        } else {
          const next = pageFields[(idx + 1) % pageFields.length]
          setSelectedFieldIds([next.id])
        }
        return
      }

      if (ctrl) {
        // Bold / Italic — apply to all selected
        if (e.key === "b") {
          e.preventDefault()
          snapshot()
          setPlacedFields((prev) =>
            prev.map((f) =>
              ids.includes(f.id) ? { ...f, isBold: !f.isBold } : f
            )
          )
          return
        }
        if (e.key === "i") {
          e.preventDefault()
          snapshot()
          setPlacedFields((prev) =>
            prev.map((f) =>
              ids.includes(f.id) ? { ...f, isItalic: !f.isItalic } : f
            )
          )
          return
        }
        // Alignment (Google Docs shortcuts)
        if (e.shiftKey) {
          if (e.key === "L") {
            e.preventDefault()
            snapshot()
            setPlacedFields((prev) =>
              prev.map((f) =>
                ids.includes(f.id) ? { ...f, align: "left" } : f
              )
            )
            return
          }
          if (e.key === "E") {
            e.preventDefault()
            snapshot()
            setPlacedFields((prev) =>
              prev.map((f) =>
                ids.includes(f.id) ? { ...f, align: "center" } : f
              )
            )
            return
          }
          if (e.key === "R") {
            e.preventDefault()
            snapshot()
            setPlacedFields((prev) =>
              prev.map((f) =>
                ids.includes(f.id) ? { ...f, align: "right" } : f
              )
            )
            return
          }
        }
      }

      // Layer reorder — operate on primary field
      if (e.key === "]" || e.key === "[") {
        e.preventDefault()
        const ids = filterLockedIds(selectedFieldIdsRef.current)
        if (ids.length > 1) {
          if (e.key === "]") moveSelectedToFront()
          else moveSelectedToBack()
        } else if (ids.length === 1) {
          if (e.key === "]") moveFieldForward(ids[0])
          else moveFieldBackward(ids[0])
        }
        return
      }

      // Arrow-key nudge (no ctrl) — move all selected
      if (!ctrl) {
        const step = Math.max(
          1,
          Math.round((e.shiftKey ? 0.02 : 0.005) * nativeWidth)
        )
        if (
          e.key === "ArrowLeft" ||
          e.key === "ArrowRight" ||
          e.key === "ArrowUp" ||
          e.key === "ArrowDown"
        ) {
          e.preventDefault()
          snapshot()
          const dx =
            e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0
          const dy =
            e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0
          setPlacedFields((prev) =>
            prev.map((f) =>
              ids.includes(f.id)
                ? {
                    ...f,
                    x: Math.max(
                      0,
                      Math.min(
                        nativeWidth,
                        snapToGuides
                          ? snapWithEdge(
                              f.x + dx,
                              f.width,
                              getGuideSnapPoints("vertical")
                            )
                          : f.x + dx
                      )
                    ),
                    y: Math.max(
                      0,
                      Math.min(
                        nativeHeight,
                        snapToGuides
                          ? snapWithEdge(
                              f.y + dy,
                              f.fontSize,
                              getGuideSnapPoints("horizontal")
                            )
                          : f.y + dy
                      )
                    ),
                  }
                : f
            )
          )
        } else if (e.key === "Delete" || e.key === "Backspace") {
          e.preventDefault()
          const lockedAmongSelected = placedFieldsRef.current.filter(
            (f) => ids.includes(f.id) && f.locked
          )
          if (lockedAmongSelected.length === ids.length) return
          snapshot()
          setPlacedFields((prev) =>
            prev.filter((f) => !ids.includes(f.id) || f.locked)
          )
          setSelectedFieldIds(
            lockedAmongSelected.length > 0
              ? lockedAmongSelected.map((f) => f.id)
              : []
          )
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    snapshot,
    undo,
    redo,
    currentPage,
    isPreviewMode,
    totalPreviewRows,
    setPreviewRowIndex,
  ])

  useEffect(() => {
    if (!draggingFieldId) return

    const handleMouseMove = (e: MouseEvent) => {
      const container = containerRef.current
      if (!container) return
      const rect = container.getBoundingClientRect()
      const origins = multiDragOrigins.current
      const draggedOrigin = origins.find((o) => o.id === draggingFieldId)
      if (!draggedOrigin || origins.length === 0) {
        // Fallback: single-field drag
        let xPx = (e.clientX - rect.left - dragStartOffset.current.x) / zoom
        let yPx = (e.clientY - rect.top - dragStartOffset.current.y) / zoom
        xPx = Math.max(0, Math.min(nativeWidth, xPx))
        yPx = Math.max(0, Math.min(nativeHeight, yPx))
        if (snapToGuides) {
          const f = placedFieldsRef.current.find(
            (pf) => pf.id === draggingFieldId
          )
          if (f) {
            const vPts = getGuideSnapPoints("vertical")
            const hPts = getGuideSnapPoints("horizontal")
            xPx = snapWithEdge(xPx, f.width, vPts)
            yPx = snapWithEdge(yPx, f.fontSize, hPts)
          }
        }
        setPlacedFields((prev) =>
          prev.map((f) =>
            f.id === draggingFieldId ? { ...f, x: xPx, y: yPx } : f
          )
        )
        return
      }
      let toX = (e.clientX - rect.left - dragStartOffset.current.x) / zoom
      let toY = (e.clientY - rect.top - dragStartOffset.current.y) / zoom
      if (snapToGuides) {
        const f = placedFieldsRef.current.find(
          (pf) => pf.id === draggingFieldId
        )
        if (f) {
          const vPts = getGuideSnapPoints("vertical")
          const hPts = getGuideSnapPoints("horizontal")
          toX = snapWithEdge(toX, f.width, vPts)
          toY = snapWithEdge(toY, f.fontSize, hPts)
        }
      }
      const deltaX = toX - draggedOrigin.x
      const deltaY = toY - draggedOrigin.y
      setPlacedFields((prev) =>
        prev.map((f) => {
          const orig = origins.find((o) => o.id === f.id)
          if (!orig) return f
          return {
            ...f,
            x: Math.max(0, Math.min(nativeWidth, orig.x + deltaX)),
            y: Math.max(0, Math.min(nativeHeight, orig.y + deltaY)),
          }
        })
      )
    }

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault()
      const container = containerRef.current
      if (!container) return
      const touch = e.touches[0]
      if (!touch) return
      const rect = container.getBoundingClientRect()
      const origins = multiDragOrigins.current
      const draggedOrigin = origins.find((o) => o.id === draggingFieldId)
      if (!draggedOrigin || origins.length === 0) {
        let xPx = (touch.clientX - rect.left - dragStartOffset.current.x) / zoom
        let yPx = (touch.clientY - rect.top - dragStartOffset.current.y) / zoom
        xPx = Math.max(0, Math.min(nativeWidth, xPx))
        yPx = Math.max(0, Math.min(nativeHeight, yPx))
        if (snapToGuides) {
          const f = placedFieldsRef.current.find(
            (pf) => pf.id === draggingFieldId
          )
          if (f) {
            const vPts = getGuideSnapPoints("vertical")
            const hPts = getGuideSnapPoints("horizontal")
            xPx = snapWithEdge(xPx, f.width, vPts)
            yPx = snapWithEdge(yPx, f.fontSize, hPts)
          }
        }
        setPlacedFields((prev) =>
          prev.map((f) =>
            f.id === draggingFieldId ? { ...f, x: xPx, y: yPx } : f
          )
        )
        return
      }
      let toX = (touch.clientX - rect.left - dragStartOffset.current.x) / zoom
      let toY = (touch.clientY - rect.top - dragStartOffset.current.y) / zoom
      if (snapToGuides) {
        const f = placedFieldsRef.current.find(
          (pf) => pf.id === draggingFieldId
        )
        if (f) {
          const vPts = getGuideSnapPoints("vertical")
          const hPts = getGuideSnapPoints("horizontal")
          toX = snapWithEdge(toX, f.width, vPts)
          toY = snapWithEdge(toY, f.fontSize, hPts)
        }
      }
      const deltaX = toX - draggedOrigin.x
      const deltaY = toY - draggedOrigin.y
      setPlacedFields((prev) =>
        prev.map((f) => {
          const orig = origins.find((o) => o.id === f.id)
          if (!orig) return f
          return {
            ...f,
            x: Math.max(0, Math.min(nativeWidth, orig.x + deltaX)),
            y: Math.max(0, Math.min(nativeHeight, orig.y + deltaY)),
          }
        })
      )
    }

    const handleMouseUp = () => setDraggingFieldId(null)
    const handleTouchEnd = () => setDraggingFieldId(null)

    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)
    document.addEventListener("touchmove", handleTouchMove, { passive: false })
    document.addEventListener("touchend", handleTouchEnd)

    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
      document.removeEventListener("touchmove", handleTouchMove)
      document.removeEventListener("touchend", handleTouchEnd)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draggingFieldId])

  useEffect(() => {
    if (!resizingFieldId) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return
      const deltaPx = (e.clientX - resizeStartPointerX.current) / zoom
      let newWidth = resizeStartWidth.current + deltaPx
      const activeField = placedFields.find((f) => f.id === resizingFieldId)
      const minWidthPx = activeField
        ? Math.round((activeField.fontSize / 612) * nativeWidth)
        : 10
      newWidth = Math.max(
        minWidthPx,
        Math.min(nativeWidth - (activeField?.x || 0), newWidth)
      )
      setPlacedFields((prev) =>
        prev.map((f) =>
          f.id === resizingFieldId ? { ...f, width: newWidth } : f
        )
      )
    }

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault()
      if (!containerRef.current) return
      const touch = e.touches[0]
      if (!touch) return
      const deltaPx = (touch.clientX - resizeStartPointerX.current) / zoom
      let newWidth = resizeStartWidth.current + deltaPx
      const activeField = placedFields.find((f) => f.id === resizingFieldId)
      const minWidthPx = activeField
        ? Math.round((activeField.fontSize / 612) * nativeWidth)
        : 10
      newWidth = Math.max(
        minWidthPx,
        Math.min(nativeWidth - (activeField?.x || 0), newWidth)
      )
      setPlacedFields((prev) =>
        prev.map((f) =>
          f.id === resizingFieldId ? { ...f, width: newWidth } : f
        )
      )
    }

    const handleMouseUp = () => setResizingFieldId(null)
    const handleTouchEnd = () => setResizingFieldId(null)

    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)
    document.addEventListener("touchmove", handleTouchMove, { passive: false })
    document.addEventListener("touchend", handleTouchEnd)

    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
      document.removeEventListener("touchmove", handleTouchMove)
      document.removeEventListener("touchend", handleTouchEnd)
    }
  }, [resizingFieldId, placedFields])

  const addFieldToPage = (header: string, pos?: { x: number; y: number }) => {
    snapshot()
    // Look up properties from the currently selected field, or the last selected one, or fall back to defaults.
    const primaryId =
      selectedFieldIdsRef.current[selectedFieldIdsRef.current.length - 1]
    const sourceField =
      (primaryId
        ? placedFieldsRef.current.find((f) => f.id === primaryId)
        : undefined) ??
      placedFieldsRef.current.find(
        (f) => f.id === lastSelectedFieldIdRef.current
      )
    const props: Partial<PlacedField> = sourceField
      ? {
          font: sourceField.font,
          fontSize: sourceField.fontSize,
          color: sourceField.color,
          isBold: sourceField.isBold,
          isItalic: sourceField.isItalic,
          width: sourceField.width,
          align: sourceField.align ?? "left",
        }
      : DEFAULT_FIELD_PROPS

    const newField = {
      id: `field-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      fieldName: header,
      visible: true,
      x: pos?.x ?? Math.round(nativeWidth * 0.4),
      y: pos?.y ?? Math.round(nativeHeight * 0.45),
      page: currentPage,
      ...props,
    } as PlacedField // ponytail: DEFAULT_FIELD_PROPS always supplies required fields
    setPlacedFields((prev) => [...prev, newField])
    setSelectedFieldId(newField.id)
  }

  const addStaticTextField = (pos?: { x: number; y: number }) => {
    snapshot()
    const primaryId =
      selectedFieldIdsRef.current[selectedFieldIdsRef.current.length - 1]
    const sourceField =
      (primaryId
        ? placedFieldsRef.current.find((f) => f.id === primaryId)
        : undefined) ??
      placedFieldsRef.current.find(
        (f) => f.id === lastSelectedFieldIdRef.current
      )
    const props: Partial<PlacedField> = sourceField
      ? {
          font: sourceField.font,
          fontSize: sourceField.fontSize,
          color: sourceField.color,
          isBold: sourceField.isBold,
          isItalic: sourceField.isItalic,
          width: sourceField.width,
          align: sourceField.align ?? "left",
        }
      : DEFAULT_FIELD_PROPS

    const newField = {
      id: `field-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      fieldName: "Text",
      isStatic: true,
      x: pos?.x ?? (sourceField
        ? Math.min(nativeWidth, sourceField.x + Math.round(nativeWidth * 0.02))
        : Math.round(nativeWidth * 0.3)),
      y: pos?.y ?? (sourceField
        ? Math.min(nativeHeight, sourceField.y + Math.round(nativeHeight * 0.02))
        : Math.round(nativeHeight * 0.3)),
      page: currentPage,
      ...props,
    } as PlacedField
    setPlacedFields((prev) => [...prev, newField])
    setSelectedFieldId(newField.id)
  }

  const handleDuplicateField = (field: PlacedField) => {
    snapshot()
    const newField: PlacedField = {
      ...field,
      id: `field-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      x: Math.min(nativeWidth, field.x + Math.round(nativeWidth * 0.02)),
      y: Math.min(nativeHeight, field.y + Math.round(nativeHeight * 0.02)),
    }
    setPlacedFields((prev) => [...prev, newField])
    setSelectedFieldId(newField.id)
  }

  // Stable ref-based update — no snapshot. Safe to use in long-lived event listeners
  // (e.g. native color picker 'change') because it reads selectedFieldId from the ref,
  // not a stale closure.
  const updateSelectedField = useCallback((updates: Partial<PlacedField>) => {
    const ids = filterLockedIds(selectedFieldIdsRef.current)
    if (ids.length === 0) return
    setPlacedFields((prev) =>
      prev.map((f) => (ids.includes(f.id) ? { ...f, ...updates } : f))
    )
  }, [])

  // Snapshot the current state (call at end of continuous interaction — onBlur, onValueCommit, color picker close).
  const commitSelectedField = useCallback(() => {
    snapshot()
  }, [snapshot])

  // Snapshot + update in one step — for discrete one-shot changes (font family, bold, italic, alignment).
  const updateAndCommitField = useCallback(
    (updates: Partial<PlacedField>) => {
      const ids = filterLockedIds(selectedFieldIdsRef.current)
      if (ids.length === 0) return
      snapshot()
      setPlacedFields((prev) =>
        prev.map((f) => (ids.includes(f.id) ? { ...f, ...updates } : f))
      )
    },
    [snapshot]
  )

  const removeField = (id: string) => {
    const field = placedFieldsRef.current.find((f) => f.id === id)
    if (field?.locked) return
    snapshot()
    setPlacedFields((prev) => prev.filter((f) => f.id !== id))
    if (selectedFieldId === id) setSelectedFieldId(null)
  }

  const clearAllFields = () => {
    const hasLocked = placedFieldsRef.current.some((f) => f.locked)
    if (hasLocked) {
      snapshot()
      setPlacedFields((prev) => prev.filter((f) => !f.locked))
    } else {
      snapshot()
      setPlacedFields([])
    }
    setSelectedFieldId(null)
  }

  // Layer ordering — renders last = appears on top (both DOM and pdf-lib draw order)
  // Single field: swap with neighbor (one step)
  function moveFieldForward(id: string) {
    snapshot()
    setPlacedFields((prev) => {
      const idx = prev.findIndex((f) => f.id === id)
      if (idx < 0 || idx >= prev.length - 1) return prev
      const result = [...prev]
      ;[result[idx], result[idx + 1]] = [result[idx + 1], result[idx]]
      return result
    })
  }

  function moveFieldBackward(id: string) {
    snapshot()
    setPlacedFields((prev) => {
      const idx = prev.findIndex((f) => f.id === id)
      if (idx < 0 || idx <= 0) return prev
      const result = [...prev]
      ;[result[idx], result[idx - 1]] = [result[idx - 1], result[idx]]
      return result
    })
  }

  // ponytail: moveSelectedToFront/Back merged — only diff was concat order + boundary direction
  function moveSelected(dir: "front" | "back", overrideIds?: string[]) {
    const ids = filterLockedIds(overrideIds ?? selectedFieldIdsRef.current)
    if (ids.length === 0) return
    snapshot()
    setPlacedFields((prev) => {
      let minIdx = prev.length, maxIdx = -1
      for (let i = 0; i < prev.length; i++) {
        if (ids.includes(prev[i].id)) { minIdx = Math.min(minIdx, i); maxIdx = Math.max(maxIdx, i) }
      }
      if (maxIdx < 0) return prev

      const selected = prev.filter((f) => ids.includes(f.id))
      const before = prev.filter((f) => !ids.includes(f.id) && prev.indexOf(f) < minIdx)
      const between = prev.filter((f) => !ids.includes(f.id) && prev.indexOf(f) > minIdx && prev.indexOf(f) < maxIdx)
      const after = prev.filter((f) => !ids.includes(f.id) && prev.indexOf(f) > maxIdx)

      if (between.length > 0) {
        return dir === "front"
          ? [...before, ...between, ...selected, ...after]
          : [...before, ...selected, ...between, ...after]
      }

      if (dir === "front") {
        if (maxIdx >= prev.length - 1) return prev
        const pivot = prev[maxIdx + 1]
        const others = [...before, ...after]
        const si = others.indexOf(pivot)
        if (si < 0) return prev
        return [...others.slice(0, si + 1), ...selected, ...others.slice(si + 1)]
      } else {
        if (minIdx <= 0) return prev
        const pivot = prev[minIdx - 1]
        const others = [...before, ...after]
        const si = others.indexOf(pivot)
        if (si < 0) return prev
        return [...others.slice(0, si), ...selected, ...others.slice(si)]
      }
    })
  }

  function moveSelectedToFront(overrideIds?: string[]) { moveSelected("front", overrideIds) }
  function moveSelectedToBack(overrideIds?: string[]) { moveSelected("back", overrideIds) }


  // displayOrderIds: topmost-first (index 0 = renders on top).
  // Reverses before storing so last in array = topmost (matches DOM/pdf-lib draw order).
  const reorderFields = useCallback(
    (displayOrderIds: string[]) => {
      snapshot()
      setPlacedFields((prev) => {
        const map = new Map(prev.map((f) => [f.id, f]))
        return [...displayOrderIds]
          .reverse()
          .map((id) => map.get(id))
          .filter(Boolean) as PlacedField[]
      })
    },
    [snapshot]
  )

  const handleMouseDown = (e: React.MouseEvent, field: PlacedField) => {
    if (field.locked) return
    e.preventDefault()
    e.stopPropagation()
    if (isPreviewMode) return
    // Ignore right-click — context menu handles it
    if (e.button !== 0) return
    // Ctrl+click toggles selection
    if (e.ctrlKey || e.metaKey) {
      setSelectedFieldIds((prev) =>
        prev.includes(field.id)
          ? prev.filter((fid) => fid !== field.id)
          : [...prev, field.id]
      )
      return
    }
    const currentIds = selectedFieldIdsRef.current
    if (!currentIds.includes(field.id)) {
      setSelectedFieldIds([field.id])
      return
    }
    snapshot()
    const rect = e.currentTarget.getBoundingClientRect()
    dragStartOffset.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    }
    // Store starting positions of all selected fields for multi-drag
    multiDragOrigins.current = placedFieldsRef.current
      .filter((f) => currentIds.includes(f.id) && !f.locked)
      .map((f) => ({ id: f.id, x: f.x, y: f.y }))
    setDraggingFieldId(field.id)
  }

  const handleTouchStart = (e: React.TouchEvent, field: PlacedField) => {
    if (field.locked) return
    e.stopPropagation()
    if (isPreviewMode) return
    if (!selectedFieldIds.includes(field.id)) {
      setSelectedFieldIds([field.id])
      return
    }
    snapshot()
    const rect = e.currentTarget.getBoundingClientRect()
    const touch = e.touches[0]
    if (touch) {
      dragStartOffset.current = {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      }
      setDraggingFieldId(field.id)
    }
  }

  const handleResizeMouseDown = (e: React.MouseEvent, field: PlacedField) => {
    if (field.locked) return
    e.preventDefault()
    e.stopPropagation()
    if (isPreviewMode) return
    snapshot()
    setResizingFieldId(field.id)
    resizeStartWidth.current = field.width
    resizeStartPointerX.current = e.clientX
  }

  const handleResizeTouchStart = (e: React.TouchEvent, field: PlacedField) => {
    if (field.locked) return
    e.stopPropagation()
    if (isPreviewMode) return
    const touch = e.touches[0]
    if (touch) {
      snapshot()
      setResizingFieldId(field.id)
      resizeStartWidth.current = field.width
      resizeStartPointerX.current = touch.clientX
    }
  }

  const autoFitWidth = (csvRows: Record<string, string>[]) => {
    const ids = filterLockedIds(selectedFieldIdsRef.current)
    if (ids.length === 0) return
    const field = placedFieldsRef.current.find(
      (f) => f.id === ids[ids.length - 1]
    )
    if (!field || field.locked) return
    // Static fields: fit to own text. CSV fields: find longest value across rows.
    const longest = field.isStatic
      ? field.fieldName
      : csvRows.reduce((a, b) => (a.length > (b[field.fieldName] || "").length ? a : b[field.fieldName] || ""), "")
    const charWidth = 0.6
    const estWidthPx = longest.length * (field.fontSize || 12) * charWidth
    const finalWidth = Math.max(
      10,
      Math.min(nativeWidth, Math.round(estWidthPx))
    )
    snapshot()
    setPlacedFields((prev) =>
      prev.map((f) => (f.id === field.id ? { ...f, width: finalWidth } : f))
    )
  }

  const toggleFieldLock = (id: string) => {
    snapshot()
    setPlacedFields((prev) =>
      prev.map((f) => (f.id === id ? { ...f, locked: !f.locked } : f))
    )
  }

  const toggleFieldVisibility = (id: string) => {
    setPlacedFields((prev) =>
      prev.map((f) => (f.id === id ? { ...f, visible: !f.visible } : f))
    )
  }

  const addGuide = (orientation: Guide["orientation"], position: number) => {
    const newGuide: Guide = {
      id: `guide-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      orientation,
      position,
      page: currentPage,
    }
    setGuides((prev) => [...prev, newGuide])
  }

  const removeGuide = (id: string) => {
    setGuides((prev) => prev.filter((g) => g.id !== id))
  }

  const updateGuidePosition = (id: string, position: number) => {
    setGuides((prev) => prev.map((g) => (g.id === id ? { ...g, position } : g)))
  }

  const resetFields = () => {
    setPlacedFields([])
    setSelectedFieldId(null)
    setUndoStack([])
    setRedoStack([])
  }

  return {
    placedFields,
    selectedFieldIds,
    selectedFieldId,
    isPreviewMode,
    previewRowIndex,
    containerRef,
    canUndo,
    canRedo,
    setPlacedFields,
    setSelectedFieldId,
    setSelectedFieldIds,
    setIsPreviewMode,
    setPreviewRowIndex,
    addFieldToPage,
    addStaticTextField,
    handleDuplicateField,
    updateSelectedField,
    commitSelectedField,
    updateAndCommitField,
    removeField,
    clearAllFields,
    moveFieldForward,
    moveFieldBackward,
    moveSelectedToFront,
    moveSelectedToBack,
    reorderFields,
    toggleFieldLock,
    toggleFieldVisibility,
    autoFitWidth,
    guides,
    snapToGuides,
    setSnapToGuides,
    showRulers,
    setShowRulers,
    addGuide,
    removeGuide,
    updateGuidePosition,
    copyStyle,
    pasteStyle,
    undo,
    redo,
    handleMouseDown,
    handleTouchStart,
    handleResizeMouseDown,
    handleResizeTouchStart,
    resetFields,
    // ponytail: expose so App.tsx doesn't recompute the same formula
    nativeWidth,
    nativeHeight,
  }
}
