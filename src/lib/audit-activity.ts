import type { AuditFieldDiff } from '@/lib/audit-diff'
import { summarizeDiffsForTableCell } from '@/lib/audit-cell-snippet'
import { formatProofChanged } from '@/lib/audit-cash-format'
import { formatProofLink } from '@/lib/audit-proof-link'

export interface ActivityAuditPayload {
  title?: string
  category?: string
  program?: string
  period?: string
  description?: string
  activityPhotoUrl?: string
  activityPhotoUrls?: string[]
  photoChanged?: boolean
  activityPhotoUrlOld?: string
  activityPhotoUrlNew?: string
}

const FIELD_ORDER: Array<{
  key: keyof Omit<
    ActivityAuditPayload,
    | 'activityPhotoUrl'
    | 'activityPhotoUrls'
    | 'photoChanged'
    | 'activityPhotoUrlOld'
    | 'activityPhotoUrlNew'
  >
  label: string
}> = [
  { key: 'title', label: 'Judul Kegiatan' },
  { key: 'category', label: 'Kategori Kegiatan' },
  { key: 'program', label: 'Program Kegiatan' },
  { key: 'period', label: 'Periode / Tanggal Kegiatan' },
  { key: 'description', label: 'Deskripsi / Konten Kegiatan' },
]

export function isActivityModule(moduleCode: string | null | undefined): boolean {
  return (moduleCode || '').toUpperCase() === 'ACTIVITY'
}

function parsePayload(raw: string | null): ActivityAuditPayload | null {
  if (raw == null || raw === '' || raw === 'null') return null
  try {
    const o = JSON.parse(raw) as Record<string, unknown>
    if (!o || typeof o !== 'object') return null
    const p: ActivityAuditPayload = {}
    if (typeof o.title === 'string') p.title = o.title
    if (typeof o.category === 'string') p.category = o.category
    if (typeof o.program === 'string') p.program = o.program
    if (typeof o.period === 'string') p.period = o.period
    if (typeof o.description === 'string') p.description = o.description
    if (typeof o.activityPhotoUrl === 'string') p.activityPhotoUrl = o.activityPhotoUrl
    if (typeof o.photoChanged === 'boolean') p.photoChanged = o.photoChanged
    if (typeof o.activityPhotoUrlOld === 'string') p.activityPhotoUrlOld = o.activityPhotoUrlOld
    if (typeof o.activityPhotoUrlNew === 'string') p.activityPhotoUrlNew = o.activityPhotoUrlNew
    if (Array.isArray(o.activityPhotoUrls)) {
      p.activityPhotoUrls = o.activityPhotoUrls
        .filter((u): u is string => typeof u === 'string' && u.trim().length > 0)
        .map((u) => u.trim())
    }
    return p
  } catch {
    return null
  }
}

