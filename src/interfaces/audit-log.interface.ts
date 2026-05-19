export interface AuditLogRow {
  id: string
  occurredAt: string
  actionType: string
  moduleCode: string
  moduleLabel: string
  entityClassName: string
  entityId: string | null
  oldValueJson: string | null
  newValueJson: string | null
  actorUsername: string | null
  actorNama: string | null
  actorRole: string | null
}

export interface AuditLogPage {
  content: AuditLogRow[]
  totalElements: number
  totalPages: number
  number: number
  size: number
}
