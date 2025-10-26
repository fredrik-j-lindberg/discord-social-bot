import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3"
import type { Attachment } from "discord.js"

import { env } from "~/env"

// Initialize R2 client with Cloudflare R2 endpoint
const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  },
})
const publicR2DevUrl = "https://pub-c6e6274e80fa4883b490d132062cb48c.r2.dev"

export interface UploadResult {
  key: string
  url: string
  originalName: string
  contentType: string | null
  size: number
}

/**
 * Upload a Discord attachment to Cloudflare R2
 */
export async function uploadAttachmentToR2(
  /** Discord attachment object */
  attachment: Attachment,
  options?: {
    prefix?: string
    customKey?: string
  },
): Promise<UploadResult> {
  // Fetch the file from Discord CDN
  const response = await fetch(attachment.url)
  if (!response.ok) {
    throw new Error(
      `Failed to fetch attachment from Discord: ${response.statusText}`,
    )
  }

  const buffer = await response.arrayBuffer()

  const prefix = options?.prefix ?? "uploads"
  // Generate a unique key for the file
  // Slash will create folders in R2 (e.g. "guildId/skitrip/attachmentId-filename.ext" would place "attachmentId-filename.ext" inside the "guildId/skitrip/" folder structure)
  const key =
    options?.customKey ?? `${prefix}/${attachment.id}-${attachment.name}`

  // Upload to R2
  await r2Client.send(
    new PutObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: key,
      Body: new Uint8Array(buffer),
      ContentType: attachment.contentType ?? undefined,
      Metadata: {
        originalName: attachment.name,
        discordId: attachment.id,
        uploadedAt: new Date().toISOString(),
      },
    }),
  )

  // TODO: Replace with custom domain setup for R2 bucket
  // Construct the public URL
  // For now, this uses the default R2 dev domain format. But it is not recommended for production use.
  // See https://developers.cloudflare.com/r2/buckets/public-buckets/#managed-public-buckets-through-r2dev
  const publicUrl = `${publicR2DevUrl}/${key}`

  return {
    key,
    url: publicUrl,
    originalName: attachment.name,
    contentType: attachment.contentType,
    size: attachment.size,
  }
}

/**
 * Upload multiple Discord attachments to Cloudflare R2
 */
export async function uploadMultipleAttachmentsToR2(
  /** Array or Collection of Discord attachments */
  attachments: Attachment[] | Map<string, Attachment>,
  options?: {
    prefix?: string
  },
): Promise<UploadResult[]> {
  const attachmentArray = Array.isArray(attachments)
    ? attachments
    : Array.from(attachments.values())

  const uploadPromises = attachmentArray.map((attachment) =>
    uploadAttachmentToR2(attachment, options),
  )

  return Promise.all(uploadPromises)
}
