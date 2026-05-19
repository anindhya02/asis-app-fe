import type { AuditFieldDiff } from '@/lib/audit-diff'
import { summarizeDiffsForTableCell } from '@/lib/audit-cell-snippet'
import {
  formatAuditAmount,
  formatAuditDate,
  formatEnumLabel,
  formatProofChanged,
} from '@/lib/audit-cash-format'
import { appendDocumentLinkDiff, formatProofLink } from '@/lib/audit-proof-link'

export interface ExpenseAuditPayload {
  transactionDate?: string
  category?: string
  subCategory?: string
  paymentMethod?: string
  amount?: number | string
  note?: string
  proofFilePath?: string
  proofChanged?: boolean
}

const FIELD_ORDER: Array<{ key: keyof ExpenseAuditPayload; label: string; format?: (v: unknown) => string }> = [
  { key: 'transactionDate', label: 'Tanggal Transaksi', format: (v) => formatAuditDate(String(v ?? '')) },
  { key: 'category', label: 'Kategori', format: (v) => formatEnumLabel(String(v ?? '')) },
  { key: 'subCategory', label: 'Sub Kategori', format: (v) => (v ? String(v) : '—') },
  { key: 'paymentMethod', label: 'Metode Pembayaran', format: (v) => formatEnumLabel(String(v ?? '')) },
  { key: 'amount', label: 'Nominal', format: (v) => formatAuditAmount(v) },
  { key: 'note', label: 'Catatan', format: (v) => (v ? String(v) : '—') },
]

export function isExpenseTransactionModule(moduleCode: string | null | undefined): boolean {
  return (moduleCode || '').toUpperCase() === 'EXPENSE_TRANSACTION'
}

function parsePayload(raw: string | null): ExpenseAuditPayload | null {
  if (raw == null || raw === '' || raw === 'null') return null
  try {
    const o = JSON.parse(raw) as Record<string, unknown>
    if (!o || typeof o !== 'object') return null
    const p: ExpenseAuditPayload = {}
    if (typeof o.transactionDate === 'string') p.transactionDate = o.transactionDate
    if (typeof o.category === 'string') p.category = o.category
    if (typeof o.subCategory === 'string') p.subCategory = o.subCategory
    if (typeof o.paymentMethod === 'string') p.paymentMethod = o.paymentMethod
    if (typeof o.amount === 'number' || typeof o.amount === 'string') p.amount = o.amount
    if (typeof o.note === 'string') p.note = o.note
    if (typeof o.proofFilePath === 'string') p.proofFilePath = o.proofFilePath
    if (typeof o.proofChanged === 'boolean') p.proofChanged = o.proofChanged
    return p
  } catch {
    return null
  }
}

function displayValue(key: keyof ExpenseAuditPayload, payload: ExpenseAuditPayload | null): string {
  if (!payload) return '—'
  const def = FIELD_ORDER.find((f) => f.key === key)
  if (!def) return '—'
  const raw = payload[key]
  if (raw === undefined || raw === null || raw === '') return '—'
  return def.format ? def.format(raw) : String(raw)
}

function appendProofDiff(
  diffs: AuditFieldDiff[],
  oldP: ExpenseAuditPayload | null,
  newP: ExpenseAuditPayload | null,
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

export function getExpenseAuditDisplayMode(actionType: string): 'create' | 'update' | 'delete' | 'default' {
  const a = (actionType || '').toUpperCase()
  if (a === 'CREATE') return 'create'
  if (a === 'DELETE') return 'delete'
  if (a === 'UPDATE') return 'update'
  return 'default'
}

export function computeExpenseTransactionDiffs(
  actionType: string,
  oldJson: string | null,
  newJson: string | null,
): AuditFieldDiff[] {
  const mode = getExpenseAuditDisplayMode(actionType)
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

export function summarizeExpenseTransactionCell(
  actionType: string,
  oldJson: string | null,
  newJson: string | null,
  which: 'old' | 'new',
): string {
  const mode = getExpenseAuditDisplayMode(actionType)
  if (mode === 'create') {
    if (which === 'old') return ''
    const p = parsePayload(newJson)
    if (!p) return '—'
    return `${displayValue('category', p)} · ${displayValue('amount', p)}`
  }
  if (mode === 'delete') {
    if (which === 'new') return ''
    const p = parsePayload(oldJson)
    if (!p) return '—'
    return `${displayValue('category', p)} · ${displayValue('amount', p)}`
  }
  const diffs = computeExpenseTransactionDiffs(actionType, oldJson, newJson)
  return summarizeDiffsForTableCell(diffs, which)
}

export function expenseTransactionTargetLabel(oldJson: string | null, newJson: string | null): string {
  const p = parsePayload(newJson) ?? parsePayload(oldJson)
  if (!p) return 'Transaksi kas keluar'
  return `${displayValue('category', p)} · ${displayValue('amount', p)}`
}
