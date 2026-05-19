import type { AuditFieldDiff } from '@/lib/audit-diff'
import { summarizeDiffsForTableCell } from '@/lib/audit-cell-snippet'
import {
  formatAuditAmount,
  formatAuditDate,
  formatEnumLabel,
  formatProofChanged,
} from '@/lib/audit-cash-format'
import { appendDocumentLinkDiff, formatProofLink } from '@/lib/audit-proof-link'

export interface PaymentRequestBreakdownLine {
  description?: string
  amount?: number | string
}

export interface PaymentRequestAuditPayload {
  title?: string
  neededDate?: string
  expenseCategory?: string
  subCategory?: string
  amount?: number | string
  paymentMethod?: string
  notes?: string
  breakdowns?: PaymentRequestBreakdownLine[]
  supportingDocumentUrl?: string
  supportingDocumentChanged?: boolean
  reviewNote?: string
}

const FIELD_ORDER: Array<{
  key: keyof Omit<
    PaymentRequestAuditPayload,
    'supportingDocumentUrl' | 'supportingDocumentChanged' | 'reviewNote' | 'breakdowns'
  >
  label: string
  format?: (v: unknown) => string
}> = [
  { key: 'title', label: 'Judul Pengajuan', format: (v) => (v ? String(v) : '—') },
  { key: 'neededDate', label: 'Tanggal Penggunaan Dana', format: (v) => formatAuditDate(String(v ?? '')) },
  { key: 'expenseCategory', label: 'Kategori', format: (v) => formatEnumLabel(String(v ?? '')) },
  { key: 'subCategory', label: 'Sub Kategori', format: (v) => (v ? String(v) : '—') },
  { key: 'amount', label: 'Nominal Penggunaan Dana', format: (v) => formatAuditAmount(v) },
  { key: 'paymentMethod', label: 'Metode Pembayaran', format: (v) => formatEnumLabel(String(v ?? '')) },
  { key: 'notes', label: 'Catatan Tambahan', format: (v) => (v ? String(v) : '—') },
]

export function isPaymentRequestModule(moduleCode: string | null | undefined): boolean {
  return (moduleCode || '').toUpperCase() === 'PAYMENT_REQUEST'
}

