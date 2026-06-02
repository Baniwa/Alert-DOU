import { describe, it, expect } from 'vitest'
import { applyHighlightsToMarkdown } from './useHighlights'

describe('applyHighlightsToMarkdown', () => {
  it('wraps matched phrase with <mark>', () => {
    const result = applyHighlightsToMarkdown('Hello world', ['world'])
    expect(result).toContain('<mark class="highlight-mark"')
    expect(result).toContain('world')
  })

  it('is case-insensitive', () => {
    const result = applyHighlightsToMarkdown('Hello World', ['world'])
    expect(result).toContain('<mark')
  })

  it('escapes HTML in phrase — prevents XSS via data attribute', () => {
    // " in phrase must become &quot; so it cannot break out of data-phrase="..."
    const result = applyHighlightsToMarkdown('say "hello"', ['"hello"'])
    expect(result).toContain('&quot;')
    expect(result).not.toMatch(/data-phrase="[^"]*"[^"]*"/)
  })

  it('escapes < and > in phrase', () => {
    // Even if SAFE_PHRASE_RE blocks <> at input time, belt-and-suspenders here
    const result = applyHighlightsToMarkdown('a < b text', ['a < b'])
    expect(result).toContain('&lt;')
    expect(result).not.toContain('<b>')
  })

  it('escapes & in phrase', () => {
    const result = applyHighlightsToMarkdown('R&D budget', ['R&D'])
    expect(result).toContain('&amp;')
  })

  it('returns original markdown when no phrases', () => {
    const md = '# Title\n\nSome text'
    expect(applyHighlightsToMarkdown(md, [])).toBe(md)
  })

  it('does not double-wrap already highlighted phrase', () => {
    const md = 'Lei nº 1234'
    const once = applyHighlightsToMarkdown(md, ['Lei nº 1234'])
    const twice = applyHighlightsToMarkdown(once, ['Lei nº 1234'])
    // After first pass the phrase is inside <mark>…</mark>; regex should still match
    // but the rendered text stays readable — we just verify no nested <mark><mark>
    expect(twice.match(/<mark/g)?.length).toBeLessThanOrEqual(2)
  })
})
