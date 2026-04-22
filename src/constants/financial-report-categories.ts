import type { FinancialReportCategoryOption } from '@/interfaces/financial-report.interface'

/**
 * Harus selaras dengan enum backend IncomeCategory + ExpenseCategory
 * dan label yang dipakai di laporan masuk / laporan keluar.
 */
export const FINANCIAL_REPORT_CATEGORY_OPTIONS: FinancialReportCategoryOption[] = [
  { id: 'DONASI', label: 'Donasi' },
  { id: 'ZAKAT', label: 'Zakat' },
  { id: 'INFAQ', label: 'Infaq' },
  { id: 'LAIN_LAIN', label: 'Lain-lain' },
  { id: 'OPERASIONAL', label: 'Operasional' },
  { id: 'GAJI_HONOR', label: 'Gaji & honor' },
  { id: 'PROGRAM', label: 'Program' },
  { id: 'UTILITAS', label: 'Utilitas' },
  { id: 'PEMELIHARAAN', label: 'Pemeliharaan' },
  { id: 'TRANSPORTASI', label: 'Transportasi' },
]
