import { useCallback, useState } from 'react'

const STORAGE_KEY = 'alert-dou:highlights'
const MAX_PHRASE_LENGTH = 300
const MAX_HIGHLIGHTS_PER_EDITION = 50

// Allowed chars: letters (incl. accented), digits, spaces and basic punctuation.
// Rejects anything that could be an HTML injection attempt.
const SAFE_PHRASE_RE = /^[\p{L}\p{N}\s.,;:()°%\-–—"'«»\/]+$/u

interface HighlightStore {
  [editionId: number]: string[]
}

function load(): HighlightStore {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
  } catch {
    return {}
  }
}

function save(store: HighlightStore) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}

export function useHighlights(editionId: number) {
  const [store, setStore] = useState<HighlightStore>(load)

  const phrases = store[editionId] ?? []

  const add = useCallback((raw: string) => {
    const phrase = raw.trim()
    if (!phrase || phrase.length > MAX_PHRASE_LENGTH) return
    if (!SAFE_PHRASE_RE.test(phrase)) return            // reject anything HTML-like
    if (phrases.includes(phrase)) return                 // already highlighted
    if (phrases.length >= MAX_HIGHLIGHTS_PER_EDITION) return

    setStore((prev) => {
      const next = { ...prev, [editionId]: [...(prev[editionId] ?? []), phrase] }
      save(next)
      return next
    })
  }, [editionId, phrases])

  const remove = useCallback((phrase: string) => {
    setStore((prev) => {
      const next = { ...prev, [editionId]: (prev[editionId] ?? []).filter((p) => p !== phrase) }
      save(next)
      return next
    })
  }, [editionId])

  const clear = useCallback(() => {
    setStore((prev) => {
      const next = { ...prev }
      delete next[editionId]
      save(next)
      return next
    })
  }, [editionId])

  return { phrases, add, remove, clear }
}

/**
 * Pre-processes markdown by wrapping highlighted phrases with <mark> tags.
 * Phrases are HTML-escaped before insertion — safe for use with rehype-raw.
 */
export function applyHighlightsToMarkdown(markdown: string, phrases: string[]): string {
  if (!phrases.length) return markdown
  let result = markdown
  for (const phrase of phrases) {
    // Escape HTML special chars in the phrase text itself (incl. " to protect data attributes)
    const escaped = phrase
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
    // Escape regex metacharacters for matching
    const pattern = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    result = result.replace(
      new RegExp(pattern, 'gi'),
      `<mark class="highlight-mark" data-phrase="${escaped}">${escaped}</mark>`,
    )
  }
  return result
}
