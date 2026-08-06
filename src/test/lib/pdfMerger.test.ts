import { describe, it, expect } from "vitest"
import { translateCoordinates, hexToRgb } from "@/lib/pdfMerger"

describe("translateCoordinates", () => {
  const pdfWidth = 612
  const pdfHeight = 792

  it("converts top-left (0,0) to bottom-left with baseline offset", () => {
    const result = translateCoordinates(0, 0, pdfWidth, pdfHeight, 14)
    expect(result.x).toBe(0)
    expect(result.y).toBe(pdfHeight - 0 - 14 * 0.95)
  })

  it("converts center (50,50) correctly", () => {
    const result = translateCoordinates(50, 50, pdfWidth, pdfHeight, 14)
    expect(result.x).toBe(50)
    expect(result.y).toBe(pdfHeight - 50 - 14 * 0.95)
  })

  it("converts bottom-right (100,100) correctly", () => {
    const result = translateCoordinates(100, 100, pdfWidth, pdfHeight, 14)
    expect(result.x).toBe(100)
    expect(result.y).toBe(pdfHeight - 100 - 14 * 0.95)
  })

  it("uses fontSize * 0.95 as baseline offset", () => {
    const fontSize = 24
    const result = translateCoordinates(0, 0, pdfWidth, pdfHeight, fontSize)
    expect(result.y).toBe(pdfHeight - fontSize * 0.95)
  })

  it("handles different PDF dimensions", () => {
    const result = translateCoordinates(25, 75, 100, 200, 10)
    expect(result.x).toBe(25)
    expect(result.y).toBe(200 - 75 - 10 * 0.95)
  })

  it("handles zero fontSize", () => {
    const result = translateCoordinates(0, 0, pdfWidth, pdfHeight, 0)
    expect(result.y).toBe(pdfHeight)
  })
})

describe("hexToRgb", () => {
  it("parses full hex #000000", () => {
    const result = hexToRgb("#000000")
    expect(result.r).toBe(0)
    expect(result.g).toBe(0)
    expect(result.b).toBe(0)
  })

  it("parses full hex #ffffff", () => {
    const result = hexToRgb("#ffffff")
    expect(result.r).toBe(1)
    expect(result.g).toBe(1)
    expect(result.b).toBe(1)
  })

  it("parses hex #aa3bff", () => {
    const result = hexToRgb("#aa3bff")
    expect(result.r).toBeCloseTo(0.6667, 3)
    expect(result.g).toBeCloseTo(0.2314, 3)
    expect(result.b).toBe(1)
  })

  it("handles hex without # prefix", () => {
    const result = hexToRgb("ff0000")
    expect(result.r).toBe(1)
    expect(result.g).toBe(0)
    expect(result.b).toBe(0)
  })

  it("falls back to 0 for invalid hex characters", () => {
    const result = hexToRgb("#gggggg")
    expect(result.r).toBe(0)
    expect(result.g).toBe(0)
    expect(result.b).toBe(0)
  })

  it("handles empty string", () => {
    const result = hexToRgb("")
    expect(result.r).toBe(0)
    expect(result.g).toBe(0)
    expect(result.b).toBe(0)
  })

  it("handles short hex #fff (bit-shift partial parse, no short-hex expansion)", () => {
    const result = hexToRgb("#fff")
    // parseInt('fff',16) = 4095 → (4095 >> 16 & 255) = 0
    expect(result.r).toBeCloseTo(0, 3)
    // (4095 >> 8 & 255) = 15 → 15/255 ≈ 0.059
    expect(result.g).toBeCloseTo(15 / 255, 3)
    // (4095 & 255) = 255 → 1
    expect(result.b).toBe(1)
  })
})
