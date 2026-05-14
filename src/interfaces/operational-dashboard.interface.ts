export interface OperationalDashboardTicketSummary {
  pending: number;
  approved: number;
  reject: number;
  revisionRequested: number;
}

export interface OperationalDashboardData {
  period: string;
  year: number;
  month: number;
  totalFundIn: number | string;
  totalFundOut: number | string;
  runningBalance: number | string;
  ticketSummary: OperationalDashboardTicketSummary;
}
