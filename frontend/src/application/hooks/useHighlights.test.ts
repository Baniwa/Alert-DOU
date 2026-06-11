import { describe, it, expect } from 'vitest'
import { applyHighlightsToMarkdown } from './useHighlights'
import type { Highlight } from './useHighlights'

const h = (phrase: string, occurrenceIndex = 0): Highlight => ({ phrase, occurrenceIndex })

describe('applyHighlightsToMarkdown', () => {
  it('wraps matched phrase with <mark>', () => {
    const result = applyHighlightsToMarkdown('Hello world', [h('world')])
    expect(result).toContain('<mark class="highlight-mark"')
    expect(result).toContain('world')
  })

  it('is case-insensitive', () => {
    const result = applyHighlightsToMarkdown('Hello World', [h('world')])
    expect(result).toContain('<mark')
  })

  it('highlights only the specified occurrence — first', () => {
    const result = applyHighlightsToMarkdown('foo bar foo bar', [h('foo', 0)])
    const marks = result.match(/<mark/g) ?? []
    expect(marks).toHaveLength(1)
    // first 'foo' is marked, second is plain
    expect(result).toMatch(/^<mark[^>]+>foo<\/mark> bar foo/)
  })

  it('highlights only the specified occurrence — second', () => {
    const result = applyHighlightsToMarkdown('foo bar foo bar', [h('foo', 1)])
    const marks = result.match(/<mark/g) ?? []
    expect(marks).toHaveLength(1)
    expect(result).toMatch(/foo bar <mark[^>]+>foo<\/mark>/)
  })

  it('escapes HTML in phrase — prevents XSS via data attribute', () => {
    const result = applyHighlightsToMarkdown('say "hello"', [h('"hello"')])
    expect(result).toContain('&quot;')
    expect(result).not.toMatch(/data-phrase="[^"]*"[^"]*"/)
  })

  it('escapes < and > in phrase', () => {
    const result = applyHighlightsToMarkdown('a < b text', [h('a < b')])
    expect(result).toContain('&lt;')
    expect(result).not.toContain('<b>')
  })

  it('escapes & in phrase', () => {
    const result = applyHighlightsToMarkdown('R&D budget', [h('R&D')])
    expect(result).toContain('&amp;')
  })

  it('returns original markdown when no highlights', () => {
    const md = '# Title\n\nSome text'
    expect(applyHighlightsToMarkdown(md, [])).toBe(md)
  })

  it('does not double-wrap already highlighted phrase', () => {
    const md = 'Lei nº 1234'
    const once = applyHighlightsToMarkdown(md, [h('Lei nº 1234')])
    const twice = applyHighlightsToMarkdown(once, [h('Lei nº 1234')])
    expect(twice.match(/<mark/g)?.length).toBeLessThanOrEqual(2)
  })
})
