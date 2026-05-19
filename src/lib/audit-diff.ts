import {
  computeExpenseTransactionDiffs,
  expenseTransactionTargetLabel,
  isExpenseTransactionModule,
  summarizeExpenseTransactionCell,
} from '@/lib/audit-expense-transaction'
import {
  computePaymentRequestDiffs,
  isPaymentRequestModule,
  paymentRequestTargetLabel,
  summarizePaymentRequestCell,
} from '@/lib/audit-payment-request'
import {
  computeIncomeTransactionDiffs,
  incomeTransactionTargetLabel,
  isIncomeTransactionModule,
  summarizeIncomeTransactionCell,
} from '@/lib/audit-income-transaction'
import {
  activityTargetLabel,
  computeActivityDiffs,
  isActivityModule,
  summarizeActivityCell,
} from '@/lib/audit-activity'
import {
  computeInventoryItemDiffs,
  inventoryItemTargetLabel,
  isInventoryItemModule,
  summarizeInventoryItemCell,
} from '@/lib/audit-inventory'
import {
  computeUserManagementDiffs,
  isUserManagementModule,
  summarizeUserManagementCell,
  userManagementTargetLabel,
} from '@/lib/audit-user'

export type AuditDiffKind = 'changed' | 'added' | 'removed' | 'unchanged'

export interface AuditFieldDiff {
  path: string
  label: string
  oldDisplay: string
  newDisplay: string
  kind: AuditDiffKind
  /** URL gambar untuk preview di audit log (mis. foto kegiatan) */
  oldImageUrl?: string | null
  newImageUrl?: string | null
}

const FIELD_LABELS: Record<string, string> = {
  id: 'ID',
  status: 'Status',
  title: 'Judul',
  amount: 'Nominal',
  note: 'Catatan',
  notes: 'Catatan',
  category: 'Kategori',
  subCategory: 'Sub kategori',
  transactionDate: 'Tanggal transaksi',
  paymentMethod: 'Metode bayar',
  proofFilePath: 'Bukti',
  expenseCategory: 'Kategori pengeluaran',
  donorName: 'Nama donatur',
  itemName: 'Nama barang',
  quantity: 'Jumlah',
  unit: 'Satuan',
  photoUrl: 'Foto',
  donorSource: 'Sumber donasi',
  nama: 'Nama',
  username: 'Username',
  role: 'Peran',
  createdAt: 'Dibuat',
  updatedAt: 'Diubah',
  deletedAt: 'Dihapus pada',
  deletedBy: 'Dihapus oleh',
  createdBy: 'Dibuat oleh',
  updatedBy: 'Diubah oleh',
  supportingDocumentUrl: 'Dokumen pendukung',
  supportingDocumentName: 'Nama dokumen',
  neededDate: 'Tanggal dibutuhkan',
}

function labelForPath(path: string): string {
  const leaf = path.includes('.') ? path.slice(path.lastIndexOf('.') + 1) : path
  const mapped = FIELD_LABELS[leaf] ?? FIELD_LABELS[path]
  if (mapped) return mapped
  return leaf
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .trim()
      .toUpperCase()
}

function stableLeaf(value: unknown): string {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'string') return value.length > 400 ? `${value.slice(0, 400)}…` : value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) {
    try {
      const s = JSON.stringify(value)
      return s.length > 300 ? `${s.slice(0, 300)}…` : s
    } catch {
      return '[array]'
    }
  }
  if (typeof value === 'object') {
    try {
      const s = JSON.stringify(value)
      return s.length > 400 ? `${s.slice(0, 400)}…` : s
    } catch {
      return '[object]'
    }
  }
  return String(value)
}

function flattenLeaves(obj: unknown, prefix = ''): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  if (obj === null || obj === undefined) return out
  if (typeof obj !== 'object' || Array.isArray(obj)) {
    if (prefix) out[prefix] = obj
    return out
  }
  const entries = Object.entries(obj as Record<string, unknown>)
  for (const [k, v] of entries) {
    if (k.startsWith('_')) continue
    const path = prefix ? `${prefix}.${k}` : k
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      Object.assign(out, flattenLeaves(v, path))
    } else {
      out[path] = v
    }
  }
  return out
}

function parseJsonObject(raw: string | null): Record<string, unknown> | null {
  if (raw == null || raw === '' || raw === 'null') return null
  try {
    const v = JSON.parse(raw) as unknown
    if (v === null || typeof v !== 'object' || Array.isArray(v)) return null
    return v as Record<string, unknown>
  } catch {
    return null
  }
}

