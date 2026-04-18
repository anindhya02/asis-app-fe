export type PaymentRequestStatus =
  | 'DRAFT'
  | 'PENDING_REVIEW'
  | 'REVISION_REQUESTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED'

export type ExpenseCategory =
  | 'OPERASIONAL'
  | 'KONSUMSI'
  | 'TRANSPORTASI'
  | 'PERLENGKAPAN'
  | 'PROGRAM_KEGIATAN'
  | 'GAJI'
  | 'INFRASTRUKTUR'
  | 'LAIN_LAIN'

export type PaymentMethod = 'CASH' | 'TRANSFER'

export interface BreakdownItem {
  id?: string
  description: string
  amount: number
}
export interface PaymentRequest {
  id: string
  title: string
  amount: number
  expenseCategory: ExpenseCategory
  subCategory?: string | null
  neededDate?: string | null
  paymentMethod?: PaymentMethod | null
  notes?: string | null
  supportingDocumentUrl?: string | null
  supportingDocumentName?: string | null
  breakdowns?: BreakdownItem[] | null
  status: PaymentRequestStatus
  createdByUsername: string
  createdAt: string
  updatedAt: string
  updatedByUsername?: string | null
}

export interface PaymentRequestListResponse {
  content: PaymentRequest[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export interface PaymentRequestAttachment {
  url: string
  fileName?: string | null
}

export interface PaymentRequestCreatedBy {
  username: string
  name: string
  role: string
}

export interface PaymentRequestReviewHistoryItem {
  status: PaymentRequestStatus
  actorName: string
  actorRole: string
  actorUsername?: string | null
  note?: string | null
  occurredAt: string
}

/** Detail response from GET /payment-requests/:id (Pengurus / Ketua / Admin access rules apply on backend). */
export interface PaymentRequestDetail {
  id: string
  title: string
  expenseCategory: ExpenseCategory
  expenseSubCategory?: string | null
  amount: number
  breakdownList: BreakdownItem[]
  neededDate?: string | null
  paymentMethod?: PaymentMethod | null
  notes?: string | null
  attachments: PaymentRequestAttachment[]
  status: PaymentRequestStatus
  createdAt: string
  updatedAt: string
  updatedByUsername?: string | null
  createdBy: PaymentRequestCreatedBy
  reviewHistory: PaymentRequestReviewHistoryItem[]
}