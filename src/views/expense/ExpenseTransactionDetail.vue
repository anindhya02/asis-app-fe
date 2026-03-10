<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useExpenseTransactionStore } from '@/stores/expense-transaction.store'
import AsisSidebar from '@/components/AsisSidebar.vue'

const route = useRoute()
const router = useRouter()
const store = useExpenseTransactionStore()

const id = computed(() => route.params.id as string)

// ── Label maps ─────────────────────────────────────────────
const categoryLabel: Record<string, string> = {
  OPERASIONAL: 'Operasional',
  KONSUMSI: 'Konsumsi',
  TRANSPORTASI: 'Transportasi',
  PERLENGKAPAN: 'Perlengkapan',
  PROGRAM_KEGIATAN: 'Program Kegiatan',
  GAJI: 'Gaji',
  INFRASTRUKTUR: 'Infrastruktur',
  LAIN_LAIN: 'Lain-lain',
}

const paymentLabel: Record<string, string> = {
  CASH: 'Tunai',
  TRANSFER: 'Transfer Bank',
  QRIS: 'QRIS',
}

function label(map: Record<string, string>, val: string) {
  return map[val] ?? val
}

// ── Proof file helpers (Cloudinary-aware) ─────────────────
const proofUrl = computed(() => {
  const path = store.currentItem?.proofFilePath
  if (!path) return null
  return path
})

const isPdf = computed(() => {
  const path = store.currentItem?.proofFilePath?.toLowerCase() ?? ''
  return path.endsWith('.pdf') || path.includes('/raw/upload/')
})

const isImage = computed(() => {
  if (!proofUrl.value) return false
  if (isPdf.value) return false
  const path = store.currentItem?.proofFilePath?.toLowerCase() ?? ''
  return path.includes('/image/upload/') || /\.(jpg|jpeg|png|gif|webp)(\?|$)/.test(path)
})

const proofFileName = computed(() => {
  const p = store.currentItem?.proofFilePath
  if (!p) return null
  return p.split('/').pop()?.split('?')[0] ?? p
})

const imageLoadError = ref(false)

// Cloudinary: tambah fl_attachment untuk force download
const downloadUrl = computed(() => {
  const url = proofUrl.value
  if (!url) return null
  if (isPdf.value) return url
  if (url.includes('/image/upload/')) {
    return url.replace('/image/upload/', '/image/upload/fl_attachment/')
  }
  return url
})

// ── Format helpers ────────────────────────────────────────
function formatCurrency(amount: number): string {
  return 'Rp ' + amount.toLocaleString('id-ID')
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '—'
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}

// ── Load data ─────────────────────────────────────────────
onMounted(async () => {
  try {
    await store.fetchExpenseTransactionById(id.value)
  } catch {
    // 404 / error handled via store.error
  }
})
</script>

