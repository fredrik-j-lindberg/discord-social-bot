import { describe, expect, test } from "vitest"

import { createPaginatedList, extractEmojisFromMessage } from "./message"

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

  test("should correctly extract emojis with variation selectors", () => {
    expect(extractEmojisFromMessage({ text: "I love you ❤️" })).toEqual([
      { name: "❤️", id: null },
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

describe("createPaginatedList", () => {
  const header = "My List"

  test("should return a single embed with fallback message if no items are provided", () => {
    const pages = createPaginatedList({ header, items: [] })
    expect(pages).toHaveLength(1)
    expect(pages[0]?.toJSON()).toEqual({
      title: header,
      description: "No items found",
    })
  })

  test("should return a single embed with custom fallback message", () => {
    const fallback = "Nothing here!"
    const pages = createPaginatedList({ header, items: [], fallback })
    expect(pages).toHaveLength(1)
    expect(pages[0]?.toJSON()).toEqual({
      title: header,
      description: fallback,
    })
  })

  test("should return a single page for items less than itemsPerPage", () => {
    const items = ["a", "b", "c"]
    const pages = createPaginatedList({ header, items })
    expect(pages).toHaveLength(1)
    expect(pages[0]?.toJSON()).toEqual({
      title: header,
      description: "- a\n- b\n- c",
    })
  })

  test("should return a single page for items equal to itemsPerPage", () => {
    const items = Array.from({ length: 10 }, (_, i) => `item ${i + 1}`)
    const pages = createPaginatedList({ header, items })
    expect(pages).toHaveLength(1)
    expect(pages[0]?.toJSON()).toEqual({
      title: header,
      description: items.map((item) => `- ${item}`).join("\n"),
    })
  })

  test("should return multiple pages for items more than itemsPerPage", () => {
    const items = Array.from({ length: 15 }, (_, i) => `item ${i + 1}`)
    const pages = createPaginatedList({ header, items })
    expect(pages).toHaveLength(2)
    expect(pages[0]?.toJSON()).toEqual({
      title: header,
      description: items
        .slice(0, 10)
        .map((item) => `- ${item}`)
        .join("\n"),
    })
    expect(pages[1]?.toJSON()).toEqual({
      title: header,
      description: items
        .slice(10, 15)
        .map((item) => `- ${item}`)
        .join("\n"),
    })
  })

  test("should handle custom itemsPerPage", () => {
    const items = Array.from({ length: 7 }, (_, i) => `item ${i + 1}`)
    const itemsPerPage = 3
    const pages = createPaginatedList({ header, items, itemsPerPage })
    expect(pages).toHaveLength(3)
    expect(pages[0]?.toJSON()).toEqual({
      title: header,
      description: "- item 1\n- item 2\n- item 3",
    })
    expect(pages[1]?.toJSON()).toEqual({
      title: header,
      description: "- item 4\n- item 5\n- item 6",
    })
    expect(pages[2]?.toJSON()).toEqual({
      title: header,
      description: "- item 7",
    })
  })

  test("should create correct number of pages for a large number of items", () => {
    const items = Array.from({ length: 100 }, (_, i) => `item ${i + 1}`)
    const pages = createPaginatedList({ header, items })
    expect(pages).toHaveLength(10)
  })

  test("should create a numbered list", () => {
    const items = ["a", "b", "c"]
    const pages = createPaginatedList({
      header,
      items,
      listType: "number",
    })
    expect(pages).toHaveLength(1)
    expect(pages[0]?.toJSON()).toEqual({
      title: header,
      description: "1. a\n2. b\n3. c",
    })
  })

  test("should create a multi-page numbered list with correct numbering", () => {
    const items = Array.from({ length: 5 }, (_, i) => `item ${i + 1}`)
    const pages = createPaginatedList({
      header,
      items,
      itemsPerPage: 2,
      listType: "number",
    })
    expect(pages).toHaveLength(3)
    expect(pages[0]?.toJSON().description).toBe("1. item 1\n2. item 2")
    expect(pages[1]?.toJSON().description).toBe("3. item 3\n4. item 4")
    expect(pages[2]?.toJSON().description).toBe("5. item 5")
  })
})
