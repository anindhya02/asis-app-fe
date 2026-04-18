export type ExpenseCategory = string

export type PaymentMethod = 'CASH' | 'TRANSFER'

export interface ExpenseTransaction {
  id: string
  transactionDate: string
  category: ExpenseCategory
  subCategory?: string | null
  amount: number
  paymentMethod: PaymentMethod
  note?: string | null
  proofFilePath: string
  status: string
  createdByUsername: string
  createdAt: string
  updatedAt?: string | null
  updatedByUsername?: string | null
}

export interface ExpenseTransactionListResponse {
  content: ExpenseTransaction[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}
