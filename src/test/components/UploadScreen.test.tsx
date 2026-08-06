import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { UploadScreen } from "@/components/app/UploadScreen"

describe("UploadScreen", () => {
  const baseProps = {
    pdfFile: null,
    csvFileName: "",
    csvRows: [] as Record<string, string>[],
    csvHeaders: [] as string[],
    onPdfUpload: vi.fn(),
    onCsvUpload: vi.fn(),
    onContinue: vi.fn(),
  }

  it("renders upload screen header", () => {
    render(<UploadScreen {...baseProps} />)
    expect(screen.getByText(/Bulk-merge/i)).toBeInTheDocument()
  })

  it('shows "Upload a PDF template to continue" when no files', () => {
    render(<UploadScreen {...baseProps} />)
    expect(
      screen.getByText("Upload a PDF template to continue")
    ).toBeInTheDocument()
  })

  it("disables continue button when not ready", () => {
    render(<UploadScreen {...baseProps} />)
    expect(screen.getByText("Upload PDF to start")).toBeDisabled()
  })

  it('shows "PDF + CSV ready" when both uploaded', () => {
    render(
      <UploadScreen
        {...baseProps}
        pdfFile={new File([""], "test.pdf")}
        csvRows={[{ name: "Alice" }]}
      />
    )
    expect(screen.getByText("PDF + CSV ready")).toBeInTheDocument()
  })

  it("enables continue button when ready", () => {
    render(
      <UploadScreen
        {...baseProps}
        pdfFile={new File([""], "test.pdf")}
        csvRows={[{ name: "Alice" }]}
      />
    )
    expect(screen.getByText("Open editor")).not.toBeDisabled()
  })

  it("shows pdf dropzone with choose file button", () => {
    render(<UploadScreen {...baseProps} />)
    expect(screen.getByText("Choose .pdf")).toBeInTheDocument()
  })

  it("shows csv dropzone with choose file button", () => {
    render(<UploadScreen {...baseProps} />)
    expect(screen.getByText("Choose .csv")).toBeInTheDocument()
  })
})
