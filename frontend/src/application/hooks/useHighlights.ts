import { useCallback, useState } from 'react'

const STORAGE_KEY = 'alert-dou:highlights'
const MAX_PHRASE_LENGTH = 300
const MAX_HIGHLIGHTS_PER_EDITION = 50

// Allowed chars: letters (incl. accented), digits, spaces and basic punctuation.
const SAFE_PHRASE_RE = /^[\p{L}\p{N}\s.,;:()°%\-–—"'«»/]+$/u

export interface Highlight {
  phrase: string
  occurrenceIndex: number  // 0-based: which occurrence in the text to highlight
}

interface HighlightStore {
  [editionId: number]: Highlight[]
}

function load(): HighlightStore {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
    const out: HighlightStore = {}
    for (const [key, val] of Object.entries(raw)) {
      if (Array.isArray(val)) {
        const clean = (val as unknown[]).filter(
          (h): h is Highlight =>
            !!h &&
            typeof (h as Highlight).phrase === 'string' &&
            (h as Highlight).phrase.length > 0,
        )
        if (clean.length) out[Number(key)] = clean
      }
    }
    return out
  } catch {
    return {}
  }
}

function save(store: HighlightStore) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}

export function useHighlights(editionId: number) {
  const [store, setStore] = useState<HighlightStore>(load)

  const highlights = store[editionId] ?? []

  const add = useCallback((phrase: string, occurrenceIndex: number) => {
    const trimmed = phrase.trim()
    if (!trimmed || trimmed.length > MAX_PHRASE_LENGTH) return
    if (!SAFE_PHRASE_RE.test(trimmed)) return
    if (highlights.some((h) => h.phrase === trimmed)) return  // phrase already highlighted
    if (highlights.length >= MAX_HIGHLIGHTS_PER_EDITION) return

    setStore((prev) => {
      const next = {
        ...prev,
        [editionId]: [...(prev[editionId] ?? []), { phrase: trimmed, occurrenceIndex }],
      }
      save(next)
      return next
    })
  }, [editionId, highlights])

  const remove = useCallback((phrase: string) => {
    setStore((prev) => {
      const next = {
        ...prev,
        [editionId]: (prev[editionId] ?? []).filter((h) => h.phrase !== phrase),
      }
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

  return { highlights, add, remove, clear }
}

export function applyHighlightsToMarkdown(markdown: string, highlights: Highlight[]): string {
  if (!markdown) return markdown ?? ''
  if (!highlights.length) return markdown

  // Split into HTML-tag tokens and text tokens so we never modify inside existing
  // <mark> elements or inside attribute values.
  const tokens = markdown.split(/(<[^>]+>)/)

  for (const { phrase, occurrenceIndex } of highlights) {
    if (!phrase || typeof phrase !== 'string') continue
    const escaped = phrase
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
    const pattern = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

    let globalCount = 0  // counts occurrences seen so far across all text tokens
    let markDepth = 0
    let replaced = false

    for (let i = 0; i < tokens.length && !replaced; i++) {
      const t = tokens[i]
      if (t.startsWith('<')) {
        if (/^<mark\b/i.test(t)) markDepth++
        else if (/^<\/mark>/i.test(t)) markDepth--
        continue
      }
      if (markDepth > 0) continue  // skip text inside existing marks

      // Walk through matches in this token, replace only the target occurrence
      const re = new RegExp(pattern, 'gi')
      let result = ''
      let lastIndex = 0
      let match: RegExpExecArray | null

      while ((match = re.exec(t)) !== null) {
        result += t.slice(lastIndex, match.index)
        if (globalCount === occurrenceIndex) {
          result += `<mark class="highlight-mark" data-phrase="${escaped}">${escaped}</mark>`
          result += t.slice(match.index + match[0].length)
          lastIndex = t.length
          replaced = true
          break
        } else {
          result += match[0]
          globalCount++
        }
        lastIndex = match.index + match[0].length
      }
      result += t.slice(lastIndex)
      tokens[i] = result
    }
  }

  return tokens.join('')
}
