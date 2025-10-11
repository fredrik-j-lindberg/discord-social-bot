import { describe, expect, test } from "vitest"

import { extractEmojisFromMessage } from "./message"

describe("extractEmojisFromMessage", () => {
  test("should return an empty array for null or empty input", () => {
    expect(extractEmojisFromMessage({ text: null })).toEqual([])
    expect(extractEmojisFromMessage({ text: undefined })).toEqual([])
    expect(extractEmojisFromMessage({ text: "" })).toEqual([])
  })

  test("should return an empty array if no emojis are present", () => {
    expect(extractEmojisFromMessage({ text: "Hello world!" })).toEqual([])
  })

  test("should extract a single standard emoji", () => {
    expect(extractEmojisFromMessage({ text: "Hello 👋" })).toEqual([
      { name: "👋", id: null },
    ])
  })

  test("should extract multiple standard emojis", () => {
    expect(extractEmojisFromMessage({ text: "Hello 👋 world 🌍" })).toEqual([
      { name: "👋", id: null },
      { name: "🌍", id: null },
    ])
  })

  test("should extract the name of a single custom emoji", () => {
    expect(extractEmojisFromMessage({ text: "Hello <:custom:12345>" })).toEqual(
      [{ name: "custom", id: "12345" }],
    )
  })

  test("should extract the name of multiple custom emojis", () => {
    expect(
      extractEmojisFromMessage({
        text: "Hello <:custom:12345> and <:another:54321>",
      }),
    ).toEqual([
      { name: "custom", id: "12345" },
      { name: "another", id: "54321" },
    ])
  })

  test("should extract a mix of standard and custom emojis", () => {
    expect(
      extractEmojisFromMessage({ text: "Hello 👋 <:custom:12345> world 🌍" }),
    ).toEqual([
      { name: "👋", id: null },
      { name: "custom", id: "12345" },
      { name: "🌍", id: null },
    ])
  })

  test("should handle emojis at the start and end of the string", () => {
    expect(extractEmojisFromMessage({ text: "👋 Hello world 🌍" })).toEqual([
      { name: "👋", id: null },
      { name: "🌍", id: null },
    ])
  })

  test("should handle emojis with no surrounding text", () => {
    expect(extractEmojisFromMessage({ text: "👋<:custom:12345>🌍" })).toEqual([
      { name: "👋", id: null },
      { name: "custom", id: "12345" },
      { name: "🌍", id: null },
    ])
  })

  describe("de-duplication param", () => {
    test("returns unique emojis when true", () => {
      expect(
        extractEmojisFromMessage({
          text: "👋 <:one:1> 👋 <:two:2> <:one:1> 🌍 <:two:2> 🌍",
          deduplicate: true,
        }),
      ).toEqual([
        { name: "👋", id: null },
        { name: "one", id: "1" },
        { name: "two", id: "2" },
        { name: "🌍", id: null },
      ])
    })

    test("returns all (including duplicates) when false", () => {
      expect(
        extractEmojisFromMessage({
          text: "👋 <:one:1> 👋 <:two:2> <:one:1> 🌍 <:two:2> 🌍",
          deduplicate: false,
        }),
      ).toEqual([
        { name: "👋", id: null },
        { name: "one", id: "1" },
        { name: "👋", id: null },
        { name: "two", id: "2" },
        { name: "one", id: "1" },
        { name: "🌍", id: null },
        { name: "two", id: "2" },
        { name: "🌍", id: null },
      ])
    })
  })
})
