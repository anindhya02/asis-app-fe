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

