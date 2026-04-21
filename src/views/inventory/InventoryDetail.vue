<script setup lang="ts">
import { computed, ref } from 'vue'
import axios from 'axios'
import { useRoute, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import AsisSidebar from '@/components/AsisSidebar.vue'
import { useInventoryStore } from '@/stores/inventory.store'

const route = useRoute()
const router = useRouter()
const store = useInventoryStore()

const id = computed(() => {
  const raw = route.params.id
  if (typeof raw === 'string') return raw
  if (Array.isArray(raw)) return raw[0] ?? ''
  return ''
})

const item = computed(() => store.currentItem)
const isLoading = computed(() => store.loading)
const notFound = ref(false)
const showDeleteConfirm = ref(false)
const showImagePreview = ref(false)

function formatNumber(value?: string | number | null) {
  if (value == null) return '-'
  const n = Number(value)
  if (!Number.isFinite(n)) return String(value)
  return n.toLocaleString('id-ID')
}

function formatDate(value?: string) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('id-ID')
}

function formatCategory(value?: string) {
  if (!value) return '-'
  return value
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function categoryClass(value?: string) {
  switch ((value || '').toUpperCase()) {
    case 'ASET':
      return 'cat cat-aset'
    case 'KEBUTUHAN_POKOK':
      return 'cat cat-kebutuhan'
    case 'PERLENGKAPAN_IBADAH':
      return 'cat cat-ibadah'
    case 'PENDIDIKAN':
      return 'cat cat-pendidikan'
    default:
      return 'cat'
  }
}

const breakdownTotal = computed(() => {
  if (!item.value?.breakdownsList?.length) return 0
  return item.value.breakdownsList.reduce((sum, row) => sum + Number(row.amount || 0), 0)
})

function goBack() {
  router.push('/inventory')
}

function onEdit() {
  toast.info('Fitur Edit akan tersedia pada PBI-49')
}

function onDelete() {
  showDeleteConfirm.value = true
}

function confirmDelete() {
  showDeleteConfirm.value = false
  toast.info('Fitur Hapus akan tersedia pada PBI-50')
}

function downloadPhoto() {
  if (!item.value?.photoUrl) return
  window.open(item.value.photoUrl, '_blank', 'noopener,noreferrer')
}

async function loadDetail() {
  if (!id.value) {
    notFound.value = true
    return
  }

  notFound.value = false
  try {
    await store.fetchInventoryItemById(id.value)
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status
      if (status === 400 || status === 404) {
        notFound.value = true
        return
      }
    }
    // error lain ditampilkan melalui store.error
  }
}

void loadDetail()
</script>

