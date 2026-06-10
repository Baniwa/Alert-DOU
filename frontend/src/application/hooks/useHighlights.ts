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

export function applyHighlightsToMarkdown(markdown: string, phrases: string[]): string {
  if (!phrases.length) return markdown

  // Split into text tokens and tag tokens so we never touch HTML attributes or
  // content that is already inside a <mark> element.
  const tokens = markdown.split(/(<[^>]+>)/)

  for (const phrase of phrases) {
    const escaped = phrase
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
    const pattern = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const re = new RegExp(pattern, 'gi')

    let depth = 0
    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i]
      if (t.startsWith('<')) {
        if (/^<mark\b/i.test(t)) depth++
        else if (/^<\/mark>/i.test(t)) depth--
      } else if (depth === 0) {
        tokens[i] = t.replace(re, `<mark class="highlight-mark" data-phrase="${escaped}">${escaped}</mark>`)
      }
    }
  }

  return tokens.join('')
}
