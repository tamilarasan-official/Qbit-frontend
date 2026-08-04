'use client'

import { useState, type MouseEvent, type ReactNode } from 'react'
import { browserFileUrl } from '@/utils/storage'

interface FileLinkProps {
  /** The URL as stored on the row -- `file_url` and friends. */
  href: string | null | undefined
  children: ReactNode
  className?: string
  /** Name to save the file under. Supplying one turns this into a download. */
  filename?: string | null
  download?: boolean
}

/**
 * A link to a file held in the API's storage.
 *
 * Following the stored URL directly lands on a 401: a new tab carries no
 * Authorization header, and the portal's session cookie belongs to the portal's
 * hostname rather than the API's. The link is therefore exchanged for a signed,
 * short-lived URL first.
 *
 * That exchange is done on click rather than on render -- signatures expire,
 * and most of these links are never followed. The blank tab is opened
 * synchronously inside the click so a popup blocker does not mistake the
 * navigation for one the user did not ask for.
 */
export function FileLink({ href, children, className, filename, download }: FileLinkProps) {
  const [resolving, setResolving] = useState(false)

  const open = async (event: MouseEvent<HTMLAnchorElement>) => {
    // Let modified clicks (new window, save-as) fall through to the browser.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return

    event.preventDefault()
    if (!href || resolving) return

    const tab = window.open('', '_blank')
    if (tab) tab.opener = null

    setResolving(true)
    const url = await browserFileUrl(href, { filename, download })
    setResolving(false)

    if (!url) {
      tab?.close()
      return
    }
    if (tab) tab.location.replace(url)
    // Popup blocked: fall back to this tab rather than losing the click.
    else window.location.href = url
  }

  return (
    <a
      href={href ?? '#'}
      onClick={open}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      aria-busy={resolving}
    >
      {children}
    </a>
  )
}
