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

export interface PaymentRequest {
  id: string
  title: string
  purpose: string
  amount: number
  expenseCategory: ExpenseCategory
  program?: string | null
  status: PaymentRequestStatus
  createdByUsername: string
  createdAt: string
  updatedAt: string
}

export interface PaymentRequestListResponse {
  content: PaymentRequest[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}
