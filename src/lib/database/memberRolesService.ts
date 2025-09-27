import { and, eq, inArray } from "drizzle-orm"

import type { Transaction } from "./client"
import { type MemberRoleRecord, memberRolesTable } from "./schema"

interface MemberRoleMutationProps {
  /** This should be the id of the member data table */
  memberId: string
  /** The roles to relevant for the mutation */
  roleIds: string[]
  /** The db transaction used to update the member, in order to rollback if any individual operation fails */
  transaction: Transaction
}

/** Helper for creating user role records */
export const addMemberRoles = async ({
  memberId,
  roleIds,
  transaction,
}: MemberRoleMutationProps): Promise<MemberRoleRecord[]> => {
  if (!roleIds.length) {
    return []
  }

  return await transaction
    .insert(memberRolesTable)
    .values(
      roleIds.map((roleId) => ({
        memberId,
        roleId,
      })),
    )
    .onConflictDoNothing()
    .returning()
}

export const removeMemberRoles = async ({
  memberId,
  roleIds,
  transaction,
}: MemberRoleMutationProps): Promise<MemberRoleRecord[]> => {
  if (!roleIds.length) {
    return []
  }

  return await transaction
    .delete(memberRolesTable)
    .where(
      and(
        eq(memberRolesTable.memberId, memberId),
        inArray(memberRolesTable.roleId, roleIds),
      ),
    )
    .returning()
}

/** Will overwrite the member role records */
export const setMemberRoles = async ({
  memberId,
  roleIds,
  transaction,
}: MemberRoleMutationProps): Promise<MemberRoleRecord[]> => {
  // Delete all existing the member's roles for a clean slate
  await transaction
    .delete(memberRolesTable)
    .where(eq(memberRolesTable.memberId, memberId))

  return await addMemberRoles({
    memberId,
    roleIds,
    transaction,
  })
}