<template>
  <div class="layout">
    <AsisSidebar />

    <main class="content">
      <header class="content-header">
        <div class="header-top">
          <div class="breadcrumb">
            <button type="button" class="breadcrumb-link" @click="goBack">
              Daftar Inventory
            </button>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a1a1a1"
              stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
            <span class="breadcrumb-current">Detail Item Inventory</span>
          </div>
          <div class="header-actions">
            <button type="button" class="btn-header btn-outline" @click="goBack">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              Kembali
            </button>
            <button type="button" class="btn-header btn-fill" @click="onEdit">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              Edit
            </button>
            <button type="button" class="btn-header btn-danger" @click="onDelete">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
              Hapus
            </button>
          </div>
        </div>
        <h1 class="page-title">Detail Item Inventory</h1>
      </header>

      <div v-if="store.error" class="error-banner">
        <p>{{ store.error }}</p>
      </div>

      <section v-if="isLoading" class="card">
        Memuat detail item...
      </section>

      <template v-else-if="item && !notFound">
        <section class="detail-grid">
          <article class="card card-info">
            <h2 class="card-title">Informasi Utama</h2>

            <div class="qty-highlight">
              <strong>{{ formatNumber(item.quantity) }}</strong>
              <span>{{ item.unit?.toLowerCase?.() || item.unit }}</span>
            </div>

            <div class="info-grid">
              <div class="field">
                <span class="label">Nama Barang</span>
                <span class="value">{{ item.itemName }}</span>
              </div>
              <div class="field">
                <span class="label">Sumber Donasi</span>
                <span class="value">{{ item.donorSource || '-' }}</span>
              </div>
              <div class="field">
                <span class="label">Kategori</span>
                <span :class="categoryClass(item.category)">{{ formatCategory(item.category) }}</span>
              </div>
              <div class="field">
                <span class="label">Jenis Donasi</span>
                <span class="value">-</span>
              </div>
              <div class="field">
                <span class="label">Dicatat</span>
                <span class="value">{{ formatDate(item.createdAt) }}</span>
              </div>
              <div class="field">
                <span class="label">Diperbarui</span>
                <span class="value">-</span>
              </div>
            </div>
          </article>

          <article class="card card-photo">
            <h2 class="card-title">Foto Barang</h2>
            <div v-if="item.photoUrl" class="photo-box">
              <img :src="item.photoUrl" alt="Foto barang inventory" class="photo" @click="showImagePreview = true" />
            </div>
            <div v-else class="photo-empty">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              <p class="muted">Tidak ada foto tersedia</p>
            </div>
            <button v-if="item.photoUrl" type="button" class="btn-download" @click="downloadPhoto">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Download Foto
            </button>
          </article>
        </section>

        <section class="card">
          <h2 class="card-title">Rincian Barang</h2>
          <table class="table" v-if="item.breakdownsList?.length">
            <thead>
              <tr>
                <th class="col-no">No</th>
                <th>Nama Item</th>
                <th class="col-amount">Jumlah</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, index) in item.breakdownsList" :key="row.id || `${row.name}-${index}`">
                <td class="cell-muted">{{ index + 1 }}</td>
                <td>{{ row.name }}</td>
                <td class="cell-amount">{{ formatNumber(row.amount) }}</td>
              </tr>
              <tr>
                <td />
                <td class="total-label">Total Rincian</td>
                <td class="total-value">{{ formatNumber(breakdownTotal) }}</td>
              </tr>
            </tbody>
          </table>
          <p v-else class="muted">Tidak ada rincian barang.</p>
        </section>

        <section class="card">
          <h2 class="card-title">Catatan</h2>
          <p class="note">{{ item.note || '-' }}</p>
        </section>

        <div class="footer-actions">
          <button type="button" class="btn-footer" @click="goBack">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Kembali ke Daftar
          </button>
        </div>
      </template>

      <section v-else class="card card-empty">
        <div class="empty-icon">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#F5A623"
            stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>
        <h3>Item tidak ditemukan</h3>
        <p>Data item inventory dengan ID tersebut tidak tersedia dalam sistem.</p>
        <button type="button" class="btn-fill btn-empty-back" @click="goBack">Kembali ke Daftar</button>
      </section>

      <div v-if="showDeleteConfirm" class="overlay" @click.self="showDeleteConfirm = false">
        <div class="modal">
          <h3>Konfirmasi Hapus</h3>
          <p>Fitur hapus item inventory akan tersedia pada PBI-50.</p>
          <div class="modal-actions">
            <button type="button" class="btn-modal" @click="showDeleteConfirm = false">Batal</button>
            <button type="button" class="btn-modal btn-modal-danger" @click="confirmDelete">Lanjut</button>
          </div>
        </div>
      </div>

      <div v-if="showImagePreview && item?.photoUrl" class="overlay" @click.self="showImagePreview = false">
        <div class="image-modal">
          <button type="button" class="image-close" @click="showImagePreview = false">×</button>
          <img :src="item.photoUrl" alt="Preview foto barang" class="image-full" />
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.layout { display: flex; min-height: 100vh; background: #f5f5f5; font-family: 'Manrope', system-ui, sans-serif; }
.content { flex: 1; overflow-y: auto; padding: 40px 32px; }
.content-header { margin-bottom: 20px; }
.header-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 8px; }
.header-actions { display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
.breadcrumb { display: flex; align-items: center; gap: 6px; font-size: 13px; margin-bottom: 10px; }
.breadcrumb-link { background: none; border: none; padding: 0; color: #00c6ac; cursor: pointer; font-size: 13px; }
.breadcrumb-current { color: #525252; }
.page-title { font-size: 32px; font-weight: 600; margin: 0; color: #171717; font-family: 'Poppins', system-ui, sans-serif; line-height: 1.2; }
.card { background: #fff; border: 1px solid #e5e5e5; border-radius: 12px; padding: 20px; margin-bottom: 14px; box-shadow: 0 1px 3px rgba(0,0,0,.04);}
.error-banner { background-color: #fff1f2; border: 1px solid rgba(255, 48, 62, 0.2); border-radius: 8px; padding: 12px 16px; margin-bottom: 16px; color: #ff303e; }
.error-banner p { margin: 0; }
.detail-grid { display: grid; grid-template-columns: 1fr 280px; gap: 14px; margin-bottom: 14px; }
.card-title { margin: 0 0 14px; font-family: 'Poppins', system-ui, sans-serif; font-size: 15px; font-weight: 600; color: #171717; padding-bottom: 10px; border-bottom: 1px solid #f0f0f0; }
.qty-highlight { display: inline-flex; align-items: baseline; gap: 8px; background: #ecfdf5; border: 1px solid #b7f4e9; border-radius: 10px; padding: 10px 14px; margin-bottom: 14px; }
.qty-highlight strong { font-size: 36px; color: #00c6ac; font-family: 'Poppins', system-ui, sans-serif; line-height: 1; }
.qty-highlight span { font-size: 16px; color: #00a896; font-weight: 600; margin-bottom: 4px; }
.info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px 22px; }
.field { display: flex; flex-direction: column; gap: 4px; }
.label { font-size: 12px; color: #a1a1a1; font-weight: 600; text-transform: uppercase; letter-spacing: .02em; }
.value { font-size: 14px; color: #404040; font-weight: 600; }
.cat { display: inline-flex; align-items: center; border-radius: 999px; padding: 4px 10px; font-size: 11px; font-weight: 700; line-height: 1; color: #525252; background: #f5f5f5; width: fit-content; }
.cat-aset { color: #3f51b5; background: #eef2ff; }
.cat-kebutuhan { color: #ea580c; background: #fff7ed; }
.cat-ibadah { color: #0f766e; background: #f0fdfa; }
.cat-pendidikan { color: #0369a1; background: #f0f9ff; }
.photo-box { border: 1px solid #f0f0f0; border-radius: 10px; padding: 8px; background: #fafafa; }
.photo { width: 100%; min-height: 160px; max-height: 240px; object-fit: cover; border-radius: 8px; cursor: zoom-in; }
.photo-empty { min-height: 160px; border: 1px dashed #e5e5e5; border-radius: 8px; background: #f8f8f8; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; color: #d4d4d4; }
.btn-download { margin-top: 10px; width: 100%; height: 38px; border: 1px solid #e5e7eb; border-radius: 8px; background: #fff; color: #525252; font-weight: 600; display: inline-flex; align-items: center; justify-content: center; gap: 6px; cursor: pointer; }
.btn-download:hover { border-color: #00c6ac; color: #00c6ac; }
.table { width: 100%; border-collapse: collapse; margin-top: 8px; }
th, td { text-align: left; padding: 11px 10px; border-bottom: 1px solid #f0f0f0; font-size: 14px; }
th { font-size: 13px; color: #737373; text-transform: uppercase; }
.col-no { width: 60px; }
.col-amount { width: 120px; text-align: right; }
.cell-muted { color: #737373; }
.cell-amount { text-align: right; font-weight: 600; }
.total-label { font-weight: 700; color: #171717; }
.total-value { text-align: right; font-weight: 700; color: #00c6ac; }
.note { margin: 0; color: #171717; font-size: 14px; line-height: 1.6; }
.muted { margin: 8px 0 0; color: #737373; font-size: 14px; }
.btn-header { height: 36px; border-radius: 8px; padding: 0 12px; display: inline-flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 700; cursor: pointer; }
.btn-outline { border: 1px solid #00c6ac; color: #00c6ac; background: #fff; }
.btn-fill { border: 1px solid #00c6ac; color: #fff; background: #00c6ac; }
.btn-danger { border: 1px solid #ef4444; color: #ef4444; background: #fff; }
.btn-footer { height: 42px; padding: 0 16px; border-radius: 10px; border: 1px solid #d4d4d4; background: #fff; color: #525252; font-weight: 700; display: inline-flex; align-items: center; gap: 6px; cursor: pointer; }
.footer-actions { margin-top: 4px; }
.card-empty { text-align: center; padding: 42px 20px; }
.card-empty h3 { margin: 0 0 8px; font-family: 'Poppins', system-ui, sans-serif; font-size: 22px; font-weight: 600; color: #171717; }
.card-empty p { margin: 0 0 18px; color: #525252; font-size: 14px; }
.empty-icon { width: 72px; height: 72px; border-radius: 999px; background: #fff8e1; display: flex; align-items: center; justify-content: center; margin: 0 auto 14px; }
.btn-empty-back { height: 42px; padding: 0 20px; border-radius: 8px; border: none; cursor: pointer; font-weight: 700; }
.overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.38); display: flex; align-items: center; justify-content: center; z-index: 1300; padding: 16px; }
.modal { width: min(440px, 100%); background: #fff; border-radius: 10px; padding: 24px; border: 1px solid #e5e5e5; box-shadow: 0 20px 40px rgba(0,0,0,.15); }
.modal h3 { margin: 0 0 8px; font-family: 'Poppins', system-ui, sans-serif; }
.modal p { margin: 0 0 14px; color: #525252; font-size: 14px; }
.modal-actions { display: flex; justify-content: flex-end; gap: 8px; }
.btn-modal { height: 44px; padding: 0 14px; border: 2px solid #e5e5e5; background: #fff; border-radius: 8px; font-weight: 700; cursor: pointer; min-width: 110px; }
.btn-modal-danger { border-color: #ff303e; color: #ff303e; }
.image-modal { position: relative; width: min(920px, 100%); max-height: 90vh; }
.image-close { position: absolute; top: -14px; right: -14px; border: none; background: #fff; border-radius: 999px; width: 36px; height: 36px; cursor: pointer; font-size: 18px; line-height: 1; box-shadow: 0 6px 14px rgba(0,0,0,.25); }
.image-full { width: 100%; max-height: calc(90vh - 20px); object-fit: contain; border-radius: 10px; display: block; }

@media (max-width: 1100px) {
  .detail-grid { grid-template-columns: 1fr; }
  .page-title { font-size: 30px; }
}
</style>