export function computeAuditFieldDiffs(
  actionType: string,
  oldJson: string | null,
  newJson: string | null,
  moduleCode?: string | null,
): AuditFieldDiff[] {
  if (isUserManagementModule(moduleCode)) {
    return computeUserManagementDiffs(actionType, oldJson, newJson)
  }
  if (isIncomeTransactionModule(moduleCode)) {
    return computeIncomeTransactionDiffs(actionType, oldJson, newJson)
  }
  if (isExpenseTransactionModule(moduleCode)) {
    return computeExpenseTransactionDiffs(actionType, oldJson, newJson)
  }
  if (isPaymentRequestModule(moduleCode)) {
    return computePaymentRequestDiffs(actionType, oldJson, newJson)
  }
  if (isActivityModule(moduleCode)) {
    return computeActivityDiffs(actionType, oldJson, newJson)
  }
  if (isInventoryItemModule(moduleCode)) {
    return computeInventoryItemDiffs(actionType, oldJson, newJson)
  }
  const a = (actionType || '').toUpperCase()
  const oldObj = parseJsonObject(oldJson)
  const newObj = parseJsonObject(newJson)

  if (a === 'CREATE' && newObj) {
    const flat = flattenLeaves(newObj)
    return Object.keys(flat)
      .sort()
      .map((path) => ({
        path,
        label: labelForPath(path),
        oldDisplay: '—',
        newDisplay: stableLeaf(flat[path]),
        kind: 'added' as const,
      }))
  }

  if (a === 'DELETE' && oldObj) {
    const flat = flattenLeaves(oldObj)
    return Object.keys(flat)
      .sort()
      .map((path) => ({
        path,
        label: labelForPath(path),
        oldDisplay: stableLeaf(flat[path]),
        newDisplay: '—',
        kind: 'removed' as const,
      }))
  }

  if (!oldObj || !newObj) {
    return []
  }

  const fo = flattenLeaves(oldObj)
  const fn = flattenLeaves(newObj)
  const keys = new Set([...Object.keys(fo), ...Object.keys(fn)])
  const diffs: AuditFieldDiff[] = []

  for (const path of [...keys].sort()) {
    const o = fo[path]
    const n = fn[path]
    const os = stableLeaf(o)
    const ns = stableLeaf(n)
    if (os === ns) continue
    let kind: AuditDiffKind = 'changed'
    if ((o === undefined || o === null) && n !== undefined && n !== null) kind = 'added'
    else if ((n === undefined || n === null) && o !== undefined && o !== null) kind = 'removed'
    diffs.push({
      path,
      label: labelForPath(path),
      oldDisplay: os,
      newDisplay: ns,
      kind,
    })
  }
  return diffs
}

export function summarizeDiffForCell(
  actionType: string,
  oldJson: string | null,
  newJson: string | null,
  which: 'old' | 'new',
  moduleCode?: string | null,
): string {
  if (isUserManagementModule(moduleCode)) {
    return summarizeUserManagementCell(actionType, oldJson, newJson, which)
  }
  if (isIncomeTransactionModule(moduleCode)) {
    return summarizeIncomeTransactionCell(actionType, oldJson, newJson, which)
  }
  if (isExpenseTransactionModule(moduleCode)) {
    return summarizeExpenseTransactionCell(actionType, oldJson, newJson, which)
  }
  if (isPaymentRequestModule(moduleCode)) {
    return summarizePaymentRequestCell(actionType, oldJson, newJson, which)
  }
  if (isActivityModule(moduleCode)) {
    return summarizeActivityCell(actionType, oldJson, newJson, which)
  }
  if (isInventoryItemModule(moduleCode)) {
    return summarizeInventoryItemCell(actionType, oldJson, newJson, which)
  }
  const a = (actionType || '').toUpperCase()
  if (which === 'old' && a === 'CREATE') return '—'
  if (which === 'new' && a === 'DELETE') return '—'
  const diffs = computeAuditFieldDiffs(actionType, oldJson, newJson, moduleCode)
  if (diffs.length === 0) {
    if (which === 'old' && actionType === 'CREATE') return '—'
    if (which === 'new' && actionType === 'DELETE') return '—'
    return '—'
  }
  const parts = diffs.slice(0, 3).map((d) => {
    const v = which === 'old' ? d.oldDisplay : d.newDisplay
    const short = v.length > 40 ? `${v.slice(0, 40)}…` : v
    return `${d.label}: ${short}`
  })
  const more = diffs.length > 3 ? ` (+${diffs.length - 3})` : ''
  return parts.join(' · ') + more
}

export function targetSummaryFromAuditJson(
  moduleCode: string,
  oldJson: string | null,
  newJson: string | null,
): string {
  if (isUserManagementModule(moduleCode)) {
    return userManagementTargetLabel(oldJson, newJson)
  }
  if (isIncomeTransactionModule(moduleCode)) {
    return incomeTransactionTargetLabel(oldJson, newJson)
  }
  if (isExpenseTransactionModule(moduleCode)) {
    return expenseTransactionTargetLabel(oldJson, newJson)
  }
  if (isPaymentRequestModule(moduleCode)) {
    return paymentRequestTargetLabel(oldJson, newJson)
  }
  if (isActivityModule(moduleCode)) {
    return activityTargetLabel(oldJson, newJson)
  }
  if (isInventoryItemModule(moduleCode)) {
    return inventoryItemTargetLabel(oldJson, newJson)
  }
  const pick = (raw: string | null) => {
    const o = parseJsonObject(raw)
    if (!o) return null
    const title = o.title
    if (typeof title === 'string' && title.trim()) return title.trim()
    const itemName = o.itemName
    if (typeof itemName === 'string' && itemName.trim()) return itemName.trim()
    const id = o.id
    if (typeof id === 'string' && id.length > 0) return `ID ${id.slice(0, 8)}…`
    return null
  }
  return pick(newJson) ?? pick(oldJson) ?? moduleCode ?? 'Data'
}

export function humanActivityDescription(
  actionType: string,
  moduleLabel: string,
  target: string,
): string {
  const a = (actionType || '').toUpperCase()
  const mod = moduleLabel || 'Data'
  const t = target || 'data'
  switch (a) {
    case 'CREATE':
      return `Menambahkan ${mod}: ${t}.`
    case 'UPDATE':
      return `Memperbarui ${mod}: ${t}.`
    case 'DELETE':
      return `Menghapus / menonaktifkan ${mod}: ${t}.`
    case 'APPROVE':
      return `Menyetujui pengajuan dana: ${t}.`
    case 'REJECT':
      return `Menolak pengajuan dana: ${t}.`
    case 'REVIEW':
      return `Meminta revisi pada pengajuan dana: ${t}.`
    case 'CANCEL':
      return `Membatalkan pengajuan dana: ${t}.`
    default:
      return `Mencatat aktivitas pada ${mod}: ${t}.`
  }
}
