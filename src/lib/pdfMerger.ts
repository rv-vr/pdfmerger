import {
  PDFDocument,
  rgb,
  StandardFonts,
  pushGraphicsState,
  popGraphicsState,
  moveTo,
  lineTo,
  closePath,
  clip,
  endPath,
} from "pdf-lib"
import JSZip from "jszip"
import fontkit from "@pdf-lib/fontkit"

export interface PlacedField {
  id: string
  fieldName: string
  x: number // PDF-native points from left
  y: number // PDF-native points from top
  page: number // page number (1-indexed)
  font:
    | "Helvetica"
    | "Times-Roman"
    | "Courier"
    | "Arimo"
    | "Carlito"
    | "EB Garamond"
    | "Lora"
    | "Open Sans"
    | "Open Sans Condensed"
    | "Poppins"
  fontSize: number
  color: string // hex color (e.g. #000000)
  isBold: boolean
  isItalic: boolean
  width: number // width in PDF-native points
  align?: "left" | "center" | "right"
  visible?: boolean
  locked?: boolean
  isStatic?: boolean
}

/**
 * Translates canvas coordinates (top-left origin) into PDF points (bottom-left origin).
 * x/y are stored in PDF-native points.
 */
export function translateCoordinates(
  x: number,
  y: number,
  _pdfWidth: number,
  pdfHeight: number,
  fontSize: number
): { x: number; y: number } {
  void _pdfWidth
  // Canvas y starts at 0 at the top, PDF y starts at 0 at the bottom.
  // The baseline of the text inside the box starts at roughly 95% of font size below the top of the box.
  return { x, y: pdfHeight - y - fontSize * 0.95 }
}

// ponytail: bit-shift parse — same result as substring/parseInt x3
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const n = parseInt(hex.replace("#", ""), 16) || 0
  return { r: (n >> 16 & 255) / 255, g: (n >> 8 & 255) / 255, b: (n & 255) / 255 }
}

const base = import.meta.env.BASE_URL

const GOOGLE_FONTS_URLS: Record<
  string,
  { regular: string; bold: string; italic: string; boldItalic: string }
> = {
  Arimo: {
    regular: `${base}fonts/Arimo/Arimo-Regular.ttf`,
    bold: `${base}fonts/Arimo/Arimo-Bold.ttf`,
    italic: `${base}fonts/Arimo/Arimo-Italic.ttf`,
    boldItalic: `${base}fonts/Arimo/Arimo-BoldItalic.ttf`,
  },
  Carlito: {
    regular: `${base}fonts/Carlito/Carlito-Regular.ttf`,
    bold: `${base}fonts/Carlito/Carlito-Bold.ttf`,
    italic: `${base}fonts/Carlito/Carlito-Italic.ttf`,
    boldItalic: `${base}fonts/Carlito/Carlito-BoldItalic.ttf`,
  },
  "EB Garamond": {
    regular: `${base}fonts/EB_Garamond/EBGaramond-Regular.ttf`,
    bold: `${base}fonts/EB_Garamond/EBGaramond-Bold.ttf`,
    italic: `${base}fonts/EB_Garamond/EBGaramond-Italic.ttf`,
    boldItalic: `${base}fonts/EB_Garamond/EBGaramond-BoldItalic.ttf`,
  },
  Lora: {
    regular: `${base}fonts/Lora/Lora-Regular.ttf`,
    bold: `${base}fonts/Lora/Lora-Bold.ttf`,
    italic: `${base}fonts/Lora/Lora-Italic.ttf`,
    boldItalic: `${base}fonts/Lora/Lora-BoldItalic.ttf`,
  },
  "Open Sans": {
    regular: `${base}fonts/Open_Sans/OpenSans-Regular.ttf`,
    bold: `${base}fonts/Open_Sans/OpenSans-Bold.ttf`,
    italic: `${base}fonts/Open_Sans/OpenSans-Italic.ttf`,
    boldItalic: `${base}fonts/Open_Sans/OpenSans-BoldItalic.ttf`,
  },
  "Open Sans Condensed": {
    regular: `${base}fonts/Open_Sans/OpenSans_Condensed-Regular.ttf`,
    bold: `${base}fonts/Open_Sans/OpenSans_Condensed-Bold.ttf`,
    italic: `${base}fonts/Open_Sans/OpenSans_Condensed-Italic.ttf`,
    boldItalic: `${base}fonts/Open_Sans/OpenSans_Condensed-BoldItalic.ttf`,
  },
  Poppins: {
    regular: `${base}fonts/Poppins/Poppins-Regular.ttf`,
    bold: `${base}fonts/Poppins/Poppins-Bold.ttf`,
    italic: `${base}fonts/Poppins/Poppins-Italic.ttf`,
    boldItalic: `${base}fonts/Poppins/Poppins-BoldItalic.ttf`,
  },
}

