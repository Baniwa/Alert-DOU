import { beforeEach, describe, expect, it } from 'vitest'
import { addItem, detectKind, displayValue, loadItems, validateInput } from './monitor.helpers'

const store = new Map<string, string>()

beforeEach(() => {
  store.clear()
  globalThis.localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v) },
    removeItem: (k: string) => { store.delete(k) },
    clear: () => store.clear(),
    key: () => null,
    length: 0,
  } as Storage
})

describe('detectKind', () => {
  it('recognises CPF and CNPJ by digit count', () => {
    expect(detectKind('123.456.789-09', 'pessoa')).toBe('cpf')
    expect(detectKind('12.345.678/0001-90', 'pessoa')).toBe('empresa')
    expect(detectKind('Maria da Silva', 'pessoa')).toBe('pessoa')
  })
})

describe('validateInput', () => {
  it('rejects numbers that are neither CPF nor CNPJ', () => {
    expect(validateInput('12345').ok).toBe(false)
  })

  it('stores documents as digits only', () => {
    expect(validateInput('12.345.678/0001-90')).toEqual({ ok: true, value: '12345678000190' })
  })
})

describe('loadItems', () => {
  it('migrates the old list of plain strings', () => {
    store.set('alert-dou:tracked-names', JSON.stringify(['Maria da Silva', '12345678909']))
    const items = loadItems()
    expect(items.map((i) => [i.value, i.kind])).toEqual([
      ['Maria da Silva', 'pessoa'],
      ['12345678909', 'cpf'],
    ])
  })
})

describe('addItem', () => {
  it('refuses duplicates', () => {
    addItem('Ibama', 'termo')
    expect(addItem('Ibama', 'termo')).toEqual({ ok: false, error: 'Já monitorado.' })
  })
})

describe('displayValue', () => {
  it('formats CNPJ', () => {
    expect(displayValue('12345678000190')).toBe('12.345.678/0001-90')
  })
})
