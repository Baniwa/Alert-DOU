const STORAGE_KEY = 'alert-dou:tracked-names'
const LAST_VISIT_KEY = 'alert-dou:monitor-last-visit'
const MAX_VALUE_LENGTH = 100
export const MAX_TRACKED = 20

export type WatchKind = 'pessoa' | 'cpf' | 'empresa' | 'termo'

export interface WatchItem {
  value: string
  kind: WatchKind
  avoid: boolean
  addedAt: string
}

export const KIND_LABELS: Record<WatchKind, string> = {
  pessoa: 'Pessoa',
  cpf: 'CPF',
  empresa: 'Empresa',
  termo: 'Termo',
}

function digitsOf(value: string): string {
  return value.replace(/\D/g, '')
}

function looksNumeric(value: string): boolean {
  return /^[\d.\-/\s]+$/.test(value.trim())
}

function sanitise(value: string): string {
  return value.replace(/[<>"'`]/g, '').replace(/\s+/g, ' ').trim()
}

export function detectKind(raw: string, fallback: WatchKind): WatchKind {
  if (looksNumeric(raw)) {
    const digits = digitsOf(raw)
    if (digits.length === 11) return 'cpf'
    if (digits.length === 14) return 'empresa'
  }
  return fallback
}

export function validateInput(raw: string): { ok: true; value: string } | { ok: false; error: string } {
  const trimmed = raw.trim()
  if (!trimmed) return { ok: false, error: 'Digite um nome, CPF, CNPJ ou termo.' }
  if (trimmed.length > MAX_VALUE_LENGTH) return { ok: false, error: `Máximo de ${MAX_VALUE_LENGTH} caracteres.` }

  if (looksNumeric(trimmed)) {
    const digits = digitsOf(trimmed)
    if (digits.length !== 11 && digits.length !== 14) {
      return { ok: false, error: 'Números: use um CPF (11 dígitos) ou CNPJ (14 dígitos).' }
    }
    if (/^(\d)\1+$/.test(digits)) return { ok: false, error: 'Número inválido.' }
    return { ok: true, value: digits }
  }

  const value = sanitise(trimmed)
  if (value.length < 3) return { ok: false, error: 'Mínimo de 3 caracteres.' }
  return { ok: true, value }
}

function fromStored(raw: unknown): WatchItem | null {
  if (typeof raw === 'string') {
    return { value: raw, kind: detectKind(raw, 'pessoa'), avoid: false, addedAt: new Date(0).toISOString() }
  }
  if (raw && typeof raw === 'object' && typeof (raw as WatchItem).value === 'string') {
    const item = raw as Partial<WatchItem> & { value: string }
    const kind = item.kind && item.kind in KIND_LABELS ? item.kind : detectKind(item.value, 'pessoa')
    return { value: item.value, kind, avoid: !!item.avoid, addedAt: item.addedAt ?? new Date(0).toISOString() }
  }
  return null
}

export function loadItems(): WatchItem[] {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    if (!Array.isArray(raw)) return []
    return raw.map(fromStored).filter((item): item is WatchItem => item !== null).slice(0, MAX_TRACKED)
  } catch {
    return []
  }
}

export function saveItems(items: WatchItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_TRACKED)))
  } catch {
    return
  }
}

export function addItem(raw: string, kind: WatchKind): { ok: true; items: WatchItem[] } | { ok: false; error: string } {
  const result = validateInput(raw)
  if (!result.ok) return result
  const items = loadItems()
  if (items.some((i) => i.value === result.value)) return { ok: false, error: 'Já monitorado.' }
  if (items.length >= MAX_TRACKED) return { ok: false, error: `Máximo de ${MAX_TRACKED} itens.` }
  const updated = [
    ...items,
    { value: result.value, kind: detectKind(result.value, kind), avoid: false, addedAt: new Date().toISOString() },
  ]
  saveItems(updated)
  return { ok: true, items: updated }
}

export function displayValue(value: string): string {
  if (/^\d{11}$/.test(value)) {
    return `${value.slice(0, 3)}.${value.slice(3, 6)}.${value.slice(6, 9)}-${value.slice(9)}`
  }
  if (/^\d{14}$/.test(value)) {
    return `${value.slice(0, 2)}.${value.slice(2, 5)}.${value.slice(5, 8)}/${value.slice(8, 12)}-${value.slice(12)}`
  }
  return value
}

export function readLastVisit(): string | null {
  try {
    return localStorage.getItem(LAST_VISIT_KEY)
  } catch {
    return null
  }
}

export function markVisit() {
  try {
    localStorage.setItem(LAST_VISIT_KEY, new Date().toISOString().slice(0, 10))
  } catch {
    return
  }
}
