import type { AuditFieldDiff } from '@/lib/audit-diff'
import { summarizeDiffsForTableCell } from '@/lib/audit-cell-snippet'
import {
  formatAuditAmount,
  formatAuditDate,
  formatEnumLabel,
  formatProofChanged,
} from '@/lib/audit-cash-format'
import { appendDocumentLinkDiff, formatProofLink } from '@/lib/audit-proof-link'

export interface IncomeAuditPayload {
  transactionDate?: string
  category?: string
  sourceType?: string
  paymentMethod?: string
  donorName?: string
  amount?: number | string
  note?: string
  proofFilePath?: string
  /** @deprecated audit lama — hanya boolean */
  proofChanged?: boolean
}

const FIELD_ORDER: Array<{ key: keyof IncomeAuditPayload; label: string; format?: (v: unknown) => string }> = [
  { key: 'transactionDate', label: 'Tanggal Transaksi', format: (v) => formatAuditDate(String(v ?? '')) },
  { key: 'category', label: 'Kategori', format: (v) => formatEnumLabel(String(v ?? '')) },
  { key: 'sourceType', label: 'Tipe Donatur', format: (v) => formatEnumLabel(String(v ?? '')) },
  { key: 'paymentMethod', label: 'Metode Pembayaran', format: (v) => formatEnumLabel(String(v ?? '')) },
  { key: 'donorName', label: 'Nama Donatur', format: (v) => (v ? String(v) : '—') },
  { key: 'amount', label: 'Nominal', format: (v) => formatAuditAmount(v) },
  { key: 'note', label: 'Catatan', format: (v) => (v ? String(v) : '—') },
]

export function isIncomeTransactionModule(moduleCode: string | null | undefined): boolean {
  return (moduleCode || '').toUpperCase() === 'INCOME_TRANSACTION'
}

function parsePayload(raw: string | null): IncomeAuditPayload | null {
  if (raw == null || raw === '' || raw === 'null') return null
  try {
    const o = JSON.parse(raw) as Record<string, unknown>
    if (!o || typeof o !== 'object') return null
    const p: IncomeAuditPayload = {}
    if (typeof o.transactionDate === 'string') p.transactionDate = o.transactionDate
    if (typeof o.category === 'string') p.category = o.category
    if (typeof o.sourceType === 'string') p.sourceType = o.sourceType
    if (typeof o.paymentMethod === 'string') p.paymentMethod = o.paymentMethod
    if (typeof o.donorName === 'string') p.donorName = o.donorName
    if (typeof o.amount === 'number' || typeof o.amount === 'string') p.amount = o.amount
    if (typeof o.note === 'string') p.note = o.note
    if (typeof o.proofFilePath === 'string') p.proofFilePath = o.proofFilePath
    if (typeof o.proofChanged === 'boolean') p.proofChanged = o.proofChanged
    return p
  } catch {
    return null
  }
}

function displayValue(key: keyof IncomeAuditPayload, payload: IncomeAuditPayload | null): string {
  if (!payload) return '—'
  const def = FIELD_ORDER.find((f) => f.key === key)
  if (!def) return '—'
  const raw = payload[key]
  if (raw === undefined || raw === null || raw === '') return '—'
  return def.format ? def.format(raw) : String(raw)
}

function appendProofDiff(
  diffs: AuditFieldDiff[],
  oldP: IncomeAuditPayload | null,
  newP: IncomeAuditPayload | null,
): void {
  const oldUrl = oldP?.proofFilePath
  const newUrl = newP?.proofFilePath
  if (oldUrl || newUrl) {
    appendDocumentLinkDiff(diffs, oldUrl, newUrl, 'Bukti Transaksi', 'proofFilePath')
    return
  }
  if (newP?.proofChanged !== undefined) {
    const changed = newP.proofChanged === true
    diffs.push(
      row(
        'proofChanged',
        'Bukti Transaksi',
        '—',
        formatProofChanged(changed),
        changed ? 'changed' : 'unchanged',
      ),
    )
  }
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

export function getIncomeAuditDisplayMode(actionType: string): 'create' | 'update' | 'delete' | 'default' {
  const a = (actionType || '').toUpperCase()
  if (a === 'CREATE') return 'create'
  if (a === 'DELETE') return 'delete'
  if (a === 'UPDATE') return 'update'
  return 'default'
}

export function computeIncomeTransactionDiffs(
  actionType: string,
  oldJson: string | null,
  newJson: string | null,
): AuditFieldDiff[] {
  const mode = getIncomeAuditDisplayMode(actionType)
  const oldP = parsePayload(oldJson)
  const newP = parsePayload(newJson)

  if (mode === 'create' && newP) {
    const diffs = FIELD_ORDER.map(({ key, label }) =>
      row(key, label, '', displayValue(key, newP), 'added'),
    )
    if (newP.proofFilePath) {
      diffs.push(
        row('proofFilePath', 'Bukti Transaksi', '', formatProofLink(newP.proofFilePath), 'added'),
      )
    }
    return diffs
  }

  if (mode === 'delete') {
    const p = oldP ?? newP
    if (!p) return []
    return FIELD_ORDER.map(({ key, label }) =>
      row(key, label, displayValue(key, p), displayValue(key, p), 'removed'),
    )
  }

  if (mode === 'update' && (oldP || newP)) {
    const diffs: AuditFieldDiff[] = []
    for (const { key, label } of FIELD_ORDER) {
      const ov = displayValue(key, oldP)
      const nv = displayValue(key, newP)
      if (ov !== nv) {
        diffs.push(row(key, label, ov, nv, 'changed'))
      }
    }
    appendProofDiff(diffs, oldP, newP)
    return diffs
  }

  return []
}

export function summarizeIncomeTransactionCell(
  actionType: string,
  oldJson: string | null,
  newJson: string | null,
  which: 'old' | 'new',
): string {
  const mode = getIncomeAuditDisplayMode(actionType)
  if (mode === 'create') {
    if (which === 'old') return ''
    const p = parsePayload(newJson)
    if (!p) return '—'
    const amt = displayValue('amount', p)
    const cat = displayValue('category', p)
    return `${cat} · ${amt}`
  }
  if (mode === 'delete') {
    if (which === 'new') return ''
    const p = parsePayload(oldJson)
    if (!p) return '—'
    return `${displayValue('category', p)} · ${displayValue('amount', p)}`
  }
  const diffs = computeIncomeTransactionDiffs(actionType, oldJson, newJson)
  return summarizeDiffsForTableCell(diffs, which)
}

export function incomeTransactionTargetLabel(oldJson: string | null, newJson: string | null): string {
  const p = parsePayload(newJson) ?? parsePayload(oldJson)
  if (!p) return 'Transaksi kas masuk'
  const cat = displayValue('category', p)
  const amt = displayValue('amount', p)
  return `${cat} · ${amt}`
}
