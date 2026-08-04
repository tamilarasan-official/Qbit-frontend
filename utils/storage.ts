import { createClient } from '@/utils/supabase/client'

export interface UploadResult {
  url: string | null
  error: string | null
}

/** `.../api/storage/<bucket>/<key>` -- absolute, or relative to the API proxy. */
const STORAGE_URL = /\/api\/storage\/([^/?#]+)\/([^?#]+)/

/**
 * Turn a stored file URL into one the browser can fetch on its own.
 *
 * A stored URL points at the API's hostname, where the portal's session cookie
 * does not apply -- and an `<iframe src>`, `<img src>` or download anchor has
 * no way to authenticate itself, so the request is answered 401 (and the 401,
 * being unframable, surfaces in the console only as an X-Frame-Options
 * complaint). Exchanging it for a short-lived signed URL over the authenticated
 * channel is what makes those elements work.
 *
 * Anything that is not one of our storage URLs -- a legacy Supabase link, an
 * external resource -- is handed back untouched.
 */
export async function browserFileUrl(
  fileUrl: string | null | undefined,
  options: { download?: boolean; filename?: string | null } = {}
): Promise<string | null> {
  if (!fileUrl) return null

  const match = STORAGE_URL.exec(fileUrl)
  if (!match) return fileUrl

  const [, bucket, key] = match
  const supabase = createClient()
  const { data, error } = await supabase.storage
    .from(decodeURIComponent(bucket ?? ''))
    .createSignedUrl(decodeURIComponent(key ?? ''))

  if (error || !data) {
    console.error('Could not sign file URL:', error)
    return null
  }

  if (!options.download && !options.filename) return data.signedUrl

  const url = new URL(data.signedUrl)
  // Serves the file as a save-to-disk response under its original name rather
  // than the generated one on disk.
  if (options.download) url.searchParams.set('download', '1')
  if (options.filename) url.searchParams.set('filename', options.filename)
  return url.toString()
}

/**
 * Upload a file to Supabase Storage
 * @param file - The file to upload
 * @param userId - The user's ID (for folder structure)
 * @param taskId - The task ID
 * @param stepId - The step ID
 * @returns Object with url or error
 */
export async function uploadTaskFile(
  file: File,
  userId: string,
  taskId: string,
  stepId: string
): Promise<UploadResult> {
  try {
    const supabase = createClient()

    // Create a unique filename
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
    const filePath = `${userId}/${taskId}/${stepId}/${fileName}`

    // Upload file
    const { data, error } = await supabase.storage
      .from('task-submissions')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error || !data) {
      console.error('Upload error:', error)
      return { url: null, error: error?.message ?? 'Upload failed' }
    }

    // The API already returns the canonical URL, so there is no second call to
    // build one. getPublicUrl is kept as a fallback for older call sites.
    return { url: data.publicUrl, error: null }
  } catch (err) {
    console.error('Upload exception:', err)
    return { url: null, error: 'Failed to upload file' }
  }
}

/**
 * Upload multiple files to Supabase Storage
 * @param files - Array of files to upload
 * @param userId - The user's ID
 * @param taskId - The task ID
 * @param stepId - The step ID
 * @returns Array of URLs and errors
 */
export async function uploadTaskFiles(
  files: File[],
  userId: string,
  taskId: string,
  stepId: string
): Promise<UploadResult[]> {
  const results: UploadResult[] = []

  for (const file of files) {
    const result = await uploadTaskFile(file, userId, taskId, stepId)
    results.push(result)
  }

  return results
}

/**
 * Delete a file from Supabase Storage
 * @param filePath - The full path to the file
 * @returns Boolean indicating success
 */
export async function deleteTaskFile(filePath: string): Promise<boolean> {
  try {
    const supabase = createClient()

    const { error } = await supabase.storage
      .from('task-submissions')
      .remove([filePath])

    if (error) {
      console.error('Delete error:', error)
      return false
    }

    return true
  } catch (err) {
    console.error('Delete exception:', err)
    return false
  }
}
