const STORAGE_KEY = 'alert-dou:tracked-names'
const MAX_NAME_LENGTH = 100
const MAX_TRACKED = 20

function normaliseCPF(value: string): string {
  return value.replace(/\D/g, '')
}

function isCPF(value: string): boolean {
  return /^\d{3}[.\s]?\d{3}[.\s]?\d{3}[-\s]?\d{2}$/.test(value.trim())
}

function sanitise(value: string): string {
  return value.replace(/[<>"'`]/g, '').trim()
}

export function validateInput(raw: string): { ok: true; value: string } | { ok: false; error: string } {
  const trimmed = raw.trim()
  if (!trimmed) return { ok: false, error: 'Digite um nome ou CPF.' }
  if (trimmed.length < 2) return { ok: false, error: 'Mínimo de 2 caracteres.' }
  if (trimmed.length > MAX_NAME_LENGTH) return { ok: false, error: `Máximo de ${MAX_NAME_LENGTH} caracteres.` }

  if (isCPF(trimmed)) {
    const digits = normaliseCPF(trimmed)
    if (/^(\d)\1{10}$/.test(digits)) return { ok: false, error: 'CPF inválido.' }
    return { ok: true, value: digits }
  }

  return { ok: true, value: sanitise(trimmed) }
}

export function loadNames(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    return Array.isArray(raw) ? raw.slice(0, MAX_TRACKED) : []
  } catch {
    return []
  }
}

export function saveNames(list: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, MAX_TRACKED)))
}

export function displayName(value: string): string {
  if (/^\d{11}$/.test(value)) {
    return `${value.slice(0, 3)}.${value.slice(3, 6)}.${value.slice(6, 9)}-${value.slice(9)}`
  }
  return value
}
