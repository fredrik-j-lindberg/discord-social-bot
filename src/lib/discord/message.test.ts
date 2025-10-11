import { describe, expect, test } from "vitest"

import { extractEmojisFromMessage } from "./message"

describe("extractEmojisFromMessage", () => {
  test("should return an empty array for null or empty input", () => {
    expect(extractEmojisFromMessage(null)).toEqual([])
    expect(extractEmojisFromMessage(undefined)).toEqual([])
    expect(extractEmojisFromMessage("")).toEqual([])
  })

  test("should return an empty array if no emojis are present", () => {
    expect(extractEmojisFromMessage("Hello world!")).toEqual([])
  })

  test("should extract a single standard emoji", () => {
    expect(extractEmojisFromMessage("Hello 👋")).toEqual([
      { name: "👋", id: null },
    ])
  })

  test("should extract multiple standard emojis", () => {
    expect(extractEmojisFromMessage("Hello 👋 world 🌍")).toEqual([
      { name: "👋", id: null },
      { name: "🌍", id: null },
    ])
  })

  test("should extract the name of a single custom emoji", () => {
    expect(extractEmojisFromMessage("Hello <:custom:12345>")).toEqual([
      { name: "custom", id: "12345" },
    ])
  })

  test("should extract the name of multiple custom emojis", () => {
    expect(
      extractEmojisFromMessage("Hello <:custom:12345> and <:another:54321>"),
    ).toEqual([
      { name: "custom", id: "12345" },
      { name: "another", id: "54321" },
    ])
  })

  test("should extract a mix of standard and custom emojis", () => {
    expect(
      extractEmojisFromMessage("Hello 👋 <:custom:12345> world 🌍"),
    ).toEqual([
      { name: "👋", id: null },
      { name: "custom", id: "12345" },
      { name: "🌍", id: null },
    ])
  })

  test("should handle emojis at the start and end of the string", () => {
    expect(extractEmojisFromMessage("👋 Hello world 🌍")).toEqual([
      { name: "👋", id: null },
      { name: "🌍", id: null },
    ])
  })

  test("should handle emojis with no surrounding text", () => {
    expect(extractEmojisFromMessage("👋<:custom:12345>🌍")).toEqual([
      { name: "👋", id: null },
      { name: "custom", id: "12345" },
      { name: "🌍", id: null },
    ])
  })
})
