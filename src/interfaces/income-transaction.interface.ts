export type IncomeCategory = 'DONASI' | 'ZAKAT' | 'INFAQ' | 'LAIN_LAIN'

export type PaymentMethod = 'CASH' | 'TRANSFER'

export type SourceType = 'INDIVIDU' | 'KOMUNITAS' | 'PERUSAHAAN'

export interface IncomeTransaction {
  id: string
  transactionDate: string
  category: IncomeCategory
  sourceType: SourceType
  paymentMethod: PaymentMethod
  amount: number
  donorName?: string | null
  note?: string | null
  proofFilePath: string
  status: string
  createdByUsername: string
  createdAt: string
}

export interface IncomeTransactionListResponse {
  content: IncomeTransaction[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

