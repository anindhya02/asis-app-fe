export type InventoryCategory =
  | 'ASET'
  | 'KEBUTUHAN_POKOK'
  | 'PERLENGKAPAN_IBADAH'
  | 'PENDIDIKAN'

export type InventoryUnit =
  | 'BUAH'
  | 'UNIT'
  | 'KARDUS'
  | 'LUSIN'
  | 'PCS'
  | 'SET'
  | 'LEMBAR'
  | 'KG'
  | 'PACK'
  | 'RIM'

export interface InventoryBreakdownRow {
  name: string
  amount: string
  amountDisplay?: string
}

/** Per sub-item saat pemakaian (jika dikirim API). */
export interface InventoryUsageLogBreakdown {
  breakdownId?: string
  name: string
  amount?: string | number | null
}

export interface InventoryUsageLogEntry {
  id: string
  quantityUsed: string
  usagePurpose: string
  auditMessage: string
  /** Rincian jumlah per sub-item; prioritas tampil di riwayat dibanding parse teks audit. */
  breakdownUsages?: InventoryUsageLogBreakdown[]
  createdByUsername?: string | null
  createdAt: string
}

export interface InventoryItem {
  id: string
  itemName: string
  category: InventoryCategory
  donorSource: string
  photoUrl: string
  quantity: string
  unit: InventoryUnit
  breakdownsList: { id?: string; name: string; amount: string }[]
  note?: string | null
  createdAt?: string
  createdByUsername?: string | null
  usageLogs?: InventoryUsageLogEntry[]
}

export interface RecordInventoryUsageResponse {
  usage: {
    id: string
    quantityUsed: string
    usagePurpose: string
    auditMessage: string
    breakdownUsages?: InventoryUsageLogBreakdown[]
    createdByUsername?: string | null
    createdAt: string
  }
  item: InventoryItem
}

export interface InventoryItemListResponse {
  content: {
    id: string
    itemName: string
    category?: InventoryCategory | string
    quantity: string
    unit: InventoryUnit | string
    donorSource: string
    createdAt: string
  }[]
  page: number
  limit: number
  totalElements: number
  totalPages: number
}

