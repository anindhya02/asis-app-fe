import type { AuditFieldDiff } from '@/lib/audit-diff'
import { formatEnumLabel } from '@/lib/audit-cash-format'
import { formatProofLink } from '@/lib/audit-proof-link'

export interface InventoryBreakdownLine {
  name?: string
  amount?: number | string
}

export interface InventoryAuditPayload {
  itemName?: string
  donorSource?: string
  category?: string
  note?: string
  quantity?: number | string
  unit?: string
  photoUrl?: string
  breakdowns?: InventoryBreakdownLine[]
}

const FIELD_ORDER: Array<{
  key: keyof Omit<InventoryAuditPayload, 'photoUrl' | 'breakdowns'>
  label: string
  format?: (v: unknown, payload?: InventoryAuditPayload | null) => string
}> = [
  { key: 'itemName', label: 'Nama Barang', format: (v) => (v ? String(v) : '—') },
  { key: 'donorSource', label: 'Sumber Donasi', format: (v) => (v ? String(v) : '—') },
  { key: 'category', label: 'Kategori', format: (v) => formatEnumLabel(String(v ?? '')) },
  { key: 'note', label: 'Catatan', format: (v) => (v ? String(v) : '—') },
  {
    key: 'quantity',
    label: 'Jumlah + Satuan',
    format: (v, p) => formatQuantityWithUnit(v, p?.unit),
  },
]

export function isInventoryItemModule(moduleCode: string | null | undefined): boolean {
  return (moduleCode || '').toUpperCase() === 'INVENTORY_ITEM'
}

function formatInventoryNumber(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  const n = typeof value === 'number' ? value : Number(String(value).replace(/,/g, ''))
  if (Number.isNaN(n)) return String(value)
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(n)
}

function formatQuantityWithUnit(quantity: unknown, unit: string | undefined): string {
  const q = formatInventoryNumber(quantity)
  if (q === '—') return '—'
  const u = unit ? formatEnumLabel(unit) : ''
  return u ? `${q} ${u}` : q
}

function parsePayload(raw: string | null): InventoryAuditPayload | null {
  if (raw == null || raw === '' || raw === 'null') return null
  try {
    const o = JSON.parse(raw) as Record<string, unknown>
    if (!o || typeof o !== 'object') return null
    const p: InventoryAuditPayload = {}
    if (typeof o.itemName === 'string') p.itemName = o.itemName
    if (typeof o.donorSource === 'string') p.donorSource = o.donorSource
    if (typeof o.category === 'string') p.category = o.category
    if (typeof o.note === 'string') p.note = o.note
    if (typeof o.unit === 'string') p.unit = o.unit
    if (typeof o.photoUrl === 'string') p.photoUrl = o.photoUrl
    if (typeof o.quantity === 'number' || typeof o.quantity === 'string') p.quantity = o.quantity
    if (Array.isArray(o.breakdowns)) {
      p.breakdowns = o.breakdowns
        .filter((x) => x && typeof x === 'object')
        .map((x) => {
          const row = x as Record<string, unknown>
          return {
            name: typeof row.name === 'string' ? row.name : undefined,
            amount:
              typeof row.amount === 'number' || typeof row.amount === 'string'
                ? row.amount
                : undefined,
          }
        })
    }
    return p
  } catch {
    return null
  }
}

function formatBreakdowns(lines: InventoryBreakdownLine[] | undefined, unit?: string): string {
  if (!lines?.length) return '—'
  const u = unit ? formatEnumLabel(unit) : ''
  return lines
    .map((line, i) => {
      const name = line.name?.trim() || '—'
      const amt = formatInventoryNumber(line.amount)
      return `${i + 1}. ${name} — ${amt}${u ? ` ${u}` : ''}`
    })
    .join('\n')
}

function displayField(
  key: (typeof FIELD_ORDER)[number]['key'],
  payload: InventoryAuditPayload | null,
): string {
  if (!payload) return '—'
  const def = FIELD_ORDER.find((f) => f.key === key)
  if (!def) return '—'
  const raw = payload[key]
  if (raw === undefined || raw === null || raw === '') {
    if (key === 'note') return '—'
    return '—'
  }
  return def.format ? def.format(raw, payload) : String(raw)
}

function row(
  path: string,
  label: string,
  oldDisplay: string,
  newDisplay: string,
  kind: AuditFieldDiff['kind'],
): AuditFieldDiff {
  return { path, label, oldDisplay, newDisplay, kind }
}

export function getInventoryAuditDisplayMode(actionType: string): 'create' | 'default' {
  const a = (actionType || '').toUpperCase()
  if (a === 'CREATE') return 'create'
  return 'default'
}

export function computeInventoryItemDiffs(
  actionType: string,
  oldJson: string | null,
  newJson: string | null,
): AuditFieldDiff[] {
  const mode = getInventoryAuditDisplayMode(actionType)
  if (mode !== 'create') {
    return []
  }

  const newP = parsePayload(newJson)
  if (!newP) return []

  const diffs = FIELD_ORDER.map(({ key, label }) =>
    row(key, label, '', displayField(key, newP), 'added'),
  )

  if (newP.photoUrl) {
    diffs.push(
      row('photoUrl', 'Foto Barang', '', formatProofLink(newP.photoUrl), 'added'),
    )
  }

  diffs.push(
    row(
      'breakdowns',
      'Rincian Barang',
      '',
      formatBreakdowns(newP.breakdowns, newP.unit),
      'added',
    ),
  )

  return diffs
}

export function summarizeInventoryItemCell(
  actionType: string,
  oldJson: string | null,
  newJson: string | null,
  which: 'old' | 'new',
): string {
  const mode = getInventoryAuditDisplayMode(actionType)
  if (mode !== 'create') return '—'
  if (which === 'old') return ''
  const p = parsePayload(newJson)
  if (!p?.itemName) return '—'
  const qty = displayField('quantity', p)
  return `${p.itemName} · ${qty}`
}

export function inventoryItemTargetLabel(oldJson: string | null, newJson: string | null): string {
  const p = parsePayload(newJson) ?? parsePayload(oldJson)
  if (!p?.itemName) return 'Barang inventory'
  return p.itemName
}
