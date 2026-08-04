import imageCompression from 'browser-image-compression'

/**
 * Shrink an image in the browser, before it is uploaded.
 *
 * The API re-encodes everything it stores, so this is not what protects the
 * object store -- that check cannot be skipped and lives on the server. What
 * this saves is the UPLOAD: a student photographing homework on a phone sends a
 * 4-8 MB JPEG, and on a slow mobile connection that is the difference between a
 * submission that completes and one that times out on the way to a deadline.
 *
 * Everything here is best-effort. A format the browser cannot decode, a file
 * that is already small, an out-of-memory canvas on an old phone -- each falls
 * back to the original file, because a slower upload is always better than a
 * failed one.
 */

/** Matches the server's cap, so the server rarely has to resize again. */
const MAX_DIMENSION = 2560

/** Below this, re-encoding costs more in quality than it saves in bytes. */
const SKIP_BELOW_BYTES = 300 * 1024

export interface CompressionResult {
  file: File
  originalBytes: number
  compressedBytes: number
  /** False when the original was kept, for any reason. */
  applied: boolean
}

function isCompressibleImage(file: File): boolean {
  // No SVG: it is refused by the API anyway, and rasterising it here would
  // silently destroy a vector the uploader meant to keep.
  return /^image\/(jpeg|png|webp|heic|heif|avif|bmp|tiff)$/i.test(file.type)
}

export async function compressImage(file: File): Promise<CompressionResult> {
  const unchanged: CompressionResult = {
    file,
    originalBytes: file.size,
    compressedBytes: file.size,
    applied: false,
  }

  if (!isCompressibleImage(file)) return unchanged
  if (file.size <= SKIP_BELOW_BYTES) return unchanged

  try {
    const compressed = await imageCompression(file, {
      maxWidthOrHeight: MAX_DIMENSION,
      // Runs off the main thread, so the page keeps responding while a large
      // photo is re-encoded.
      useWebWorker: true,
      // WebP everywhere the browser can produce it; the API stores WebP too, so
      // this avoids a second re-encode server-side.
      fileType: 'image/webp',
      initialQuality: 0.82,
      // Orientation is baked into the pixels, matching what the server does.
      preserveExif: false,
    })

    // Re-encoding can inflate an already-optimal file. Send whichever is smaller.
    if (compressed.size >= file.size) return unchanged

    return {
      // Keep the visible name; only the extension follows the new bytes, so a
      // download does not land as .jpg containing WebP.
      file: new File([compressed], swapExtension(file.name, 'webp'), {
        type: 'image/webp',
        lastModified: file.lastModified,
      }),
      originalBytes: file.size,
      compressedBytes: compressed.size,
      applied: true,
    }
  } catch (err) {
    console.warn('Image compression failed; uploading the original', err)
    return unchanged
  }
}

function swapExtension(name: string, extension: string): string {
  const dot = name.lastIndexOf('.')
  return `${dot > 0 ? name.slice(0, dot) : name}.${extension}`
}

/** `4.2 MB → 310 KB` for a toast or a progress line. */
export function describeCompression(result: CompressionResult): string {
  const format = (bytes: number): string =>
    bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`

  if (!result.applied) return format(result.originalBytes)

  const saved = Math.round((1 - result.compressedBytes / result.originalBytes) * 100)
  return `${format(result.originalBytes)} → ${format(result.compressedBytes)} (${saved}% smaller)`
}
