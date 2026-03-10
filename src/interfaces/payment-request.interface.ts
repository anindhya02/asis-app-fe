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
  purpose: string
  amount: number
  expenseCategory: ExpenseCategory
  subCategory?: string | null
  program?: string | null
  neededDate?: string | null
  paymentMethod?: PaymentMethod | null
  recipient?: string | null
  notes?: string | null
  supportingDocumentUrl?: string | null
  supportingDocumentName?: string | null
  breakdowns?: BreakdownItem[] | null
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
