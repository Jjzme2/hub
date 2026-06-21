import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

let _client: S3Client | null = null

function getClient(): S3Client {
  if (!_client) {
    const config = useRuntimeConfig()
    if (!config.r2Endpoint) throw new Error('NUXT_R2_ENDPOINT is not set')
    _client = new S3Client({
      region: 'auto',
      endpoint: config.r2Endpoint,
      credentials: {
        accessKeyId: config.r2AccessKeyId,
        secretAccessKey: config.r2SecretAccessKey
      }
    })
  }
  return _client
}

function bucket(): string {
  return useRuntimeConfig().r2BucketName
}

/** Upload an object from the server side. */
export async function r2Put(
  key: string,
  body: Buffer | Uint8Array | string,
  contentType: string
) {
  await getClient().send(
    new PutObjectCommand({ Bucket: bucket(), Key: key, Body: body, ContentType: contentType })
  )
}

/** Delete an object. */
export async function r2Delete(key: string) {
  await getClient().send(
    new DeleteObjectCommand({ Bucket: bucket(), Key: key })
  )
}

/**
 * Return a URL for reading an object.
 * Uses the public CDN domain when NUXT_PUBLIC_R2_PUBLIC_URL is set,
 * otherwise generates a presigned GET URL valid for `expiresIn` seconds (default 1 h).
 */
export async function r2GetUrl(key: string, expiresIn = 3600): Promise<string> {
  const publicBase = useRuntimeConfig().public.r2PublicUrl as string
  if (publicBase) return `${publicBase.replace(/\/$/, '')}/${key}`
  return getSignedUrl(
    getClient(),
    new GetObjectCommand({ Bucket: bucket(), Key: key }),
    { expiresIn }
  )
}

/**
 * Generate a presigned PUT URL so a client can upload directly to R2
 * without routing the bytes through the server.
 * Valid for `expiresIn` seconds (default 1 h).
 */
export async function r2PresignPut(
  key: string,
  contentType: string,
  expiresIn = 3600
): Promise<string> {
  return getSignedUrl(
    getClient(),
    new PutObjectCommand({ Bucket: bucket(), Key: key, ContentType: contentType }),
    { expiresIn }
  )
}
