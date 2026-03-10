export type ExpenseCategory =
  | 'OPERASIONAL'
  | 'KONSUMSI'
  | 'TRANSPORTASI'
  | 'PERLENGKAPAN'
  | 'PROGRAM_KEGIATAN'
  | 'GAJI'
  | 'INFRASTRUKTUR'
  | 'LAIN_LAIN'

export type PaymentMethod = 'CASH' | 'TRANSFER' | 'QRIS'

export interface ExpenseTransaction {
  id: string
  transactionDate: string
  category: ExpenseCategory
  program: string
  amount: number
  paymentMethod: PaymentMethod
  penerimaDana: string
  note?: string | null
  proofFilePath: string
  status: string
  createdByUsername: string
  createdAt: string
}

export interface ExpenseTransactionListResponse {
  content: ExpenseTransaction[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}
