export const AUDIT_ACTION_FILTER_OPTIONS = [
  { value: '', label: 'Semua Aksi' },
  { value: 'CREATE', label: 'Create' },
  { value: 'UPDATE', label: 'Update' },
  { value: 'DELETE', label: 'Delete' },
  { value: 'APPROVE', label: 'Approve' },
  { value: 'REJECT', label: 'Reject' },
  { value: 'REVIEW', label: 'Review' },
  { value: 'CANCEL', label: 'Cancel' },
  { value: 'SUBMIT', label: 'Submit' },
] as const

export const AUDIT_MODULE_FILTER_OPTIONS = [
  { value: '', label: 'Semua Fitur / Modul' },
  { value: 'USER', label: 'User Management' },
  { value: 'INCOME_TRANSACTION', label: 'Transaksi Kas Masuk' },
  { value: 'EXPENSE_TRANSACTION', label: 'Transaksi Kas Keluar' },
  { value: 'PAYMENT_REQUEST', label: 'Pengajuan Dana' },
  { value: 'INVENTORY_ITEM', label: 'Inventory Donasi' },
  { value: 'ACTIVITY', label: 'Postingan Kegiatan' },
] as const
