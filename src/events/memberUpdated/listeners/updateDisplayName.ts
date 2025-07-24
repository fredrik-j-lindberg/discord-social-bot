import type { UserUpdateListener } from "../memberUpdatedEvent"

export default {
  data: { name: "updateDisplayName" },
  execute: (oldMember, newMember) => {
    // TODO: Update display name
    console.log("### fredrik: oldUser.tag", oldMember.user.tag)
    console.log("### fredrik: newUser.tag", newMember.user.tag)
  },
} satisfies UserUpdateListener
