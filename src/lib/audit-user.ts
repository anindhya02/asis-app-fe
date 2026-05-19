import type { AuditFieldDiff } from '@/lib/audit-diff'

export interface UserAuditPayload {
  nama?: string
  username?: string
  role?: string
  passwordChanged?: boolean
}

export function isUserManagementModule(moduleCode: string | null | undefined): boolean {
  return (moduleCode || '').toUpperCase() === 'USER'
}

function parseUserPayload(raw: string | null): UserAuditPayload | null {
  if (raw == null || raw === '' || raw === 'null') return null
  try {
    const o = JSON.parse(raw) as Record<string, unknown>
    if (!o || typeof o !== 'object') return null
    const payload: UserAuditPayload = {}
    if (typeof o.nama === 'string') payload.nama = o.nama
    if (typeof o.username === 'string') payload.username = o.username
    if (typeof o.role === 'string') payload.role = o.role
    if (typeof o.passwordChanged === 'boolean') payload.passwordChanged = o.passwordChanged
    return payload
  } catch {
    return null
  }
}

function formatRole(role: string | undefined): string {
  if (!role) return '—'
  return role
}

/** Ringkasan satu baris untuk tabel / kartu deactivate */
export function formatUserSummary(payload: UserAuditPayload | null): string {
  if (!payload) return '—'
  const parts: string[] = []
  if (payload.nama) parts.push(`Nama: ${payload.nama}`)
  if (payload.username) parts.push(`Username: ${payload.username}`)
  if (payload.role) parts.push(`Role: ${formatRole(payload.role)}`)
  return parts.length > 0 ? parts.join(' · ') : '—'
}

export type UserAuditDisplayMode = 'create' | 'update' | 'deactivate' | 'default'

export function getUserAuditDisplayMode(actionType: string): UserAuditDisplayMode {
  const a = (actionType || '').toUpperCase()
  if (a === 'CREATE') return 'create'
  if (a === 'DELETE') return 'deactivate'
  if (a === 'UPDATE') return 'update'
  return 'default'
}

export function computeUserManagementDiffs(
  actionType: string,
  oldJson: string | null,
  newJson: string | null,
): AuditFieldDiff[] {
  const mode = getUserAuditDisplayMode(actionType)
  const oldP = parseUserPayload(oldJson)
  const newP = parseUserPayload(newJson)

  if (mode === 'create' && newP) {
    const rows: AuditFieldDiff[] = []
    if (newP.nama) {
      rows.push({
        path: 'nama',
        label: 'Nama',
        oldDisplay: '',
        newDisplay: newP.nama,
        kind: 'added',
      })
    }
    if (newP.username) {
      rows.push({
        path: 'username',
        label: 'Username',
        oldDisplay: '',
        newDisplay: newP.username,
        kind: 'added',
      })
    }
    if (newP.role) {
      rows.push({
        path: 'role',
        label: 'Role',
        oldDisplay: '',
        newDisplay: formatRole(newP.role),
        kind: 'added',
      })
    }
    return rows
  }

  if (mode === 'deactivate') {
    const p = oldP ?? newP
    if (!p) return []
    const rows: AuditFieldDiff[] = []
    if (p.nama) {
      rows.push({
        path: 'nama',
        label: 'Nama',
        oldDisplay: p.nama,
        newDisplay: p.nama,
        kind: 'removed',
      })
    }
    if (p.username) {
      rows.push({
        path: 'username',
        label: 'Username',
        oldDisplay: p.username,
        newDisplay: p.username,
        kind: 'removed',
      })
    }
    if (p.role) {
      rows.push({
        path: 'role',
        label: 'Role',
        oldDisplay: formatRole(p.role),
        newDisplay: formatRole(p.role),
        kind: 'removed',
      })
    }
    return rows
  }

  if (mode === 'update' && (oldP || newP)) {
    const diffs: AuditFieldDiff[] = []
    const fields: Array<{ key: keyof Pick<UserAuditPayload, 'nama' | 'username' | 'role'>; label: string }> = [
      { key: 'nama', label: 'Nama' },
      { key: 'username', label: 'Username' },
      { key: 'role', label: 'Role' },
    ]
    for (const { key, label } of fields) {
      const ov = oldP?.[key] ?? ''
      const nv = newP?.[key] ?? ''
      if (String(ov) !== String(nv)) {
        diffs.push({
          path: key,
          label,
          oldDisplay: ov ? String(ov) : '—',
          newDisplay: nv ? String(key === 'role' ? formatRole(String(nv)) : nv) : '—',
          kind: 'changed',
        })
      }
    }
    // Selalu tampilkan status password pada update (nilai password tidak pernah ditampilkan)
    if (mode === 'update') {
      const pwdChanged = newP?.passwordChanged === true
      diffs.push({
        path: 'passwordChanged',
        label: 'Password',
        oldDisplay: '—',
        newDisplay: pwdChanged ? 'Diubah' : 'Tidak diubah',
        kind: pwdChanged ? 'changed' : 'unchanged',
      })
    }
    return diffs
  }

  return []
}