<template>
  <div class="layout">
    <AsisSidebar />

    <main class="content">
      <!-- ── Loading skeleton ── -->
      <template v-if="store.loading">
        <div class="content-inner">
          <div class="skel skel-title" />
          <div class="card">
            <div v-for="n in 6" :key="n" class="skel skel-row" />
          </div>
        </div>
      </template>

      <!-- ── 404 / Not found ── -->
      <template v-else-if="!store.currentItem">
        <div class="not-found">
          <div class="not-found-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
              stroke="#F5A623" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <h2 class="not-found-title">Transaksi tidak ditemukan</h2>
          <p class="not-found-sub">Data transaksi dengan ID tersebut tidak tersedia dalam sistem.</p>
          <button type="button" class="btn-primary" @click="router.push('/expense-transactions')">
            Kembali ke Daftar
          </button>
        </div>
      </template>

      <!-- ── Detail content ── -->
      <template v-else>
        <div class="content-inner">
          <!-- Breadcrumb & Header -->
          <div class="page-header">
            <div class="breadcrumb">
              <button type="button" class="breadcrumb-link" @click="router.push('/expense-transactions')">
                Daftar Pengeluaran
              </button>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a1a1a1"
                stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
              <span class="breadcrumb-current">Detail</span>
            </div>
            <div class="header-row">
              <h1 class="page-title">Detail Transaksi Pengeluaran</h1>
              <div class="header-actions">
                <button type="button" class="btn-outline-teal"
                  @click="router.push(`/expense-transactions/${id}/edit`)">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                  Edit
                </button>
                <button type="button" class="btn-outline-red">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    <path d="M10 11v6M14 11v6" />
                    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                  </svg>
                  Hapus
                </button>
              </div>
            </div>
          </div>

          <!-- Card: Informasi Utama -->
          <section class="card">
            <h3 class="card-title">Informasi Utama</h3>
            <div class="detail-grid">
              <div class="detail-row">
                <span class="detail-label">Tanggal</span>
                <span class="detail-value">{{ formatDate(store.currentItem.transactionDate) }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Kategori</span>
                <span class="detail-value">{{ label(categoryLabel, store.currentItem.category) }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Program</span>
                <span class="detail-value">{{ store.currentItem.program }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Metode Pembayaran</span>
                <span class="detail-value">{{ label(paymentLabel, store.currentItem.paymentMethod) }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Penerima Dana</span>
                <span class="detail-value">{{ store.currentItem.penerimaDana }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Pencatat</span>
                <span class="detail-value">{{ store.currentItem.createdByUsername }}</span>
              </div>
              <div class="detail-row detail-row--nominal">
                <span class="detail-label">Nominal</span>
                <span class="detail-value detail-value--nominal">
                  {{ formatCurrency(store.currentItem.amount) }}
                </span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Status</span>
                <span class="status-badge" :class="'status-' + store.currentItem.status.toLowerCase()">
                  {{ store.currentItem.status }}
                </span>
              </div>
            </div>
          </section>

          <!-- Card: Catatan -->
          <section class="card">
            <h3 class="card-title">Catatan</h3>
            <div class="note-box">
              <p class="note-text">{{ store.currentItem.note || '—' }}</p>
            </div>
          </section>

          <!-- Card: Bukti Transaksi -->
          <section class="card">
            <h3 class="card-title">Bukti Transaksi</h3>

            <template v-if="proofUrl">
              <!-- Image: inline preview -->
              <template v-if="isImage && !imageLoadError">
                <div class="proof-image-wrapper">
                  <img
                    :src="proofUrl"
                    :alt="proofFileName ?? 'Bukti transaksi'"
                    class="proof-image"
                    @error="imageLoadError = true"
                  />
                </div>
              </template>

              <!-- PDF: icon + open button -->
              <template v-else-if="isPdf">
                <div class="proof-preview">
                  <div class="proof-file-icon proof-file-icon--pdf">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
                      stroke="#FF303E" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                  </div>
                  <p class="proof-filename">{{ proofFileName }}</p>
                  <p class="proof-filetype">Dokumen PDF</p>
                  <a :href="proofUrl" target="_blank" rel="noopener noreferrer" class="btn-outline-teal btn-open-pdf">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                    Buka PDF
                  </a>
                </div>
              </template>

              <!-- Fallback: file icon -->
              <template v-else>
                <div class="proof-preview">
                  <div class="proof-file-icon proof-file-icon--image">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
                      stroke="#00c6ac" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                  </div>
                  <p class="proof-filename">{{ proofFileName }}</p>
                  <p class="proof-filetype">File Gambar</p>
                </div>
              </template>

              <!-- Download button (non-PDF only; PDF already has Buka PDF button) -->
              <a v-if="!isPdf" :href="downloadUrl ?? proofUrl" target="_blank" rel="noopener noreferrer"
                 :download="proofFileName" class="btn-outline-teal btn-download">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Download Bukti
              </a>
            </template>

            <!-- No proof -->
            <div v-else class="proof-empty">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
                stroke="#d4d4d4" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              <p>Tidak ada bukti transaksi</p>
            </div>
          </section>

          <!-- Back button -->
          <div class="back-row">
            <button type="button" class="btn-outline-gray" @click="router.push('/expense-transactions')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
              </svg>
              Kembali ke Daftar
            </button>
          </div>
        </div>
      </template>
    </main>
  </div>
</template>

<style scoped>
.layout {
  display: flex;
  min-height: 100vh;
  background-color: #f5f5f5;
  font-family: 'Manrope', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
}

.content {
  flex: 1;
  overflow-y: auto;
}

.content-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 32px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* ── Loading skeleton ── */
.skel {
  border-radius: 8px;
  background: linear-gradient(90deg, #e5e5e5 25%, #f0f0f0 50%, #e5e5e5 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
}

.skel-title { height: 36px; width: 320px; margin-bottom: 8px; }
.skel-row { height: 20px; margin-bottom: 12px; }

@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* ── 404 ── */
.not-found {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 32px;
  text-align: center;
}

.not-found-icon {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background-color: #FFF8E1;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
}

.not-found-title {
  font-family: 'Poppins', system-ui, sans-serif;
  font-size: 22px;
  font-weight: 600;
  color: #171717;
  margin: 0 0 8px;
}

.not-found-sub {
  font-size: 14px;
  color: #525252;
  margin: 0 0 24px;
}

/* ── Breadcrumb ── */
.breadcrumb {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  margin-bottom: 10px;
}

.breadcrumb-link {
  background: none;
  border: none;
  padding: 0;
  color: #00c6ac;
  font-size: 13px;
  font-family: 'Manrope', system-ui, sans-serif;
  cursor: pointer;
}

.breadcrumb-link:hover { text-decoration: underline; }
.breadcrumb-current { color: #525252; }

/* ── Header row ── */
.header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.page-title {
  font-family: 'Poppins', system-ui, sans-serif;
  font-size: 32px;
  font-weight: 600;
  color: #171717;
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 10px;
}

/* ── Card ── */
.card {
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e5e5e5;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
  padding: 32px;
}

.card-title {
  font-family: 'Poppins', system-ui, sans-serif;
  font-size: 16px;
  font-weight: 600;
  color: #171717;
  margin: 0 0 24px;
}

/* ── Detail grid ── */
.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px 48px;
}

.detail-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-label {
  font-size: 12px;
  color: #525252;
}

.detail-value {
  font-size: 14px;
  font-weight: 600;
  color: #171717;
}

.detail-row--nominal { grid-column: 1 / -1; }

.detail-value--nominal {
  font-family: 'Poppins', system-ui, sans-serif;
  font-size: 24px;
  color: #00c6ac;
}

/* ── Status badge ── */
.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  width: fit-content;
}

.status-active    { background: #e6faf7; color: #00c6ac; }
.status-deleted   { background: #fff1f2; color: #FF303E; }

/* ── Note ── */
.note-box {
  background: #fafafa;
  border-radius: 8px;
  padding: 16px;
}

.note-text {
  font-size: 14px;
  color: #404040;
  line-height: 1.6;
  margin: 0;
}

/* ── Proof ── */
.proof-image-wrapper {
  border: 1px solid #e5e5e5;
  border-radius: 10px;
  overflow: hidden;
  background: #fafafa;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  max-height: 480px;
}

.proof-image {
  display: block;
  width: 100%;
  max-height: 480px;
  object-fit: contain;
}

.proof-preview {
  border: 1px solid #e5e5e5;
  border-radius: 10px;
  padding: 32px;
  display: flex;
  flex-direction: column;
  align-items: center;
  background: #fafafa;
  margin-bottom: 16px;
}

.proof-file-icon {
  width: 56px;
  height: 56px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
}

.proof-file-icon--pdf   { background: #fff1f2; }
.proof-file-icon--image { background: #e6faf7; }

.proof-filename {
  font-size: 14px;
  font-weight: 600;
  color: #171717;
  margin: 0 0 4px;
}

.proof-filetype {
  font-size: 12px;
  color: #a1a1a1;
  margin: 0;
}

.btn-open-pdf {
  margin-top: 16px;
  text-decoration: none;
}

.proof-empty {
  border: 2px dashed #d4d4d4;
  border-radius: 10px;
  padding: 48px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: #a1a1a1;
  font-size: 14px;
}

/* ── Back row ── */
.back-row { display: flex; }

/* ── Buttons ── */
.btn-primary {
  height: 44px;
  padding: 0 24px;
  border-radius: 8px;
  border: none;
  background-color: #00c6ac;
  color: #ffffff;
  font-size: 14px;
  font-weight: 600;
  font-family: 'Manrope', system-ui, sans-serif;
  cursor: pointer;
  transition: background-color 0.15s;
}

.btn-primary:hover { background-color: #00b39c; }

.btn-outline-teal {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 40px;
  padding: 0 16px;
  border-radius: 8px;
  border: 2px solid #00c6ac;
  background-color: #ffffff;
  color: #00c6ac;
  font-size: 13px;
  font-weight: 600;
  font-family: 'Manrope', system-ui, sans-serif;
  cursor: pointer;
  text-decoration: none;
  transition: background-color 0.15s;
}

.btn-outline-teal:hover { background-color: #f0fdfb; }

.btn-download { height: 40px; }

.btn-outline-red {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 40px;
  padding: 0 16px;
  border-radius: 8px;
  border: 2px solid #FF303E;
  background-color: #ffffff;
  color: #FF303E;
  font-size: 13px;
  font-weight: 600;
  font-family: 'Manrope', system-ui, sans-serif;
  cursor: pointer;
  transition: background-color 0.15s;
}

.btn-outline-red:hover { background-color: #fff1f2; }

.btn-outline-gray {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 44px;
  padding: 0 20px;
  border-radius: 8px;
  border: 2px solid #d4d4d4;
  background-color: #ffffff;
  color: #404040;
  font-size: 14px;
  font-weight: 600;
  font-family: 'Manrope', system-ui, sans-serif;
  cursor: pointer;
  transition: background-color 0.15s;
}

.btn-outline-gray:hover:not(:disabled) { background-color: #f5f5f5; }
</style>
