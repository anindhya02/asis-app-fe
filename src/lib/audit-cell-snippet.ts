import type { AuditFieldDiff } from '@/lib/audit-diff'
import { isHttpUrl, normalizeAuditUrl } from '@/lib/audit-proof-link'

/** Ringkas nilai untuk kolom tabel audit (URL, multi-foto, teks panjang). */
export function formatDiffValueForTableCell(value: string | undefined | null, maxLen = 48): string {
  if (value == null || value === '' || value === '—') return ''
  const segments = value.includes('\n')
    ? value.split('\n').map((s) => s.trim()).filter(Boolean)
    : [value.trim()]
  const formatted = segments.map((seg) => {
    if (isHttpUrl(seg)) {
      try {
        const norm = normalizeAuditUrl(seg)!
        const u = new URL(norm)
        const name = u.pathname.split('/').filter(Boolean).pop()
        if (name) {
          return name.length > maxLen ? `${name.slice(0, maxLen)}…` : name
        }
        return norm.length > maxLen ? `${norm.slice(0, maxLen)}…` : norm
      } catch {
        return seg.length > maxLen ? `${seg.slice(0, maxLen)}…` : seg
      }
    }
    return seg.length > maxLen ? `${seg.slice(0, maxLen)}…` : seg
  })
  if (!formatted.length) return ''
  if (formatted.length === 1) return formatted[0]
  const suffix = segments.some((s) => isHttpUrl(s)) ? 'foto' : 'item'
  return `${formatted[0]} (+${formatted.length - 1} ${suffix})`
}

export function summarizeDiffsForTableCell(
  diffs: AuditFieldDiff[],
  which: 'old' | 'new',
  options?: { maxFields?: number; maxValueLen?: number },
): string {
  if (!diffs.length) return '—'
  const maxFields = options?.maxFields ?? 3
  const maxValueLen = options?.maxValueLen ?? 48
  const parts = diffs.slice(0, maxFields).map((d) => {
    const raw = which === 'old' ? d.oldDisplay : d.newDisplay
    const v = formatDiffValueForTableCell(raw, maxValueLen)
    if (!v) return null
    return `${d.label}: ${v}`
  }).filter(Boolean) as string[]
  if (!parts.length) return '—'
  const more = diffs.length > maxFields ? ` (+${diffs.length - maxFields})` : ''
  return parts.join(' · ') + more
}
