import type { AuditFieldDiff } from '@/lib/audit-diff'

export function formatProofLink(url: string | undefined | null): string {
  if (url == null || url === '' || url === 'null') return '—'
  const t = String(url).trim()
  return t.length > 0 ? t : '—'
}

/** Normalisasi URL agar bisa dibuka di browser (https, //cdn, dll.). */
export function normalizeAuditUrl(url: string | undefined | null): string | null {
  if (url == null) return null
  const t = url.trim()
  if (!t || t === '—') return null
  if (/^https?:\/\//i.test(t)) return t
  if (t.startsWith('//')) return `https:${t}`
  return null
}

export function isHttpUrl(value: string | undefined | null): boolean {
  return normalizeAuditUrl(value) != null
}

/** Satu atau beberapa URL (dipisah baris) untuk ditampilkan sebagai link. */
export function auditLinkLines(value: string | undefined | null): string[] {
  if (!value || value === '—') return []
  const lines = value.includes('\n') ? value.split('\n') : [value]
  const out: string[] = []
  for (const line of lines) {
    const n = normalizeAuditUrl(line)
    if (n && !out.includes(n)) out.push(n)
  }
  return out
}

/**
 * Baris diff link bukti/dokumen: nilai lama & baru berisi URL dari DB.
 */
export function appendDocumentLinkDiff(
  diffs: AuditFieldDiff[],
  oldUrl: string | undefined | null,
  newUrl: string | undefined | null,
  label: string,
  path = 'proofFilePath',
): void {
  const ov = formatProofLink(oldUrl)
  const nv = formatProofLink(newUrl)
  const kind: AuditFieldDiff['kind'] = ov === nv ? 'unchanged' : 'changed'
  diffs.push({
    path,
    label,
    oldDisplay: ov,
    newDisplay: nv,
    kind,
  })
}

export function proofUrlFromPayload(
  payload: Record<string, unknown> | null | undefined,
  preferKeys: string[],
): string | undefined {
  if (!payload) return undefined
  for (const key of preferKeys) {
    const v = payload[key]
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  return undefined
}