const fontBytesCache = new Map<string, ArrayBuffer>()

async function getEmbeddedFont(
  pdfDoc: PDFDocument,
  fontType: string,
  isBold: boolean,
  isItalic: boolean
) {
  if (
    fontType === "Helvetica" ||
    fontType === "Times-Roman" ||
    fontType === "Courier"
  ) {
    let standardName: StandardFonts

    if (fontType === "Helvetica") {
      if (isBold && isItalic) standardName = StandardFonts.HelveticaBoldOblique
      else if (isBold) standardName = StandardFonts.HelveticaBold
      else if (isItalic) standardName = StandardFonts.HelveticaOblique
      else standardName = StandardFonts.Helvetica
    } else if (fontType === "Times-Roman") {
      if (isBold && isItalic) standardName = StandardFonts.TimesRomanBoldItalic
      else if (isBold) standardName = StandardFonts.TimesRomanBold
      else if (isItalic) standardName = StandardFonts.TimesRomanItalic
      else standardName = StandardFonts.TimesRoman
    } else {
      if (isBold && isItalic) standardName = StandardFonts.CourierBoldOblique
      else if (isBold) standardName = StandardFonts.CourierBold
      else if (isItalic) standardName = StandardFonts.CourierOblique
      else standardName = StandardFonts.Courier
    }

    return await pdfDoc.embedFont(standardName)
  }

  const fontUrls = GOOGLE_FONTS_URLS[fontType]
  if (!fontUrls) {
    return await pdfDoc.embedFont(StandardFonts.Helvetica)
  }

  let url = fontUrls.regular
  if (isBold && isItalic) url = fontUrls.boldItalic
  else if (isBold) url = fontUrls.bold
  else if (isItalic) url = fontUrls.italic

  const cacheKey = `${fontType}|${isBold}|${isItalic}`
  let bytes = fontBytesCache.get(cacheKey)
  if (!bytes) {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to fetch font from ${url}`)
    }
    bytes = await response.arrayBuffer()
    fontBytesCache.set(cacheKey, bytes)
  }

  pdfDoc.registerFontkit(fontkit)
  return await pdfDoc.embedFont(bytes, { subset: true })
}

/**
 * Generates a single merged PDF with values replaced for a specific CSV row.
 */
async function generateSingleMergedPDF(
  templateBytes: ArrayBuffer,
  row: Record<string, string>,
  fields: PlacedField[]
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(templateBytes.slice(0))

  // Flatten template form fields if they exist to save space and remove interactive widgets
  try {
    const form = pdfDoc.getForm()
    if (form && form.getFields().length > 0) {
      form.updateFieldAppearances()
      form.flatten()
    }
  } catch (e) {
    console.warn("Failed to flatten template form fields:", e)
  }

  const pages = pdfDoc.getPages()

  // Pre-load all unique font combinations in parallel — avoids await inside the field loop
  const uniqueFontKeys = [
    ...new Set(fields.map((f) => `${f.font}|${f.isBold}|${f.isItalic}`)),
  ]
  const fontEntries = await Promise.all(
    uniqueFontKeys.map(async (key) => {
      const [fontType, isBoldStr, isItalicStr] = key.split("|")
      const font = await getEmbeddedFont(
        pdfDoc,
        fontType,
        isBoldStr === "true",
        isItalicStr === "true"
      )
      return [key, font] as const
    })
  )
  const fontCache = new Map(fontEntries)

  for (const field of fields) {
    const pageIndex = field.page - 1
    if (pageIndex < 0 || pageIndex >= pages.length) continue

    const page = pages[pageIndex]
    const { width: pdfWidth, height: pdfHeight } = page.getSize()

    // Resolve the value from the CSV row, fallback to field placeholder name.
    // Static fields use their own fieldName as the display text.
    const textValue = field.isStatic
      ? field.fieldName
      : row[field.fieldName] !== undefined
        ? row[field.fieldName]
        : `{{${field.fieldName}}}`

    const font = fontCache.get(
      `${field.font}|${field.isBold}|${field.isItalic}`
    )!

    // Translate coordinate (canvas top-left percentage -> PDF bottom-left points)
    const { x: xOrig, y } = translateCoordinates(
      field.x,
      field.y,
      pdfWidth,
      pdfHeight,
      field.fontSize
    )
    let x = xOrig

    // Apply text alignment within the field box
    const fieldWidthPts = field.width
    const align = field.align ?? "left"
    if (align !== "left") {
      const textWidth = font.widthOfTextAtSize(textValue, field.fontSize)
      if (align === "center") x += (fieldWidthPts - textWidth) / 2
      else if (align === "right") x += fieldWidthPts - textWidth
    }

    const { r, g, b } = hexToRgb(field.color)

    // Bounding box for clipping path
    const clipX = x
    const clipWidth = field.width
    const clipHeight = field.fontSize * 1.2
    // Bounding box Y-bottom (PDF origin is bottom-left)
    const clipY = pdfHeight - field.y - clipHeight

    // Apply clipping path to restrict text rendering inside the box
    page.pushOperators(
      pushGraphicsState(),
      moveTo(clipX, clipY),
      lineTo(clipX, clipY + clipHeight),
      lineTo(clipX + clipWidth, clipY + clipHeight),
      lineTo(clipX + clipWidth, clipY),
      closePath(),
      clip(),
      endPath()
    )

    // Draw the text
    page.drawText(textValue, {
      x,
      y,
      size: field.fontSize,
      font,
      color: rgb(r, g, b),
    })

    // Restore graphics state to disable clipping for next page operations
    page.pushOperators(popGraphicsState())
  }

  return await pdfDoc.save()
}

/**
 * Combines all CSV rows into a single PDF document.
 * Each CSV row generates a copy of all the template pages filled with its data.
 * Optimized to copy all pages in a single call to share resources, and embeds fonts once.
 */
export async function generateCombinedPDF(
  templateBytes: ArrayBuffer,
  rows: Record<string, string>[],
  fields: PlacedField[],
  onProgress?: (current: number, total: number) => void
): Promise<Uint8Array> {
  const finalDoc = await PDFDocument.create()
  const templateDoc = await PDFDocument.load(templateBytes.slice(0))

  // Flatten template form fields if they exist to save space and remove interactive widgets
  try {
    const templateForm = templateDoc.getForm()
    if (templateForm && templateForm.getFields().length > 0) {
      templateForm.updateFieldAppearances()
      templateForm.flatten()
    }
  } catch (e) {
    console.warn("Failed to flatten template form fields:", e)
  }

  const templatePageCount = templateDoc.getPageCount()
  const total = rows.length

  // Pre-load all unique font combinations in parallel on finalDoc — embeds them exactly once
  const uniqueFontKeys = [
    ...new Set(fields.map((f) => `${f.font}|${f.isBold}|${f.isItalic}`)),
  ]
  const fontEntries = await Promise.all(
    uniqueFontKeys.map(async (key) => {
      const [fontType, isBoldStr, isItalicStr] = key.split("|")
      const font = await getEmbeddedFont(
        finalDoc,
        fontType,
        isBoldStr === "true",
        isItalicStr === "true"
      )
      return [key, font] as const
    })
  )
  const fontCache = new Map(fontEntries)

  // Construct a repeated indices array to copy all pages in a single call.
  // This allows pdf-lib to share duplicated background images and resources across all copied pages.
  const repeatedIndices: number[] = []
  for (let i = 0; i < total; i++) {
    for (let p = 0; p < templatePageCount; p++) {
      repeatedIndices.push(p)
    }
  }

  const copiedPages = await finalDoc.copyPages(templateDoc, repeatedIndices)
  copiedPages.forEach((page) => {
    finalDoc.addPage(page)
  })

  const finalPages = finalDoc.getPages()

  // Draw the text fields for each row
  for (let i = 0; i < total; i++) {
    const row = rows[i]
    const pageOffset = i * templatePageCount

    for (const field of fields) {
      const relativePageIndex = field.page - 1
      const targetPageIndex = pageOffset + relativePageIndex
      if (targetPageIndex < 0 || targetPageIndex >= finalPages.length) continue

      const page = finalPages[targetPageIndex]
      const { width: pdfWidth, height: pdfHeight } = page.getSize()

      // Resolve the value from the CSV row, fallback to field placeholder name.
      // Static fields use their own fieldName as the display text.
      const textValue = field.isStatic
        ? field.fieldName
        : row[field.fieldName] !== undefined
          ? row[field.fieldName]
          : `{{${field.fieldName}}}`

      const font = fontCache.get(
        `${field.font}|${field.isBold}|${field.isItalic}`
      )!

      // Translate coordinate (canvas top-left percentage -> PDF bottom-left points)
      const { x: xOrig, y } = translateCoordinates(
        field.x,
        field.y,
        pdfWidth,
        pdfHeight,
        field.fontSize
      )
      let x = xOrig

      // Apply text alignment within the field box
      const fieldWidthPts = field.width
      const align = field.align ?? "left"
      if (align !== "left") {
        const textWidth = font.widthOfTextAtSize(textValue, field.fontSize)
        if (align === "center") x += (fieldWidthPts - textWidth) / 2
        else if (align === "right") x += fieldWidthPts - textWidth
      }

      const { r, g, b } = hexToRgb(field.color)

      // Bounding box for clipping path
      const clipX = x
      const clipWidth = field.width
      const clipHeight = field.fontSize * 1.2
      // Bounding box Y-bottom (PDF origin is bottom-left)
      const clipY = pdfHeight - field.y - clipHeight

      // Apply clipping path to restrict text rendering inside the box
      page.pushOperators(
        pushGraphicsState(),
        moveTo(clipX, clipY),
        lineTo(clipX, clipY + clipHeight),
        lineTo(clipX + clipWidth, clipY + clipHeight),
        lineTo(clipX + clipWidth, clipY),
        closePath(),
        clip(),
        endPath()
      )

      // Draw the text
      page.drawText(textValue, {
        x,
        y,
        size: field.fontSize,
        font,
        color: rgb(r, g, b),
      })

      // Restore graphics state to disable clipping for next page operations
      page.pushOperators(popGraphicsState())
    }

    if (onProgress) {
      onProgress(i + 1, total)
    }

    // Yield execution slightly for UI responsiveness in large jobs
    if (i % 5 === 0) {
      await new Promise((resolve) => setTimeout(resolve, 0))
    }
  }

  // Double-check and flatten form fields in the final combined doc as a failsafe
  try {
    const finalForm = finalDoc.getForm()
    if (finalForm && finalForm.getFields().length > 0) {
      finalForm.updateFieldAppearances()
      finalForm.flatten()
    }
  } catch (e) {
    console.warn("Failed to flatten final document form fields:", e)
  }

  return await finalDoc.save()
}

/**
 * Generates separate PDF files for each CSV row and packs them into a ZIP file.
 */
export async function generateZIP(
  templateBytes: ArrayBuffer,
  rows: Record<string, string>[],
  fields: PlacedField[],
  filenameColumn: string,
  onProgress?: (current: number, total: number) => void
): Promise<Blob> {
  const zip = new JSZip()
  const total = rows.length

  for (let i = 0; i < total; i++) {
    const row = rows[i]

    // Generate PDF for this row
    const pdfBytes = await generateSingleMergedPDF(templateBytes, row, fields)

    // Determine file name
    const rawName = row[filenameColumn]
      ? row[filenameColumn].trim()
      : `row-${i + 1}`
    // Sanitize filename to avoid path traversal / invalid characters
    const sanitizedName = rawName.replace(/[/\\?%*:|"<>. ]/g, "_")
    const filename = `${sanitizedName || `row_${i + 1}`}.pdf`

    zip.file(filename, pdfBytes)

    if (onProgress) {
      onProgress(i + 1, total)
    }

    // Yield execution for UI responsiveness
    if (i % 5 === 0) {
      await new Promise((resolve) => setTimeout(resolve, 0))
    }
  }

  return await zip.generateAsync({ type: "blob" })
}