export function summarizeUserManagementCell(
  actionType: string,
  oldJson: string | null,
  newJson: string | null,
  which: 'old' | 'new',
): string {
  const mode = getUserAuditDisplayMode(actionType)

  if (mode === 'create') {
    if (which === 'old') return ''
    return formatUserSummary(parseUserPayload(newJson))
  }

  if (mode === 'deactivate') {
    if (which === 'old') return ''
    return formatUserSummary(parseUserPayload(oldJson) ?? parseUserPayload(newJson))
  }

  const diffs = computeUserManagementDiffs(actionType, oldJson, newJson)
  if (diffs.length === 0) return '—'

  const parts = diffs
    .filter((d) => d.path !== 'passwordChanged' || which === 'new')
  .map((d) => {
    const v = which === 'old' ? d.oldDisplay : d.newDisplay
    if (d.path === 'passwordChanged' && which === 'new') {
      return `Password: ${v}`
    }
    if (!v || v === '—') return null
    return `${d.label}: ${v}`
  })
    .filter(Boolean)

  return parts.length > 0 ? parts.join(' · ') : '—'
}

export function userManagementTargetLabel(oldJson: string | null, newJson: string | null): string {
  const p = parseUserPayload(newJson) ?? parseUserPayload(oldJson)
  if (!p) return 'Pengguna'
  if (p.nama) return p.nama
  if (p.username) return p.username
  return 'Pengguna'
}

function describeUserUpdateChange(d: AuditFieldDiff): string {
  if (d.path === 'passwordChanged') {
    return d.newDisplay === 'Diubah' ? 'Password diubah' : 'Password tidak diubah'
  }
  if (d.oldDisplay && d.oldDisplay !== '—' && d.newDisplay && d.newDisplay !== '—') {
    return `${d.label}: ${d.oldDisplay} → ${d.newDisplay}`
  }
  return `${d.label}: ${d.newDisplay || d.oldDisplay}`
}

export function userManagementDescription(
  actionType: string,
  oldJson: string | null,
  newJson: string | null,
): string {
  const a = (actionType || '').toUpperCase()
  if (a === 'UPDATE') {
    const allDiffs = computeUserManagementDiffs(actionType, oldJson, newJson)
    const parts = allDiffs.map(describeUserUpdateChange)
    if (parts.length === 0) return 'Memperbarui data pengguna.'
    return `Memperbarui data pengguna (${parts.join(' · ')}).`
  }
  const p = parseUserPayload(newJson) ?? parseUserPayload(oldJson)
  const summary = formatUserSummary(p)
  switch (a) {
    case 'CREATE':
      return `Menambahkan pengguna baru. ${summary}`
    case 'DELETE':
      return `Menonaktifkan pengguna: ${summary}`
    default:
      return `Aktivitas user management: ${summary}`
  }
}
