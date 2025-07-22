import type { MessageListener } from "../messageRouter"

export default {
  data: { name: "christianServer" },
  execute: (messageEvent) => {
    const containsKeyword = messageEvent.content
      .toLowerCase()
      .includes("christian server")

    if (!containsKeyword) {
      return null
    }

    return ":cross:"
  },
} satisfies MessageListener
