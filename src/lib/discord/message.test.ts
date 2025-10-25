import type { ContainerBuilder } from "discord.js"
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
      { name: "👋", id: null, isAnimated: false },
    ])
  })

  test("should extract multiple standard emojis", () => {
    expect(extractEmojisFromMessage({ text: "Hello 👋 world 🌍" })).toEqual([
      { name: "👋", id: null, isAnimated: false },
      { name: "🌍", id: null, isAnimated: false },
    ])
  })

  test("should extract the name of a single custom emoji", () => {
    expect(extractEmojisFromMessage({ text: "Hello <:custom:12345>" })).toEqual(
      [{ name: "custom", id: "12345", isAnimated: false }],
    )
  })

  test("should extract the name of a single animated emoji", () => {
    expect(
      extractEmojisFromMessage({ text: "Hello <a:animated:54321>" }),
    ).toEqual([{ name: "animated", id: "54321", isAnimated: true }])
  })

  test("should extract a mix of animated and non-animated custom emojis", () => {
    expect(
      extractEmojisFromMessage({
        text: "Hello <:custom:12345> and <a:animated:54321>",
      }),
    ).toEqual([
      { name: "custom", id: "12345", isAnimated: false },
      { name: "animated", id: "54321", isAnimated: true },
    ])
  })

  test("should extract the name of multiple custom emojis", () => {
    expect(
      extractEmojisFromMessage({
        text: "Hello <:custom:12345> and <:another:54321>",
      }),
    ).toEqual([
      { name: "custom", id: "12345", isAnimated: false },
      { name: "another", id: "54321", isAnimated: false },
    ])
  })

  test("should extract a mix of standard and custom emojis", () => {
    expect(
      extractEmojisFromMessage({ text: "Hello 👋 <:custom:12345> world 🌍" }),
    ).toEqual([
      { name: "👋", id: null, isAnimated: false },
      { name: "custom", id: "12345", isAnimated: false },
      { name: "🌍", id: null, isAnimated: false },
    ])
  })

  test("should handle emojis at the start and end of the string", () => {
    expect(extractEmojisFromMessage({ text: "👋 Hello world 🌍" })).toEqual([
      { name: "👋", id: null, isAnimated: false },
      { name: "🌍", id: null, isAnimated: false },
    ])
  })

  test("should handle emojis with no surrounding text", () => {
    expect(extractEmojisFromMessage({ text: "👋<:custom:12345>🌍" })).toEqual([
      { name: "👋", id: null, isAnimated: false },
      { name: "custom", id: "12345", isAnimated: false },
      { name: "🌍", id: null, isAnimated: false },
    ])
  })

  test("should correctly extract emojis with variation selectors", () => {
    expect(extractEmojisFromMessage({ text: "I love you ❤️" })).toEqual([
      { name: "❤️", id: null, isAnimated: false },
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
        { name: "👋", id: null, isAnimated: false },
        { name: "one", id: "1", isAnimated: false },
        { name: "two", id: "2", isAnimated: false },
        { name: "🌍", id: null, isAnimated: false },
      ])
    })

    test("returns all (including duplicates) when false", () => {
      expect(
        extractEmojisFromMessage({
          text: "👋 <:one:1> 👋 <:two:2> <:one:1> 🌍 <:two:2> 🌍",
          deduplicate: false,
        }),
      ).toEqual([
        { name: "👋", id: null, isAnimated: false },
        { name: "one", id: "1", isAnimated: false },
        { name: "👋", id: null, isAnimated: false },
        { name: "two", id: "2", isAnimated: false },
        { name: "one", id: "1", isAnimated: false },
        { name: "🌍", id: null, isAnimated: false },
        { name: "two", id: "2", isAnimated: false },
        { name: "🌍", id: null, isAnimated: false },
      ])
    })
  })
})

const getPaginatedContent = (pages: ContainerBuilder[]) => {
  return pages.map((page) =>
    page.components.map((component) =>
      "content" in component.data ? component.data.content : null,
    ),
  )
}

describe("createPaginatedList", () => {
  const header = "My List"

  test("should return a single embed with fallback message if no items are provided", () => {
    const pages = createPaginatedList({ header, items: [] })
    expect(pages).toHaveLength(1)
    expect(getPaginatedContent(pages)[0]?.[1]).toEqual("No items found")
  })

  test("should return a single embed with custom fallback message", () => {
    const fallback = "Nothing here!"
    const pages = createPaginatedList({ header, items: [], fallback })
    expect(pages).toHaveLength(1)
    expect(getPaginatedContent(pages)[0]?.[1]).toEqual(fallback)
  })

  test("should return a single page for items less than itemsPerPage", () => {
    const items = ["a", "b", "c"]
    const pages = createPaginatedList({ header, items })
    expect(pages).toHaveLength(1)
  })

  test("should return a single page for items equal to itemsPerPage", () => {
    const items = Array.from({ length: 10 }, (_, i) => `item ${i + 1}`)
    const pages = createPaginatedList({ header, items })
    expect(pages).toHaveLength(1)
    expect(getPaginatedContent(pages)[0]?.[1]).toEqual(
      items.map((item) => `- ${item}`).join("\n"),
    )
  })

  test("should return multiple pages for items more than itemsPerPage", () => {
    const items = Array.from({ length: 15 }, (_, i) => `item ${i + 1}`)
    const pages = createPaginatedList({ header, items })
    expect(pages).toHaveLength(2)
    expect(getPaginatedContent(pages)[0]?.[0]).toContain(header)
    expect(getPaginatedContent(pages)[1]?.[0]).toContain(header)
  })

  test("should handle custom itemsPerPage", () => {
    const items = Array.from({ length: 7 }, (_, i) => `item ${i + 1}`)
    const itemsPerPage = 3
    const pages = createPaginatedList({ header, items, itemsPerPage })
    expect(pages).toHaveLength(3)
    expect(getPaginatedContent(pages)[0]?.[0]).toContain(header)
    expect(getPaginatedContent(pages)[0]?.[1]).toEqual(
      "- item 1\n- item 2\n- item 3",
    )

    expect(getPaginatedContent(pages)[1]?.[0]).toContain(header)
    expect(getPaginatedContent(pages)[1]?.[1]).toEqual(
      "- item 4\n- item 5\n- item 6",
    )

    expect(getPaginatedContent(pages)[2]?.[0]).toContain(header)
    expect(getPaginatedContent(pages)[2]?.[1]).toEqual("- item 7")
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

    expect(getPaginatedContent(pages)[0]?.[0]).toContain(header)
    expect(getPaginatedContent(pages)[0]?.[1]).toEqual("1. a\n2. b\n3. c")
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

    expect(getPaginatedContent(pages)[0]?.[1]).toBe("1. item 1\n2. item 2")
    expect(getPaginatedContent(pages)[1]?.[1]).toBe("3. item 3\n4. item 4")
    expect(getPaginatedContent(pages)[2]?.[1]).toBe("5. item 5")
  })
})
