<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePaymentRequestStore } from '@/stores/payment-request.store'
import AsisSidebar from '@/components/AsisSidebar.vue'
import PaymentRequestCancelConfirmModal from '@/components/PaymentRequestCancelConfirmModal.vue'
import type { PaymentRequestDetail } from '@/interfaces/payment-request.interface'
import { getCurrentUser } from '@/lib/auth'
import { isPengurus } from '@/lib/rbac'

const route = useRoute()
const router = useRouter()
const store = usePaymentRequestStore()

const id = computed(() => {
  const raw = route.params.id
  if (typeof raw === 'string') return raw
  if (Array.isArray(raw)) return raw[0] ?? ''
  return ''
})

const currentUser = computed(() => getCurrentUser())

// Tabs: shared layout for Pengurus (PBI-17) and future Ketua actions (PBI-22).
const activeTab = ref<'detail' | 'review'>('detail')

const categoryLabel: Record<string, string> = {
  OPERASIONAL: 'Operasional',
  KONSUMSI: 'Konsumsi',
  TRANSPORTASI: 'Transportasi',
  PERLENGKAPAN: 'Perlengkapan',
  PROGRAM_KEGIATAN: 'Program Kegiatan',
  GAJI: 'Gaji & Honor',
  INFRASTRUKTUR: 'Infrastruktur',
  LAIN_LAIN: 'Lain-lain',
}

const statusLabel: Record<string, string> = {
  DRAFT: 'Draft',
  PENDING_REVIEW: 'Pending',
  REVISION_REQUESTED: 'Revision',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
}

const statusClass: Record<string, string> = {
  DRAFT: 'badge--draft',
  PENDING_REVIEW: 'badge--pending',
  REVISION_REQUESTED: 'badge--revision',
  APPROVED: 'badge--approved',
  REJECTED: 'badge--rejected',
  CANCELLED: 'badge--cancelled',
}

const timelineStatusLabel: Record<string, string> = {
  DRAFT: 'Draft',
  PENDING_REVIEW: 'Menunggu Review',
  REVISION_REQUESTED: 'Permintaan Revisi',
  APPROVED: 'Disetujui',
  REJECTED: 'Ditolak',
  CANCELLED: 'Dibatalkan',
}

const timelineTone: Record<string, 'teal' | 'green' | 'amber' | 'red' | 'gray'> = {
  DRAFT: 'gray',
  PENDING_REVIEW: 'teal',
  REVISION_REQUESTED: 'amber',
  APPROVED: 'green',
  REJECTED: 'red',
  CANCELLED: 'red',
}

function labelOf(map: Record<string, string>, val: string) {
  return map[val] ?? val
}

function formatRoleDisplay(role: string) {
  const r = (role || '').toUpperCase()
  if (r === 'KETUA YAYASAN') return 'Ketua Yayasan'
  if (r === 'PENGURUS') return 'Pengurus'
  if (r === 'ADMIN') return 'Admin'
  return role || '—'
}

function categoryDisplay(detail: PaymentRequestDetail) {
  const cat = labelOf(categoryLabel, detail.expenseCategory)
  if (detail.expenseSubCategory) return `${cat} — ${detail.expenseSubCategory}`
  return cat
}

function formatCurrency(amount: number): string {
  return 'Rp ' + Number(amount).toLocaleString('id-ID')
}

const longDateOptions: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  const trimmed = dateStr.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const parts = trimmed.split('-')
    const y = Number(parts[0])
    const mo = Number(parts[1])
    const day = Number(parts[2])
    if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(day)) return dateStr
    const local = new Date(y, mo - 1, day)
    if (Number.isNaN(local.getTime())) return dateStr
    return local.toLocaleDateString('id-ID', longDateOptions)
  }
  const parsed = new Date(dateStr)
  if (Number.isNaN(parsed.getTime())) return dateStr
  return parsed.toLocaleDateString('id-ID', longDateOptions)
}

