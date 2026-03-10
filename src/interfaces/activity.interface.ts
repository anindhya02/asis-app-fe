export type PostCategory =
  | 'Kegiatan Sosial'
  | 'Pendidikan'
  | 'Dakwah'
  | 'Kesehatan'
  | 'Pembangunan'
  | 'Lingkungan'
  | 'Lainnya'

export type PostProgram =
    | 'Pembangunan Masjid'
    | 'Santunan Anak Yatim'
    | 'Beasiswa Pendidikan'
    | 'Bantuan Sosial'
    | 'Distribusi Zakat'
    | 'Operasional Yayasan'
    | 'Wakaf Produktif'
    | 'Lainnya'

export const KATEGORI_OPTIONS: PostCategory[] = [
  'Kegiatan Sosial',
  'Pendidikan',
  'Dakwah',
  'Kesehatan',
  'Pembangunan',
  'Lingkungan',
  'Lainnya',
]

export const PROGRAM_OPTIONS: PostProgram[] = [
    'Pembangunan Masjid',
    'Santunan Anak Yatim',
    'Beasiswa Pendidikan',
    'Bantuan Sosial',
    'Distribusi Zakat',
    'Operasional Yayasan',
    'Wakaf Produktif',
    'Lainnya',
]

export interface AttachmentResponse {
  id: string
  url: string
  filename: string
  type: string
  size: number
}

export interface ActivityResponse {
  id: string
  title: string
  category: string
  program: string
  startDate: string
  endDate: string | null
  description: string
  status: string
  createdByUsername: string
  createdAt: string
  updatedAt: string
}

export interface CreateActivityRequest {
  title: string
  category: string
  program: string
  startDate: string
  endDate: string | null
  description: string
}

export interface UpdateActivityRequest {
  title: string
  category: string
  program: string
  startDate: string
  endDate: string | null
  description: string
}
