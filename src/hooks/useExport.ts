import { useReducer } from "react"
import type { PlacedField } from "@/types"
import { generateCombinedPDF, generateZIP } from "@/lib/pdfMerger"

type ExportState = {
  isProcessing: boolean
  processingProgress: { current: number; total: number }
  processingMessage: string
  exportDialogOpen: boolean
}

type ExportAction =
  | { type: "start"; message: string; total: number }
  | { type: "progress"; current: number; total: number }
  | { type: "done" }
  | { type: "open_dialog" }
  | { type: "close_dialog" }

const initialState: ExportState = {
  isProcessing: false,
  processingProgress: { current: 0, total: 0 },
  processingMessage: "",
  exportDialogOpen: false,
}

function exportReducer(state: ExportState, action: ExportAction): ExportState {
  switch (action.type) {
    case "start":
      return {
        ...state,
        isProcessing: true,
        processingMessage: action.message,
        processingProgress: { current: 0, total: action.total },
      }
    case "progress":
      return {
        ...state,
        processingProgress: { current: action.current, total: action.total },
      }
    case "done":
      return { ...state, isProcessing: false }
    case "open_dialog":
      return { ...state, exportDialogOpen: true }
    case "close_dialog":
      return {
        ...state,
        exportDialogOpen: false,
        processingProgress: { current: 0, total: 0 },
        processingMessage: "",
      }
    default:
      return state
  }
}

export function useExport(
  pdfBytes: ArrayBuffer | null,
  pdfFile: File | null,
  csvRows: Record<string, string>[],
  placedFields: PlacedField[],
  filenameColumn: string
) {
  const [state, dispatch] = useReducer(exportReducer, initialState)

  const handleDownloadCombinedPDF = async () => {
    if (!pdfBytes || placedFields.length === 0) return
    const rows = csvRows.length > 0 ? csvRows : [{}]
    dispatch({
      type: "start",
      message: "Generating PDF…",
      total: rows.length,
    })
    try {
      const result = await generateCombinedPDF(
        pdfBytes.slice(0),
        rows,
        placedFields,
        (current, total) => dispatch({ type: "progress", current, total })
      )
      const blob = new Blob([result.buffer as ArrayBuffer], {
        type: "application/pdf",
      })
      const link = document.createElement("a")
      link.href = URL.createObjectURL(blob)
      link.download = csvRows.length > 0
        ? `merged_${pdfFile?.name.replace(".pdf", "") || "output"}.pdf`
        : `template_${pdfFile?.name.replace(".pdf", "") || "output"}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (err) {
      console.error(err)
      alert("Error rendering PDF. See developer console for details.")
    } finally {
      dispatch({ type: "done" })
    }
  }

  const handleDownloadZIP = async () => {
    if (!pdfBytes || placedFields.length === 0 || csvRows.length === 0 || !filenameColumn)
      return
    dispatch({
      type: "start",
      message: "Packing separate PDFs into ZIP Archive…",
      total: csvRows.length,
    })
    try {
      const zipBlob = await generateZIP(
        pdfBytes.slice(0),
        csvRows,
        placedFields,
        filenameColumn,
        (current, total) => dispatch({ type: "progress", current, total })
      )
      const link = document.createElement("a")
      link.href = URL.createObjectURL(zipBlob)
      link.download = `merged_pdfs_${Date.now()}.zip`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (err) {
      console.error(err)
      alert("Error creating ZIP bundle. See developer console for details.")
    } finally {
      dispatch({ type: "done" })
    }
  }

  const handleExportDialogChange = (open: boolean) => {
    dispatch({ type: open ? "open_dialog" : "close_dialog" })
  }

  return {
    ...state,
    openExportDialog: () => dispatch({ type: "open_dialog" }),
    handleExportDialogChange,
    handleDownloadCombinedPDF,
    handleDownloadZIP,
  }
}
