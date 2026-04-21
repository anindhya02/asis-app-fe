export interface FinancialReportBreakdownRow {
  rowType: string
  label: string
  totalIncome: string | number
  totalExpense: string | number
  netDifference: string | number
}

export interface FinancialReportDateRange {
  startDate: string
  endDate: string
}

export interface FinancialReportCategoryOption {
  id: string
  label: string
}

export interface FinancialReportData {
  period: string
  year: number
  month: number | null
  quarter: number | null
  periodLabel: string
  dateRange: FinancialReportDateRange
  totalIncome: string | number
  totalExpense: string | number
  netDifference: string | number
  selectedCategoryIds: string[]
  availableCategories: FinancialReportCategoryOption[]
  breakdown: FinancialReportBreakdownRow[]
}
