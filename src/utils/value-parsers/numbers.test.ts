import { describe, expect, it } from "vitest"
import { parseDecimalFloatingPoint, parseDecimalInteger, parseVersion } from "./numbers.js"

describe("numbers", () => {
  it("keeps uint64 values exact and reports invalid integers consistently", () => {
    expect(parseDecimalInteger("0")).toBe(0n)
    expect(parseDecimalInteger("9007199254740993")).toBe(9007199254740993n)
    expect(parseDecimalInteger("18446744073709551615")).toBe(18446744073709551615n)

    for (const raw of [
      "",
      "18446744073709551616",
      "0".repeat(21),
      "-1",
      "1e3",
      "1.5",
      '"2"',
      " 1",
      "1\n",
    ]) {
      expect(() => parseDecimalInteger(raw)).toThrow(
        expect.objectContaining({ code: "INVALID_NUMBER", sourceFragment: raw }),
      )
    }
  })

  it("preserves decimal notation and rejects invalid or unrepresentable values", () => {
    for (const [raw, value] of [
      ["0", 0],
      [".5", 0.5],
      ["5.", 5],
      ["29.970", 29.97],
    ] as const) {
      expect(parseDecimalFloatingPoint(raw)).toEqual({ raw, value })
    }
    for (const raw of [
      "",
      ".",
      "1.2.3",
      "1e3",
      "-1",
      "1\n",
      "9".repeat(400),
      `0.${"0".repeat(400)}1`,
    ]) {
      expect(() => parseDecimalFloatingPoint(raw)).toThrow(
        expect.objectContaining({ code: "INVALID_NUMBER" }),
      )
    }
  })

  it("accepts positive safe integer versions, including future versions", () => {
    expect(parseVersion("0008")).toBe(8)
    for (const raw of ["0", "-1", "1.0", "1e3", "9007199254740992"]) {
      expect(() => parseVersion(raw)).toThrow(expect.objectContaining({ code: "INVALID_NUMBER" }))
    }
  })
})