function parsePayload(raw: string | null): PaymentRequestAuditPayload | null {
  if (raw == null || raw === '' || raw === 'null') return null
  try {
    const o = JSON.parse(raw) as Record<string, unknown>
    if (!o || typeof o !== 'object') return null
    const p: PaymentRequestAuditPayload = {}
    if (typeof o.title === 'string') p.title = o.title
    if (typeof o.neededDate === 'string') p.neededDate = o.neededDate
    if (typeof o.expenseCategory === 'string') p.expenseCategory = o.expenseCategory
    if (typeof o.subCategory === 'string') p.subCategory = o.subCategory
    if (typeof o.amount === 'number' || typeof o.amount === 'string') p.amount = o.amount
    if (typeof o.paymentMethod === 'string') p.paymentMethod = o.paymentMethod
    if (typeof o.notes === 'string') p.notes = o.notes
    if (typeof o.reviewNote === 'string') p.reviewNote = o.reviewNote
    if (typeof o.supportingDocumentUrl === 'string') p.supportingDocumentUrl = o.supportingDocumentUrl
    if (typeof o.supportingDocumentChanged === 'boolean') {
      p.supportingDocumentChanged = o.supportingDocumentChanged
    }
    if (Array.isArray(o.breakdowns)) {
      p.breakdowns = o.breakdowns
        .filter((x) => x && typeof x === 'object')
        .map((x) => {
          const row = x as Record<string, unknown>
          return {
            description: typeof row.description === 'string' ? row.description : undefined,
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

function formatBreakdowns(lines: PaymentRequestBreakdownLine[] | undefined): string {
  if (!lines?.length) return '—'
  return lines
    .map((line, i) => {
      const desc = line.description?.trim() || '—'
      const amt = formatAuditAmount(line.amount)
      return `${i + 1}. ${desc} — ${amt}`
    })
    .join('\n')
}

function displayField(
  key: (typeof FIELD_ORDER)[number]['key'],
  payload: PaymentRequestAuditPayload | null,
): string {
  if (!payload) return '—'
  const def = FIELD_ORDER.find((f) => f.key === key)
  if (!def) return '—'
  const raw = payload[key]
  if (raw === undefined || raw === null || raw === '') return '—'
  return def.format ? def.format(raw) : String(raw)
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

export function getPaymentRequestAuditDisplayMode(actionType: string): string {
  const a = (actionType || '').toUpperCase()
  if (a === 'CREATE') return 'create'
  if (a === 'UPDATE') return 'update'
  if (a === 'CANCEL') return 'cancel'
  if (a === 'SUBMIT') return 'submit'
  if (a === 'APPROVE') return 'approve'
  if (a === 'REJECT') return 'reject'
  if (a === 'REVIEW') return 'review'
  return 'default'
}

function reviewNoteLabel(actionType: string): string {
  const a = (actionType || '').toUpperCase()
  if (a === 'REJECT') return 'Alasan Penolakan'
  if (a === 'REVIEW') return 'Catatan Revisi'
  if (a === 'APPROVE') return 'Alasan Persetujuan'
  return 'Catatan'
}

function buildStandardRows(
  payload: PaymentRequestAuditPayload | null,
  kind: AuditFieldDiff['kind'],
  emptyOld: boolean,
): AuditFieldDiff[] {
  if (!payload) return []
  const rows: AuditFieldDiff[] = FIELD_ORDER.map(({ key, label }) =>
    row(
      key,
      label,
      emptyOld ? '' : displayField(key, payload),
      displayField(key, payload),
      kind,
    ),
  )
  rows.push(
    row(
      'breakdowns',
      'Rincian Penggunaan Dana',
      emptyOld ? '' : formatBreakdowns(payload.breakdowns),
      formatBreakdowns(payload.breakdowns),
      kind,
    ),
  )
  return rows
}

function appendSupportingDocumentDiff(
  diffs: AuditFieldDiff[],
  oldP: PaymentRequestAuditPayload | null,
  newP: PaymentRequestAuditPayload | null,
): void {
  const oldUrl = oldP?.supportingDocumentUrl
  const newUrl = newP?.supportingDocumentUrl
  if (oldUrl || newUrl) {
    appendDocumentLinkDiff(diffs, oldUrl, newUrl, 'Dokumen Pendukung', 'supportingDocumentUrl')
    return
  }
  if (newP?.supportingDocumentChanged !== undefined) {
    const changed = newP.supportingDocumentChanged === true
    diffs.push(
      row(
        'supportingDocumentChanged',
        'Dokumen Pendukung',
        '—',
        formatProofChanged(changed),
        changed ? 'changed' : 'unchanged',
      ),
    )
  }
}

export function computePaymentRequestDiffs(
  actionType: string,
  oldJson: string | null,
  newJson: string | null,
): AuditFieldDiff[] {
  const mode = getPaymentRequestAuditDisplayMode(actionType)
  const oldP = parsePayload(oldJson)
  const newP = parsePayload(newJson)

  if (mode === 'create' && newP) {
    const rows = buildStandardRows(newP, 'added', true)
    if (newP.supportingDocumentUrl) {
      rows.push(
        row(
          'supportingDocumentUrl',
          'Dokumen Pendukung',
          '',
          formatProofLink(newP.supportingDocumentUrl),
          'added',
        ),
      )
    }
    return rows
  }

  if (mode === 'cancel') {
    const p = oldP ?? newP
    return buildStandardRows(p, 'removed', false)
  }

  if (mode === 'submit' && newP) {
    return buildStandardRows(newP, 'added', true)
  }

  if ((mode === 'approve' || mode === 'reject' || mode === 'review') && newP) {
    const rows = buildStandardRows(newP, 'added', true)
    if (newP.reviewNote) {
      rows.push(
        row(
          'reviewNote',
          reviewNoteLabel(actionType),
          '',
          newP.reviewNote,
          'added',
        ),
      )
    }
    return rows
  }

  if (mode === 'update' && (oldP || newP)) {
    const diffs: AuditFieldDiff[] = []
    for (const { key, label } of FIELD_ORDER) {
      const ov = displayField(key, oldP)
      const nv = displayField(key, newP)
      if (ov !== nv) {
        diffs.push(row(key, label, ov, nv, 'changed'))
      }
    }
    const ob = formatBreakdowns(oldP?.breakdowns)
    const nb = formatBreakdowns(newP?.breakdowns)
    if (ob !== nb) {
      diffs.push(row('breakdowns', 'Rincian Penggunaan Dana', ob, nb, 'changed'))
    }
    appendSupportingDocumentDiff(diffs, oldP, newP)
    return diffs
  }

  return []
}

export function summarizePaymentRequestCell(
  actionType: string,
  oldJson: string | null,
  newJson: string | null,
  which: 'old' | 'new',
): string {
  const mode = getPaymentRequestAuditDisplayMode(actionType)
  if (mode === 'create' || mode === 'submit') {
    if (which === 'old') return ''
    const p = parsePayload(newJson)
    if (!p?.title) return '—'
    return `${p.title} · ${displayField('amount', p)}`
  }
  if (mode === 'cancel') {
    if (which === 'new') return ''
    const p = parsePayload(oldJson)
    if (!p?.title) return '—'
    return `${p.title} · ${displayField('amount', p)}`
  }
  if (mode === 'approve' || mode === 'reject' || mode === 'review') {
    if (which === 'old') return ''
    const p = parsePayload(newJson)
    if (!p?.title) return '—'
    const note = p.reviewNote ? ` · ${p.reviewNote.slice(0, 40)}` : ''
    return `${p.title}${note}`
  }
  const diffs = computePaymentRequestDiffs(actionType, oldJson, newJson)
  return summarizeDiffsForTableCell(diffs, which, { maxValueLen: 40 })
}

export function paymentRequestTargetLabel(oldJson: string | null, newJson: string | null): string {
  const p = parsePayload(newJson) ?? parsePayload(oldJson)
  if (!p?.title) return 'Pengajuan dana'
  return p.title
}

export function paymentRequestDeleteCardTitle(): string {
  return 'Pengajuan dana dibatalkan'
}

export function paymentRequestWorkflowCardTitle(actionType: string): string {
  const a = (actionType || '').toUpperCase()
  switch (a) {
    case 'SUBMIT':
      return 'Pengajuan dana diajukan'
    case 'APPROVE':
      return 'Pengajuan dana disetujui'
    case 'REJECT':
      return 'Pengajuan dana ditolak'
    case 'REVIEW':
      return 'Pengajuan dana diminta revisi'
    default:
      return 'Pengajuan dana'
  }
}

export function isPaymentRequestWorkflowAction(actionType: string): boolean {
  const a = (actionType || '').toUpperCase()
  return a === 'SUBMIT' || a === 'APPROVE' || a === 'REJECT' || a === 'REVIEW'
}

export function isPaymentRequestSingleCardMode(actionType: string): boolean {
  const mode = getPaymentRequestAuditDisplayMode(actionType)
  return mode === 'cancel' || isPaymentRequestWorkflowAction(actionType)
}