function formatDateTime(iso: string | undefined | null): string {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return iso
    return d.toLocaleString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

const detail = computed(() => store.currentDetail)

const canEditTicket = computed(() => {
  if (!isPengurus() || !detail.value) return false
  const st = detail.value.status
  if (st !== 'DRAFT' && st !== 'REVISION_REQUESTED') return false
  const un = currentUser.value?.username
  if (!un) return false
  return (detail.value.createdBy?.username || '').toLowerCase() === un.toLowerCase()
})

// PBI-19: same rules as list — owner + DRAFT/PENDING_REVIEW (reusable when Ketua gets cancel rules later).
const canCancelTicket = computed(() => {
  if (!isPengurus() || !detail.value) return false
  const st = detail.value.status
  if (st !== 'DRAFT' && st !== 'PENDING_REVIEW') return false
  const un = currentUser.value?.username
  if (!un) return false
  return (detail.value.createdBy?.username || '').toLowerCase() === un.toLowerCase()
})

const showCancelModal = ref(false)
const isCancelling = ref(false)

function onCancelModalClose() {
  if (isCancelling.value) return
  showCancelModal.value = false
}

async function confirmCancelTicket() {
  if (!id.value) return
  isCancelling.value = true
  try {
    const ok = await store.cancelPaymentRequest(id.value)
    if (ok) {
      showCancelModal.value = false
      await router.push('/payment-requests')
    }
  } finally {
    isCancelling.value = false
  }
}

const primaryAttachment = computed(() => {
  const list = detail.value?.attachments
  if (!list || list.length === 0) return null
  return list[0]
})

const proofUrl = computed(() => primaryAttachment.value?.url ?? null)

const isPdf = computed(() => {
  const url = proofUrl.value?.toLowerCase() ?? ''
  const name = primaryAttachment.value?.fileName?.toLowerCase() ?? ''
  return url.includes('/raw/upload/') || name.endsWith('.pdf')
})

const isImage = computed(() => {
  if (!proofUrl.value || isPdf.value) return false
  const url = proofUrl.value.toLowerCase()
  return url.includes('/image/upload/') || /\.(jpg|jpeg|png|gif|webp)(\?|$)/.test(url)
})

const proofFileName = computed(() => {
  return primaryAttachment.value?.fileName || proofUrl.value?.split('/').pop()?.split('?')[0] || null
})

const imageLoadError = ref(false)

const downloadUrl = computed(() => {
  const url = proofUrl.value
  if (!url) return null
  if (isPdf.value) return url
  if (url.includes('/image/upload/')) {
    return url.replace('/image/upload/', '/image/upload/fl_attachment/')
  }
  return url
})

const breakdownTotal = computed(() => {
  const rows = detail.value?.breakdownList
  if (!rows) return 0
  return rows.reduce((sum, row) => sum + Number(row.amount || 0), 0)
})

const reviewCount = computed(() => detail.value?.reviewHistory?.length ?? 0)

const paymentLabel: Record<string, string> = {
  CASH: 'Tunai',
  TRANSFER: 'Transfer Bank',
}

onMounted(async () => {
  try {
    await store.fetchPaymentRequestById(id.value)
  } catch {
    // 403 / 404 / errors: store.detailLoadError or empty detail
  }
})
</script>

<template>
  <div class="layout">
    <AsisSidebar />

    <main class="content">
      <template v-if="store.loading">
        <div class="content-inner">
          <div class="skel skel-title" />
          <div class="card">
            <div v-for="n in 6" :key="n" class="skel skel-row" />
          </div>
        </div>
      </template>

      <template v-else-if="store.detailLoadError === 'forbidden'">
        <div class="not-found">
          <div class="not-found-icon not-found-icon--muted">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
              stroke="#525252" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h2 class="not-found-title">Tidak memiliki akses</h2>
          <p class="not-found-sub">Anda tidak dapat membuka ticket pengajuan ini.</p>
          <button type="button" class="btn-primary" @click="router.push('/payment-requests')">
            Kembali ke daftar
          </button>
        </div>
      </template>

      <template v-else-if="store.detailLoadError === 'not_found' || !detail">
        <div class="not-found">
          <div class="not-found-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
              stroke="#F5A623" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <h2 class="not-found-title">Ticket tidak ditemukan</h2>
          <p class="not-found-sub">Data pengajuan dengan ID tersebut tidak tersedia dalam sistem.</p>
          <button type="button" class="btn-primary" @click="router.push('/payment-requests')">
            Kembali ke daftar
          </button>
        </div>
      </template>

      <template v-else>
        <div class="content-inner">
          <div class="page-header">
            <div class="breadcrumb">
              <button type="button" class="breadcrumb-link" @click="router.push('/payment-requests')">
                Pengajuan Dana
              </button>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a1a1a1"
                stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
              <span class="breadcrumb-current">Detail Pengajuan Dana</span>
            </div>

            <div class="title-row">
              <h1 class="page-title">Detail Pengajuan Dana</h1>
              <div class="header-actions">
                <button
                  v-if="canEditTicket"
                  type="button"
                  class="btn-outline-teal"
                  @click="router.push(`/payment-requests/${id}/edit`)"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                  Ubah
                </button>
                <button
                  v-if="canCancelTicket"
                  type="button"
                  class="btn-outline-cancel"
                  @click="showCancelModal = true"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="15" y1="9" x2="9" y2="15" />
                    <line x1="9" y1="9" x2="15" y2="15" />
                  </svg>
                  Batalkan
                </button>
              </div>
            </div>

            <nav class="tabs" aria-label="Bagian detail ticket">
              <button
                type="button"
                class="tab"
                :class="{ 'tab--active': activeTab === 'detail' }"
                @click="activeTab = 'detail'"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
                </svg>
                Detail Permintaan
              </button>
              <button
                type="button"
                class="tab"
                :class="{ 'tab--active': activeTab === 'review' }"
                @click="activeTab = 'review'"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                Riwayat Review
                <span class="tab-badge">{{ reviewCount }}</span>
              </button>
            </nav>
          </div>

          <!-- Tab: Detail Permintaan -->
          <template v-if="activeTab === 'detail'">
            <section class="card">
              <div class="section-head">
                <h3 class="card-title card-title--inline">Informasi Utama</h3>
                <span class="badge" :class="statusClass[detail.status] || ''">
                  {{ labelOf(statusLabel, detail.status) }}
                </span>
              </div>
              <div class="detail-grid">
                <div class="detail-row">
                  <span class="detail-label">Judul</span>
                  <span class="detail-value">{{ detail.title }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Kategori</span>
                  <span class="detail-value">{{ categoryDisplay(detail) }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Metode Pembayaran</span>
                  <span class="detail-value">{{
                    detail.paymentMethod ? labelOf(paymentLabel, detail.paymentMethod) : '—'
                  }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Tanggal Kebutuhan Dana</span>
                  <span class="detail-value">{{ formatDate(detail.neededDate) }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Tanggal Dibuat</span>
                  <span class="detail-value">{{ formatDate(detail.createdAt) }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Terakhir diubah</span>
                  <span class="detail-value">{{ formatDateTime(detail.updatedAt) }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Diubah oleh</span>
                  <span class="detail-value">{{
                    detail.updatedByUsername ? '@' + detail.updatedByUsername : '—'
                  }}</span>
                </div>
              </div>
              <div class="amount-highlight">
                <span class="amount-label">Nominal Pengajuan</span>
                <span class="amount-value">{{ formatCurrency(detail.amount) }}</span>
              </div>
            </section>

            <section class="card">
              <h3 class="card-title card-title--bordered">Rincian Penggunaan Dana</h3>
              <div class="table-wrap">
                <table class="inner-table">
                  <thead>
                    <tr>
                      <th class="col-no">No.</th>
                      <th>Deskripsi</th>
                      <th class="col-amount">Nominal</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(row, idx) in detail.breakdownList" :key="row.id || idx">
                      <td class="col-no">{{ idx + 1 }}</td>
                      <td>{{ row.description }}</td>
                      <td class="col-amount">{{ formatCurrency(Number(row.amount)) }}</td>
                    </tr>
                    <tr v-if="!detail.breakdownList?.length">
                      <td colspan="3" class="empty-inline">Tidak ada rincian</td>
                    </tr>
                  </tbody>
                  <tfoot v-if="detail.breakdownList?.length">
                    <tr>
                      <td colspan="2" class="tfoot-label">Total Breakdown</td>
                      <td class="col-amount tfoot-amount">{{ formatCurrency(breakdownTotal) }}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </section>

            <section class="card">
              <h3 class="card-title card-title--bordered">Lampiran Dokumen</h3>
              <template v-if="proofUrl">
                <template v-if="isImage && !imageLoadError">
                  <div class="proof-image-wrapper">
                    <img
                      :src="proofUrl"
                      :alt="proofFileName ?? 'Lampiran'"
                      class="proof-image"
                      @error="imageLoadError = true"
                    />
                  </div>
                </template>
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
                    <p class="proof-filetype">PDF</p>
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
                    <p class="proof-filetype">File</p>
                  </div>
                </template>
                <a
                  v-if="!isPdf"
                  :href="downloadUrl ?? proofUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="btn-outline-teal btn-download"
                  :download="proofFileName ?? undefined"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Download
                </a>
              </template>
              <div v-else class="proof-empty">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
                  stroke="#d4d4d4" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                <p>Tidak ada lampiran</p>
              </div>
            </section>

            <section class="card">
              <h3 class="card-title">Catatan Tambahan</h3>
              <div class="note-box">
                <p class="note-text">{{ detail.notes?.trim() || '—' }}</p>
              </div>
            </section>

            <section class="card card--subtle">
              <h3 class="card-title card-title--small">Informasi Pengaju</h3>
              <div class="requester-row">
                <div class="requester-avatar" aria-hidden="true">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                    stroke="#525252" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
                <div>
                  <p class="requester-name">{{ detail.createdBy?.name || detail.createdBy?.username || '—' }}</p>
                  <p class="requester-meta">
                    {{ formatRoleDisplay(detail.createdBy?.role || '') }}
                    <span v-if="detail.createdBy?.username" class="dot">·</span>
                    <span v-if="detail.createdBy?.username">@{{ detail.createdBy.username }}</span>
                  </p>
                  <p class="requester-time">{{ formatDateTime(detail.createdAt) }}</p>
                </div>
              </div>
            </section>
          </template>

          <!-- Tab: Riwayat Review -->
          <template v-else>
            <section class="card">
              <div class="section-head">
                <h3 class="card-title card-title--inline">Riwayat Review</h3>
                <span class="pill-count">{{ reviewCount }} aktivitas</span>
              </div>

              <div v-if="reviewCount === 0" class="review-empty">
                <div class="review-empty-icon">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
                    stroke="#a3a3a3" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                </div>
                <p class="review-empty-title">Belum ada riwayat review</p>
                <p class="review-empty-sub">
                  Riwayat akan muncul saat ticket ini mulai diproses atau mendapat tindakan dari ketua.
                </p>
              </div>

              <ul v-else class="timeline">
                <li
                  v-for="(item, index) in detail.reviewHistory"
                  :key="index + item.occurredAt + item.status"
                  class="timeline-item"
                >
                  <div class="timeline-rail" aria-hidden="true">
                    <div
                      class="timeline-dot"
                      :class="'timeline-dot--' + (timelineTone[item.status] || 'gray')"
                    >
                      <template v-if="item.status === 'APPROVED'">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                          stroke-width="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                      </template>
                      <template v-else-if="item.status === 'REJECTED' || item.status === 'CANCELLED'">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                          stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                      </template>
                      <template v-else-if="item.status === 'REVISION_REQUESTED'">
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="2"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        >
                          <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                          <path d="M3 3v5h5" />
                          <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                          <path d="M21 21v-5h-5" />
                        </svg>
                      </template>
                      <template v-else>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                          stroke-width="2"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
                      </template>
                    </div>
                    <div v-if="index < detail.reviewHistory.length - 1" class="timeline-line" />
                  </div>
                  <div class="timeline-body">
                    <div class="timeline-top">
                      <span
                        class="timeline-badge"
                        :class="'timeline-badge--' + (timelineTone[item.status] || 'gray')"
                      >
                        {{ labelOf(timelineStatusLabel, item.status) }}
                      </span>
                      <span class="timeline-time">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a1a1a1"
                          stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                        </svg>
                        {{ formatDateTime(item.occurredAt) }}
                      </span>
                    </div>
                    <p class="timeline-actor">
                      {{ item.actorName || '—' }}
                      <span class="timeline-role">· {{ formatRoleDisplay(item.actorRole) }}</span>
                    </p>
                    <div
                      v-if="item.note && item.note.trim()"
                      class="timeline-note"
                      :class="{
                        'timeline-note--danger': item.status === 'REJECTED' || item.status === 'CANCELLED',
                        'timeline-note--warn': item.status === 'REVISION_REQUESTED',
                      }"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      </svg>
                      <span>{{ item.note }}</span>
                    </div>
                  </div>
                </li>
              </ul>
            </section>
          </template>

          <div class="back-row">
            <button type="button" class="btn-outline-gray" @click="router.push('/payment-requests')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
              </svg>
              Kembali ke daftar
            </button>
          </div>
        </div>
      </template>
    </main>

    <PaymentRequestCancelConfirmModal
      :is-open="showCancelModal"
      :loading="isCancelling"
      @cancel="onCancelModalClose"
      @confirm="confirmCancelTicket"
    />
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

.not-found-icon--muted {
  background-color: #f5f5f5;
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

.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border-radius: 8px;
  padding: 0 20px;
  height: 44px;
  border: none;
  background-color: #00c6ac;
  color: #ffffff;
  font-size: 14px;
  font-weight: 600;
  font-family: 'Manrope', system-ui, sans-serif;
  cursor: pointer;
}

.btn-primary:hover { background-color: #00b39c; }

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

.page-header { margin-bottom: 0; }

.title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}

.page-title {
  font-family: 'Poppins', system-ui, sans-serif;
  font-size: 32px;
  font-weight: 600;
  color: #171717;
  margin: 0 0 20px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.tabs {
  display: flex;
  gap: 8px;
  border-bottom: 1px solid #e5e5e5;
  margin-top: 4px;
}

.tab {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 4px 14px;
  margin-right: 20px;
  background: none;
  border: none;
  border-bottom: 3px solid transparent;
  margin-bottom: -1px;
  font-size: 14px;
  font-weight: 600;
  color: #737373;
  cursor: pointer;
  font-family: 'Manrope', system-ui, sans-serif;
}

.tab:hover { color: #404040; }

.tab--active {
  color: #00c6ac;
  border-bottom-color: #00c6ac;
}

.tab-badge {
  min-width: 22px;
  height: 22px;
  padding: 0 6px;
  border-radius: 999px;
  background: #e6faf7;
  color: #00a88f;
  font-size: 12px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.card {
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e5e5e5;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
  padding: 32px;
}

.card--subtle {
  background: #fafafa;
}

.card-title {
  font-family: 'Poppins', system-ui, sans-serif;
  font-size: 16px;
  font-weight: 600;
  color: #171717;
  margin: 0 0 24px;
}

.card-title--bordered {
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.card-title--inline {
  margin: 0;
}

.card-title--small {
  font-size: 14px;
  margin-bottom: 16px;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}

.badge--draft { background-color: #f5f5f5; color: #525252; }
.badge--pending { background-color: #fef9c3; color: #854d0e; }
.badge--revision { background-color: #fef3c7; color: #b45309; }
.badge--approved { background-color: #dcfce7; color: #166534; }
.badge--rejected { background-color: #fee2e2; color: #b91c1c; }
.badge--cancelled { background-color: #f5f5f5; color: #737373; }

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
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.detail-value {
  font-size: 14px;
  font-weight: 600;
  color: #171717;
}

.amount-highlight {
  margin-top: 24px;
  padding: 20px 24px;
  border-radius: 10px;
  background: #e6faf7;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.amount-label {
  font-size: 12px;
  font-weight: 600;
  color: #0f766e;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.amount-value {
  font-family: 'Poppins', system-ui, sans-serif;
  font-size: 28px;
  font-weight: 700;
  color: #00c6ac;
}

.table-wrap { overflow-x: auto; }

.inner-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.inner-table th,
.inner-table td {
  padding: 12px 10px;
  border-bottom: 1px solid #e5e5e5;
  text-align: left;
}

.inner-table th {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #737373;
  font-weight: 600;
}

.col-no { width: 48px; color: #737373; }
.col-amount { text-align: right; font-weight: 600; }

.tfoot-label {
  font-weight: 600;
  color: #404040;
  border-bottom: none;
  padding-top: 16px;
}

.tfoot-amount {
  border-bottom: none;
  padding-top: 16px;
  font-family: 'Poppins', system-ui, sans-serif;
  color: #00c6ac;
  font-size: 15px;
}

.empty-inline {
  text-align: center;
  color: #a1a1a1;
  padding: 24px;
}

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

.proof-image-wrapper {
  border: 1px solid #e5e5e5;
  border-radius: 10px;
  overflow: hidden;
  background: #fafafa;
  margin-bottom: 16px;
  max-height: 480px;
  display: flex;
  align-items: center;
  justify-content: center;
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

.proof-file-icon--pdf { background: #fff1f2; }
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

.btn-outline-teal {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  border-radius: 8px;
  border: 1px solid #00c6ac;
  background: #fff;
  color: #00c6ac;
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
  text-decoration: none;
  font-family: 'Manrope', system-ui, sans-serif;
}

.btn-outline-cancel {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  border-radius: 8px;
  border: 1px solid #fecaca;
  background: #fff;
  color: #b91c1c;
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
  font-family: 'Manrope', system-ui, sans-serif;
}

.btn-outline-cancel:hover {
  background: #fef2f2;
  border-color: #fca5a5;
}

.btn-open-pdf { margin-top: 8px; }

.btn-download { margin-top: 8px; }

.proof-empty {
  border: 2px dashed #d4d4d4;
  border-radius: 10px;
  padding: 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: #a1a1a1;
  font-size: 14px;
}

.requester-row {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.requester-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #e5e5e5;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.requester-name {
  margin: 0 0 4px;
  font-weight: 600;
  font-size: 15px;
  color: #171717;
}

.requester-meta {
  margin: 0 0 4px;
  font-size: 13px;
  color: #737373;
}

.dot { margin: 0 4px; }

.requester-time {
  margin: 0;
  font-size: 12px;
  color: #a1a1a1;
}

.pill-count {
  font-size: 12px;
  font-weight: 600;
  color: #00a88f;
  background: #e6faf7;
  padding: 4px 12px;
  border-radius: 999px;
}

.review-empty {
  text-align: center;
  padding: 48px 24px 32px;
}

.review-empty-icon {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
}

.review-empty-title {
  font-weight: 600;
  font-size: 16px;
  color: #171717;
  margin: 0 0 8px;
}

.review-empty-sub {
  font-size: 14px;
  color: #737373;
  margin: 0 auto;
  max-width: 420px;
  line-height: 1.5;
}

.timeline {
  list-style: none;
  margin: 8px 0 0;
  padding: 0;
}

.timeline-item {
  display: flex;
  gap: 16px;
  position: relative;
}

.timeline-rail {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 36px;
  flex-shrink: 0;
}

.timeline-dot {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
  border: 2px solid transparent;
}

.timeline-dot--teal {
  background: #e6faf7;
  border-color: #99f6e4;
  color: #0d9488;
}

.timeline-dot--green {
  background: #dcfce7;
  border-color: #86efac;
  color: #15803d;
}

.timeline-dot--amber {
  background: #fef9c3;
  border-color: #fde047;
  color: #ca8a04;
}

.timeline-dot--red {
  background: #fee2e2;
  border-color: #fecaca;
  color: #b91c1c;
}

.timeline-dot--gray {
  background: #f5f5f5;
  border-color: #e5e5e5;
  color: #737373;
}

.timeline-line {
  flex: 1;
  width: 2px;
  min-height: 28px;
  background: #e5e5e5;
  margin: 4px 0 0;
}

.timeline-body {
  flex: 1;
  padding-bottom: 28px;
}

.timeline-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 6px;
}

.timeline-badge {
  font-size: 12px;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 999px;
}

.timeline-badge--teal { background: #e6faf7; color: #0f766e; }
.timeline-badge--green { background: #dcfce7; color: #166534; }
.timeline-badge--amber { background: #fef9c3; color: #854d0e; }
.timeline-badge--red { background: #fee2e2; color: #b91c1c; }
.timeline-badge--gray { background: #f5f5f5; color: #525252; }

.timeline-time {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #737373;
}

.timeline-actor {
  margin: 0 0 8px;
  font-size: 14px;
  font-weight: 600;
  color: #171717;
}

.timeline-role {
  font-weight: 500;
  color: #737373;
}

.timeline-note {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding: 12px 14px;
  border-radius: 8px;
  font-size: 13px;
  line-height: 1.5;
  color: #404040;
  background: #fafafa;
  border: 1px solid #e5e5e5;
}

.timeline-note--danger {
  background: #fff1f2;
  border-color: #fecdd3;
  color: #9f1239;
}

.timeline-note--warn {
  background: #fffbeb;
  border-color: #fde68a;
  color: #92400e;
}

.back-row {
  display: flex;
  justify-content: flex-start;
  padding-bottom: 8px;
}

.btn-outline-gray {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  border-radius: 8px;
  border: 1px solid #d4d4d4;
  background: #fff;
  color: #404040;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  font-family: 'Manrope', system-ui, sans-serif;
}

.btn-outline-gray:hover { background: #fafafa; }

@media (max-width: 720px) {
  .detail-grid { grid-template-columns: 1fr; }
}
</style>