function displayField(key: (typeof FIELD_ORDER)[number]['key'], payload: ActivityAuditPayload | null): string {
  if (!payload) return '—'
  const raw = payload[key]
  if (raw === undefined || raw === null || raw === '') return '—'
  if (key === 'description' && raw.length > 200) {
    return `${raw.slice(0, 200)}…`
  }
  return String(raw)
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

function collectPhotoUrls(payload: ActivityAuditPayload | null | undefined): string[] {
  if (!payload) return []
  const urls: string[] = []
  const add = (u: string | undefined) => {
    if (!u) return
    const t = u.trim()
    if (t && !urls.includes(t)) urls.push(t)
  }
  if (payload.activityPhotoUrls?.length) {
    for (const u of payload.activityPhotoUrls) add(u)
  }
  add(payload.activityPhotoUrl)
  add(payload.activityPhotoUrlOld)
  add(payload.activityPhotoUrlNew)
  return urls
}

function formatPhotoUrlsDisplay(urls: string[]): string {
  if (!urls.length) return '—'
  return urls.map((u) => formatProofLink(u)).join('\n')
}

function resolvePhotoUrlLists(
  oldP: ActivityAuditPayload | null,
  newP: ActivityAuditPayload | null,
): { oldUrls: string[]; newUrls: string[] } {
  const legacyOld = newP?.activityPhotoUrlOld ? [newP.activityPhotoUrlOld] : []
  const legacyNew = newP?.activityPhotoUrlNew ? [newP.activityPhotoUrlNew] : []
  const oldUrls = collectPhotoUrls(oldP)
  const newUrls = collectPhotoUrls(newP)
  return {
    oldUrls: oldUrls.length ? oldUrls : legacyOld,
    newUrls: newUrls.length ? newUrls : legacyNew,
  }
}

function appendPhotoDiff(
  diffs: AuditFieldDiff[],
  oldP: ActivityAuditPayload | null,
  newP: ActivityAuditPayload | null,
  mode: 'update' | 'delete',
): void {
  const { oldUrls, newUrls } = resolvePhotoUrlLists(oldP, newP)
  const oldText = formatPhotoUrlsDisplay(oldUrls)
  const newText = formatPhotoUrlsDisplay(newUrls)

  if (oldUrls.length || newUrls.length) {
    const kind: AuditFieldDiff['kind'] =
      mode === 'delete'
        ? 'removed'
        : oldText === newText
          ? 'unchanged'
          : 'changed'
    diffs.push(
      row('activityPhotoUrls', 'Foto Kegiatan', oldText, newText, kind),
    )
    return
  }

  if (mode === 'update' && newP?.photoChanged !== undefined) {
    const changed = newP.photoChanged === true
    diffs.push(
      row(
        'photoChanged',
        'Foto Kegiatan',
        '—',
        formatProofChanged(changed),
        changed ? 'changed' : 'unchanged',
      ),
    )
  }
}

function appendCreatePhotoDiff(diffs: AuditFieldDiff[], newP: ActivityAuditPayload): void {
  const urls = collectPhotoUrls(newP)
  if (!urls.length) return
  diffs.push(
    row(
      'activityPhotoUrls',
      'Foto Kegiatan',
      '',
      formatPhotoUrlsDisplay(urls),
      'added',
    ),
  )
}

export function getActivityAuditDisplayMode(actionType: string): 'create' | 'update' | 'delete' | 'default' {
  const a = (actionType || '').toUpperCase()
  if (a === 'CREATE') return 'create'
  if (a === 'DELETE') return 'delete'
  if (a === 'UPDATE') return 'update'
  return 'default'
}

export function computeActivityDiffs(
  actionType: string,
  oldJson: string | null,
  newJson: string | null,
): AuditFieldDiff[] {
  const mode = getActivityAuditDisplayMode(actionType)
  const oldP = parsePayload(oldJson)
  const newP = parsePayload(newJson)

  if (mode === 'create' && newP) {
    const rows = FIELD_ORDER.map(({ key, label }) =>
      row(key, label, '', displayField(key, newP), 'added'),
    )
    appendCreatePhotoDiff(rows, newP)
    return rows
  }

  if (mode === 'delete') {
    const p = oldP ?? newP
    if (!p) return []
    const rows = FIELD_ORDER.map(({ key, label }) =>
      row(key, label, displayField(key, p), displayField(key, p), 'removed'),
    )
    appendPhotoDiff(rows, p, p, 'delete')
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
    appendPhotoDiff(diffs, oldP, newP, 'update')
    return diffs
  }

  return []
}

export function summarizeActivityCell(
  actionType: string,
  oldJson: string | null,
  newJson: string | null,
  which: 'old' | 'new',
): string {
  const mode = getActivityAuditDisplayMode(actionType)
  if (mode === 'create') {
    if (which === 'old') return ''
    const p = parsePayload(newJson)
    if (!p?.title) return '—'
    return p.title
  }
  if (mode === 'delete') {
    if (which === 'new') return ''
    const p = parsePayload(oldJson)
    if (!p?.title) return '—'
    return p.title
  }
  const diffs = computeActivityDiffs(actionType, oldJson, newJson)
  return summarizeDiffsForTableCell(diffs, which, { maxFields: 2, maxValueLen: 40 })
}

export function activityTargetLabel(oldJson: string | null, newJson: string | null): string {
  const p = parsePayload(newJson) ?? parsePayload(oldJson)
  return p?.title || 'Postingan kegiatan'
}

export function activityDeleteCardTitle(): string {
  return 'Postingan kegiatan dihapus'
}
