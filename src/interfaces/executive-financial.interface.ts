export type DonationGrowthDirection = 'UP' | 'DOWN' | 'STABLE'

export interface ExecutiveFinancialSelectedRange {
  startDate: string
  endDate: string
  period: string
}

export interface DonationGrowth {
  percentage: number | null
  direction: DonationGrowthDirection
}

export interface DonationTrendPoint {
  period: string
  label: string
  totalDonation: number | string
}

export interface ProgramVsOperationalRatio {
  programExpense: number | string
  operationalExpense: number | string
  totalExpense: number | string
  programPercentage: number | string
  operationalPercentage: number | string
}

export interface ExecutiveFinancialData {
  totalDonationYTD: number | string
  donationGrowth: DonationGrowth
  donationTrend: DonationTrendPoint[]
  programVsOperationalRatio: ProgramVsOperationalRatio
  selectedRange?: ExecutiveFinancialSelectedRange
}
