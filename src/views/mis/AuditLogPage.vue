<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'
import AsisSidebar from '@/components/AsisSidebar.vue'
import { getAuthToken } from '@/lib/auth'
import type { AuditLogPage, AuditLogRow } from '@/interfaces/audit-log.interface'
import { AUDIT_ACTION_FILTER_OPTIONS, AUDIT_MODULE_FILTER_OPTIONS } from '@/constants/audit-log-options'
import {
  computeAuditFieldDiffs,
  summarizeDiffForCell,
  targetSummaryFromAuditJson,
} from '@/lib/audit-diff'
import {
  getExpenseAuditDisplayMode,
  isExpenseTransactionModule,
} from '@/lib/audit-expense-transaction'
import {
  getPaymentRequestAuditDisplayMode,
  isPaymentRequestModule,
  isPaymentRequestWorkflowAction,
  paymentRequestDeleteCardTitle,
  paymentRequestWorkflowCardTitle,
} from '@/lib/audit-payment-request'
import {
  getIncomeAuditDisplayMode,
  isIncomeTransactionModule,
} from '@/lib/audit-income-transaction'
import {
  activityDeleteCardTitle,
  getActivityAuditDisplayMode,
  isActivityModule,
} from '@/lib/audit-activity'
import {
  getUserAuditDisplayMode,
  isUserManagementModule,
} from '@/lib/audit-user'

const loading = ref(false)
const errorMessage = ref<string | null>(null)
const pageData = ref<AuditLogPage | null>(null)
const hasFetched = ref(false)

const filterFrom = ref('')
const filterTo = ref('')
const filterAction = ref('')
const filterModule = ref('')
const filterUser = ref('')

const page = ref(0)
const pageSize = 10

const detailOpen = ref(false)
const detailRow = ref<AuditLogRow | null>(null)

const actionOptions = AUDIT_ACTION_FILTER_OPTIONS
const moduleOptions = AUDIT_MODULE_FILTER_OPTIONS

const isEmpty = computed(
  () => hasFetched.value && !loading.value && !errorMessage.value && (pageData.value?.totalElements ?? 0) === 0,
)

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const date = d.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const time = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false })
  return `${date.replace(/\//g, '/')} ${time.replace(':', '.')}`
}

function actionDotClass(action: string): string {
  const a = (action || '').toUpperCase()
  if (a === 'CREATE') return 'dot-create'
  if (a === 'UPDATE') return 'dot-update'
  if (a === 'DELETE') return 'dot-delete'
  if (a === 'APPROVE') return 'dot-approve'
  if (a === 'REJECT') return 'dot-reject'
  if (a === 'REVIEW') return 'dot-review'
  if (a === 'CANCEL') return 'dot-cancel'
  return 'dot-default'
}

function getModuleDisplayMode(moduleCode: string, actionType: string): string {
  if (isUserManagementModule(moduleCode)) return getUserAuditDisplayMode(actionType)
  if (isIncomeTransactionModule(moduleCode)) return getIncomeAuditDisplayMode(actionType)
  if (isExpenseTransactionModule(moduleCode)) return getExpenseAuditDisplayMode(actionType)
  if (isPaymentRequestModule(moduleCode)) return getPaymentRequestAuditDisplayMode(actionType)
  if (isActivityModule(moduleCode)) return getActivityAuditDisplayMode(actionType)
  return 'default'
}

function formatActionLabel(action: string, moduleCode?: string): string {
  const a = (action || '').toUpperCase()
  if (a === 'DELETE' && isUserManagementModule(moduleCode)) return 'Nonaktifkan'
  if (
    a === 'DELETE'
    && (isIncomeTransactionModule(moduleCode)
      || isExpenseTransactionModule(moduleCode)
      || isActivityModule(moduleCode))
  ) {
    return 'Hapus'
  }
  if (a === 'CREATE') return 'Create'
  if (a === 'UPDATE') return 'Update'
  if (a === 'DELETE') return 'Delete'
  if (a === 'APPROVE') return 'Approve'
  if (a === 'REJECT') return 'Reject'
  if (a === 'REVIEW') return 'Review'
  if (a === 'CANCEL') return 'Cancel'
  if (a === 'SUBMIT') return 'Submit'
  return action || '—'
}

function cellSnippet(row: AuditLogRow, which: 'old' | 'new'): string {
  const text = summarizeDiffForCell(
    row.actionType,
    row.oldValueJson,
    row.newValueJson,
    which,
    row.moduleCode,
  )
  if (text === '') {
    const mode = getModuleDisplayMode(row.moduleCode, row.actionType)
    if (which === 'old' && (mode === 'create' || mode === 'deactivate' || mode === 'delete' || mode === 'cancel')) return ''
    if (which === 'new' && (mode === 'delete' || mode === 'cancel')) return ''
    if (which === 'old' && isPaymentRequestModule(row.moduleCode) && isPaymentRequestWorkflowAction(row.actionType)) {
      return ''
    }
  }
  return text === '' ? '—' : text
}

const detailDiffs = computed(() => {
  if (!detailRow.value) return []
  return computeAuditFieldDiffs(
    detailRow.value.actionType,
    detailRow.value.oldValueJson,
    detailRow.value.newValueJson,
    detailRow.value.moduleCode,
  )
})

const detailDisplayMode = computed(() => {
  if (!detailRow.value) return null
  return getModuleDisplayMode(detailRow.value.moduleCode, detailRow.value.actionType)
})

const detailIsDeleteCard = computed(() => {
  const m = detailDisplayMode.value
  return m === 'deactivate' || m === 'delete' || m === 'cancel'
})

const detailIsWorkflowCard = computed(() => {
  if (!detailRow.value) return false
  return (
    isPaymentRequestModule(detailRow.value.moduleCode)
    && isPaymentRequestWorkflowAction(detailRow.value.actionType)
  )
})

const detailIsSingleInfoCard = computed(() => detailIsDeleteCard.value || detailIsWorkflowCard.value)

const detailSingleCardTitle = computed(() => {
  if (!detailRow.value) return ''
  const mc = detailRow.value.moduleCode
  const at = detailRow.value.actionType
  if (isUserManagementModule(mc)) return 'Pengguna dinonaktifkan'
  if (isIncomeTransactionModule(mc)) return 'Transaksi kas masuk dihapus'
  if (isExpenseTransactionModule(mc)) return 'Transaksi kas keluar dihapus'
  if (isActivityModule(mc)) return activityDeleteCardTitle()
  if (isPaymentRequestModule(mc)) {
    if (getPaymentRequestAuditDisplayMode(at) === 'cancel') return paymentRequestDeleteCardTitle()
    if (isPaymentRequestWorkflowAction(at)) return paymentRequestWorkflowCardTitle(at)
  }
  return 'Data dihapus'
})

const detailShortId = computed(() => {
  const id = detailRow.value?.id || ''
  const hex = id.replace(/-/g, '')
  return hex.length >= 8 ? `al-${hex.slice(0, 8)}` : `al-${id.slice(0, 12)}`
})

const detailTargetLabel = computed(() => {
  if (!detailRow.value) return ''
  return targetSummaryFromAuditJson(
    detailRow.value.moduleCode,
    detailRow.value.oldValueJson,
    detailRow.value.newValueJson,
  )
})

function hasAuditImage(d: { oldImageUrl?: string | null; newImageUrl?: string | null }): boolean {
  return Boolean(d.oldImageUrl || d.newImageUrl)
}

function diffRowClass(kind: string): string {
  if (kind === 'added') return 'diff-row diff-added'
  if (kind === 'removed') return 'diff-row diff-removed'
  if (kind === 'unchanged') return 'diff-row diff-unchanged'
  return 'diff-row diff-changed'
}

function openDetail(row: AuditLogRow) {
  detailRow.value = row
  detailOpen.value = true
}

function closeDetail() {
  detailOpen.value = false
  detailRow.value = null
}

function paginationLabel(): string {
  const p = pageData.value
  if (!p || p.totalElements === 0) return '0 entri'
  const start = p.number * p.size + 1
  const end = Math.min(p.number * p.size + p.content.length, p.totalElements)
  return `${start}–${end} dari ${p.totalElements} entri`
}

async function fetchLogs() {
  errorMessage.value = null
  loading.value = true
  hasFetched.value = true
  const token = getAuthToken()
  if (!token) {
    loading.value = false
    errorMessage.value = 'Sesi login tidak ditemukan. Silakan login ulang.'
    pageData.value = null
    return
  }

  const params: Record<string, string | number> = {
    page: page.value,
    size: pageSize,
  }
  if (filterFrom.value) params.from = filterFrom.value
  if (filterTo.value) params.to = filterTo.value
  if (filterAction.value) params.actionType = filterAction.value
  if (filterModule.value) params.module = filterModule.value
  if (filterUser.value.trim()) params.user = filterUser.value.trim()

  try {
    const res = await axios.get<{ status: string; message: string; data: AuditLogPage }>(
      `${import.meta.env.VITE_API_URL}/auditlog`,
      { params, headers: { Authorization: `Bearer ${token}` } },
    )
    if (res.data.status !== 'success' || !res.data.data) {
      errorMessage.value = res.data.message || 'Gagal memuat audit log'
      pageData.value = null
      return
    }
    pageData.value = res.data.data
  } catch (e: unknown) {
    pageData.value = null
    if (axios.isAxiosError(e) && e.response?.status === 403) {
      errorMessage.value = 'Anda tidak memiliki akses ke halaman audit log.'
      return
    }
    if (axios.isAxiosError(e) && e.response?.data?.message) {
      errorMessage.value = String(e.response.data.message)
    } else {
      errorMessage.value = 'Terjadi kesalahan saat memuat audit log.'
    }
  } finally {
    loading.value = false
  }
}

function applyFilters() {
  page.value = 0
  fetchLogs()
}

function resetFilters() {
  filterFrom.value = ''
  filterTo.value = ''
  filterAction.value = ''
  filterModule.value = ''
  filterUser.value = ''
  page.value = 0
  fetchLogs()
}

function goPage(n: number) {
  if (!pageData.value) return
  if (n < 0 || n >= pageData.value.totalPages) return
  page.value = n
  fetchLogs()
}

onMounted(() => {
  fetchLogs()
})
</script>

<template>
  <div class="layout">
    <AsisSidebar />

    <main class="content">
      <header class="page-head">
        <div>
          <h1 class="page-title">Audit Log</h1>
          <p class="page-subtitle">
            Pantau riwayat aktivitas dan perubahan data penting di seluruh sistem.
          </p>
        </div>
      </header>

      <div class="alert alert-warn">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        <span>
          Audit log hanya menampilkan riwayat aktivitas dan tidak dapat digunakan untuk mengubah data.
        </span>
      </div>

      <section class="filter-card">
        <div class="filter-head">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 4h16" /><path d="M6 12h12" /><path d="M10 20h4" />
          </svg>
          <span>Filter Aktivitas</span>
        </div>

        <div class="filter-grid">
          <div class="field">
            <label class="lbl">Dari Tanggal</label>
            <input v-model="filterFrom" type="date" class="inp" />
          </div>
          <div class="field">
            <label class="lbl">Hingga Tanggal</label>
            <input v-model="filterTo" type="date" class="inp" />
          </div>
          <div class="field">
            <label class="lbl">Jenis Aksi</label>
            <select v-model="filterAction" class="inp">
              <option v-for="opt in actionOptions" :key="String(opt.value)" :value="opt.value">{{ opt.label }}</option>
            </select>
          </div>
          <div class="field">
            <label class="lbl">Fitur / Modul</label>
            <select v-model="filterModule" class="inp">
              <option v-for="opt in moduleOptions" :key="String(opt.value)" :value="opt.value">{{ opt.label }}</option>
            </select>
          </div>
          <div class="field field-wide">
            <label class="lbl">Pengguna</label>
            <div class="search-wrap">
              <svg class="search-ic" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input v-model="filterUser" type="search" class="inp inp-search" placeholder="Cari nama pengguna..." />
            </div>
          </div>
        </div>

        <div class="filter-actions">
          <button type="button" class="secondary-btn" :disabled="loading" @click="resetFilters">Reset Filter</button>
          <button type="button" class="primary-btn" :disabled="loading" @click="applyFilters">
            <span v-if="loading" class="spin" />
            {{ loading ? 'Memuat…' : 'Terapkan Filter' }}
          </button>
        </div>
      </section>

      <div v-if="errorMessage" class="alert alert-err">{{ errorMessage }}</div>

      <section v-else class="table-card">
        <div v-if="isEmpty" class="empty">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d4d4d4" stroke-width="1.5">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="12" y1="18" x2="12" y2="12" />
            <line x1="12" y1="9" x2="12" y2="9" />
          </svg>
          <p class="empty-title">Belum ada data audit</p>
          <p class="empty-sub">Riwayat aktivitas akan muncul setelah ada perubahan data di sistem.</p>
        </div>

        <template v-else-if="pageData && pageData.content.length > 0">
          <div class="table-scroll">
            <table class="tbl">
              <thead>
                <tr>
                  <th>Tanggal / Waktu</th>
                  <th>Jenis Aksi</th>
                  <th>Fitur / Modul</th>
                  <th>Nilai Lama</th>
                  <th>Nilai Baru</th>
                  <th>Dilakukan Oleh</th>
                  <th class="th-action">Aksi</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in pageData.content" :key="row.id">
                  <td class="td-muted">{{ formatDateTime(row.occurredAt) }}</td>
                  <td>
                    <span class="action-pill">
                      <span class="dot" :class="actionDotClass(row.actionType)" />
                      {{ formatActionLabel(row.actionType, row.moduleCode) }}
                    </span>
                  </td>
                  <td>
                    <span class="module-pill">{{ row.moduleLabel || row.moduleCode }}</span>
                  </td>
                  <td class="td-snippet">{{ cellSnippet(row, 'old') }}</td>
                  <td class="td-snippet">{{ cellSnippet(row, 'new') }}</td>
                  <td>
                    <div class="actor-name">{{ row.actorNama || row.actorUsername || '—' }}</div>
                    <div class="actor-role">{{ row.actorRole || '' }}</div>
                  </td>
                  <td>
                    <button type="button" class="btn-detail" @click="openDetail(row)">Lihat Detail</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="pager">
            <span class="pager-info">{{ paginationLabel() }}</span>
            <div class="pager-btns">
              <button
                type="button"
                class="pager-nav"
                :disabled="page <= 0 || loading"
                title="Halaman pertama"
                @click="goPage(0)"
              >
                «
              </button>
              <button
                type="button"
                class="pager-nav"
                :disabled="page <= 0 || loading"
                @click="goPage(page - 1)"
              >
                ‹
              </button>
              <span class="pager-page-label">Halaman {{ page + 1 }} / {{ pageData.totalPages }}</span>
              <button
                type="button"
                class="pager-nav"
                :disabled="page >= pageData.totalPages - 1 || loading"
                @click="goPage(page + 1)"
              >
                ›
              </button>
              <button
                type="button"
                class="pager-nav"
                :disabled="page >= pageData.totalPages - 1 || loading"
                title="Halaman terakhir"
                @click="goPage(pageData.totalPages - 1)"
              >
                »
              </button>
            </div>
          </div>
        </template>

        <div v-else-if="hasFetched && !loading" class="hint">Tidak ada baris pada halaman ini.</div>
      </section>
    </main>

    <Teleport to="body">
      <div v-if="detailOpen && detailRow" class="modal-backdrop" @click.self="closeDetail">
        <div class="modal-panel modal-panel--detail" role="dialog" aria-modal="true">
          <div class="modal-head modal-head--detail">
            <div>
              <h2 class="modal-title">Detail Aktivitas</h2>
              <p class="modal-id">ID: {{ detailShortId }}</p>
            </div>
            <button type="button" class="modal-close" aria-label="Tutup" @click="closeDetail">×</button>
          </div>

          <div class="detail-summary">
            <span class="action-pill action-pill--lg">
              <span class="dot" :class="actionDotClass(detailRow.actionType)" />
              {{ formatActionLabel(detailRow.actionType, detailRow.moduleCode) }}
            </span>
            <span class="module-pill module-pill--lg">{{ detailRow.moduleLabel || detailRow.moduleCode }}</span>
            <span class="detail-summary-meta">{{ formatDateTime(detailRow.occurredAt) }}</span>
            <span class="detail-summary-meta">{{ detailRow.actorNama || detailRow.actorUsername || '—' }}</span>
            <span v-if="detailRow.actorRole" class="role-badge">{{ detailRow.actorRole }}</span>
          </div>

          <div class="modal-body-scroll">
            <section class="detail-section">
              <h3 class="detail-section-title">Informasi aktivitas</h3>
              <div class="detail-info-grid">
                <div>
                  <span class="info-lbl">Tanggal / waktu</span>
                  <p class="info-val">{{ formatDateTime(detailRow.occurredAt) }}</p>
                </div>
                <div>
                  <span class="info-lbl">Jenis aksi</span>
                  <p class="info-val">
                    <span class="action-pill">
                      <span class="dot" :class="actionDotClass(detailRow.actionType)" />
                      {{ formatActionLabel(detailRow.actionType, detailRow.moduleCode) }}
                    </span>
                  </p>
                </div>
                <div>
                  <span class="info-lbl">Fitur / modul</span>
                  <p class="info-val"><span class="module-pill">{{ detailRow.moduleLabel }}</span></p>
                </div>
                <div>
                  <span class="info-lbl">Target data</span>
                  <p class="info-val">{{ detailTargetLabel }}</p>
                </div>
                <div>
                  <span class="info-lbl">Dilakukan oleh</span>
                  <p class="info-val">{{ detailRow.actorNama || detailRow.actorUsername || '—' }}</p>
                </div>
                <div>
                  <span class="info-lbl">Role pengguna</span>
                  <p class="info-val"><span v-if="detailRow.actorRole" class="role-badge">{{ detailRow.actorRole }}</span></p>
                </div>
              </div>
            </section>

            <section class="detail-section">
              <h3 class="detail-section-title">Perubahan data</h3>

              <div v-if="detailIsSingleInfoCard" class="user-deactivate-card">
                <p class="user-deactivate-title">{{ detailSingleCardTitle }}</p>
                <div
                  v-for="d in detailDiffs"
                  :key="d.path"
                  class="user-deactivate-row"
                >
                  <span class="diff-field-lbl">{{ d.label }}</span>
                  <template v-if="hasAuditImage(d)">
                    <div class="audit-photo-pair">
                      <img v-if="d.oldImageUrl" :src="d.oldImageUrl" alt="Foto lama" class="audit-photo-preview" />
                      <img v-if="d.newImageUrl" :src="d.newImageUrl" alt="Foto baru" class="audit-photo-preview" />
                    </div>
                  </template>
                  <span v-else class="diff-field-val diff-field-val--multiline">{{ d.newDisplay || d.oldDisplay }}</span>
                </div>
              </div>

              <template v-else>
              <div v-if="detailDisplayMode !== 'create'" class="diff-legend">
                <span class="legend-item"><span class="legend-swatch legend-swatch--changed" /> Diubah</span>
                <span class="legend-item"><span class="legend-swatch legend-swatch--added" /> Ditambahkan</span>
                <span class="legend-item"><span class="legend-swatch legend-swatch--removed" /> Dihapus</span>
              </div>

              <div v-if="detailDiffs.length === 0" class="diff-empty">
                Tidak ada field yang berubah untuk ditampilkan, atau format data tidak dapat dibandingkan.
              </div>

              <div
                v-else
                class="diff-compare"
                :class="{ 'diff-compare--create-only': detailDisplayMode === 'create' }"
              >
                <div
                  class="diff-card diff-card--old"
                  :class="{ 'diff-card--empty': detailDisplayMode === 'create' }"
                >
                  <div class="diff-card-head">Nilai lama</div>
                  <div v-if="detailDisplayMode === 'create'" class="diff-card-empty-body" />
                  <template v-else>
                  <div
                    v-for="d in detailDiffs"
                    :key="`o-${d.path}`"
                    class="diff-field"
                    :class="diffRowClass(d.kind)"
                  >
                    <span class="diff-field-lbl">{{ d.label }}</span>
                    <div v-if="hasAuditImage(d) && d.oldImageUrl" class="diff-field-val">
                      <img :src="d.oldImageUrl" alt="Foto lama" class="audit-photo-preview" />
                    </div>
                    <div v-else-if="d.path === 'photoChanged'" class="diff-field-val">—</div>
                    <div v-else class="diff-field-val">{{ d.oldDisplay }}</div>
                  </div>
                  </template>
                </div>
                <div v-if="detailDisplayMode !== 'create' && !detailIsSingleInfoCard" class="diff-arrow" aria-hidden="true">→</div>
                <div class="diff-card diff-card--new">
                  <div class="diff-card-head">Nilai baru</div>
                  <div
                    v-for="d in detailDiffs"
                    :key="`n-${d.path}`"
                    class="diff-field"
                    :class="diffRowClass(d.kind)"
                  >
                    <span class="diff-field-lbl">{{ d.label }}</span>
                    <div v-if="hasAuditImage(d) && d.newImageUrl" class="diff-field-val">
                      <img :src="d.newImageUrl" alt="Foto baru" class="audit-photo-preview" />
                    </div>
                    <div v-else class="diff-field-val">{{ d.newDisplay }}</div>
                  </div>
                </div>
              </div>
              </template>
            </section>

            <section class="detail-section detail-system">
              <h3 class="detail-section-title">Catatan sistem</h3>
              <ul class="detail-system-list">
                <li>Aktivitas ini tercatat otomatis oleh sistem ASIS.</li>
                <li>Data audit log tidak dapat diubah atau dihapus oleh pengguna.</li>
                <li>Riwayat ini disimpan untuk keperluan transparansi dan akuntabilitas yayasan.</li>
              </ul>
            </section>
          </div>

          <div class="modal-footer-detail">
            <button type="button" class="primary-btn modal-tutup" @click="closeDetail">Tutup</button>
          </div>
        </div>
      </div>
    </Teleport>
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
  position: relative;
  flex: 1;
  overflow-y: auto;
  padding: 40px 32px;
}

.content > * {
  max-width: 1200px;
  margin-left: auto;
  margin-right: auto;
}

.page-head {
  margin-bottom: 20px;
}

.page-title {
  font-size: 32px;
  font-weight: 600;
  margin: 0 0 4px;
  font-family: 'Poppins', system-ui, sans-serif;
  color: #171717;
}

.page-subtitle {
  margin: 0;
  color: #525252;
  font-size: 14px;
}

.alert {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 16px;
  border-radius: 10px;
  font-size: 13px;
  margin-bottom: 20px;
}

.alert-warn {
  background: #fffbeb;
  border: 1px solid #fde68a;
  color: #92400e;
}

.alert-err {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #991b1b;
}

.filter-card {
  background: #fff;
  border-radius: 12px;
  padding: 20px 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  margin-bottom: 24px;
}

.filter-head {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: #171717;
  margin-bottom: 16px;
}

.filter-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px 20px;
}

.field-wide {
  grid-column: 1 / -1;
}

.lbl {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: #525252;
  margin-bottom: 6px;
}

.inp {
  width: 100%;
  height: 40px;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  padding: 0 12px;
  font-family: inherit;
  font-size: 14px;
}

.search-wrap {
  position: relative;
}

.search-ic {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
}

.inp-search {
  padding-left: 36px;
}

.filter-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 20px;
}

.primary-btn,
.secondary-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 40px;
  padding: 0 20px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  border: none;
}

.primary-btn {
  background: #00c6ac;
  color: #fff;
}

.primary-btn:hover:not(:disabled) {
  background: #00b39b;
}

.secondary-btn {
  background: #fff;
  border: 1.5px solid #e5e5e5;
  color: #404040;
}

.secondary-btn:hover:not(:disabled) {
  background: #fafafa;
}

.primary-btn:disabled,
.secondary-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.spin {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.table-card {
  background: #fff;
  border-radius: 12px;
  padding: 20px 24px 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

.table-scroll {
  overflow-x: auto;
}

.tbl {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.tbl th {
  text-align: left;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #737373;
  padding: 10px 12px;
  border-bottom: 1px solid #f0f0f0;
  white-space: nowrap;
}

.th-action {
  text-align: right;
}

.tbl td {
  padding: 14px 12px;
  border-bottom: 1px solid #f5f5f5;
  vertical-align: top;
}

.td-muted {
  color: #525252;
  white-space: nowrap;
}

.td-snippet {
  color: #404040;
  max-width: 220px;
  word-break: break-word;
}

.action-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: #171717;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.dot-create {
  background: #22c55e;
}

.dot-update {
  background: #14b8a6;
}

.dot-delete {
  background: #f43f5e;
}

.dot-approve {
  background: #22c55e;
}

.dot-reject {
  background: #ef4444;
}

.dot-review {
  background: #f59e0b;
}

.dot-cancel {
  background: #94a3b8;
}

.dot-default {
  background: #a3a3a3;
}

.module-pill {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 999px;
  background: #f0fdfb;
  color: #0f766e;
  font-size: 12px;
  font-weight: 500;
}

.actor-name {
  font-weight: 600;
  color: #171717;
}

.actor-role {
  font-size: 12px;
  color: #00a88f;
  margin-top: 2px;
}

.btn-detail {
  height: 34px;
  padding: 0 14px;
  border-radius: 8px;
  border: 1.5px solid #00c6ac;
  background: #fff;
  color: #00a88f;
  font-weight: 600;
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  white-space: nowrap;
}

.btn-detail:hover {
  background: #f0fdfb;
}

.pager {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 20px;
  flex-wrap: wrap;
  gap: 12px;
}

.pager-info {
  font-size: 13px;
  color: #525252;
}

.pager-btns {
  display: flex;
  align-items: center;
  gap: 6px;
}

.pager-nav {
  min-width: 36px;
  height: 36px;
  border-radius: 8px;
  border: 1px solid #e5e5e5;
  background: #fff;
  font-family: inherit;
  font-size: 13px;
  cursor: pointer;
  color: #404040;
}

.pager-page-label {
  font-size: 13px;
  font-weight: 600;
  color: #404040;
  padding: 0 8px;
  min-width: 140px;
  text-align: center;
}

.pager-nav:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.empty {
  text-align: center;
  padding: 48px 24px;
}

.empty-title {
  font-weight: 600;
  color: #404040;
  margin: 12px 0 4px;
}

.empty-sub {
  color: #737373;
  font-size: 14px;
  margin: 0;
}

.hint {
  text-align: center;
  color: #737373;
  padding: 24px;
  font-size: 14px;
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 24px;
}

.modal-panel {
  background: #fff;
  border-radius: 12px;
  max-width: 960px;
  width: 100%;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.15);
}

.modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
}

.modal-head h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.modal-close {
  border: none;
  background: transparent;
  font-size: 28px;
  line-height: 1;
  cursor: pointer;
  color: #737373;
}

.action-pill--lg {
  font-size: 14px;
}

.module-pill--lg {
  font-size: 13px;
}

.modal-panel--detail {
  max-width: 920px;
}

.modal-head--detail {
  align-items: flex-start;
}

.modal-title {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #171717;
}

.modal-id {
  margin: 4px 0 0;
  font-size: 13px;
  color: #737373;
}

.detail-summary {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 14px;
  padding: 14px 20px;
  border-bottom: 1px solid #f0f0f0;
  background: #fafafa;
}

.detail-summary-meta {
  font-size: 13px;
  color: #404040;
}

.role-badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 999px;
  background: #e6fffa;
  color: #0f766e;
  font-size: 12px;
  font-weight: 600;
}

.modal-body-scroll {
  overflow-y: auto;
  flex: 1;
  padding: 0 20px 16px;
}

.detail-section {
  margin-top: 20px;
}

.detail-section-title {
  margin: 0 0 12px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #737373;
}

.detail-info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 14px 20px;
}

.info-lbl {
  display: block;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #9ca3af;
  margin-bottom: 4px;
}

.info-val {
  margin: 0;
  font-size: 14px;
  color: #171717;
}

.diff-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 14px;
  font-size: 12px;
  color: #525252;
}

.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.legend-swatch {
  width: 12px;
  height: 12px;
  border-radius: 4px;
  border: 1px solid #e5e5e5;
}

.legend-swatch--changed {
  background: #ccfbf1;
  border-color: #99f6e4;
}

.legend-swatch--added {
  background: #dcfce7;
  border-color: #bbf7d0;
}

.legend-swatch--removed {
  background: #ffe4e6;
  border-color: #fecdd3;
}

.diff-empty {
  padding: 16px;
  background: #fafafa;
  border-radius: 10px;
  font-size: 13px;
  color: #737373;
  text-align: center;
}

.diff-compare {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 12px;
  align-items: start;
}

@media (max-width: 720px) {
  .diff-compare {
    grid-template-columns: 1fr;
  }

  .diff-arrow {
    display: none;
  }
}

.diff-arrow {
  font-size: 22px;
  color: #a3a3a3;
  padding-top: 36px;
  text-align: center;
}

.diff-card {
  border: 1px solid #e5e5e5;
  border-radius: 12px;
  overflow: hidden;
  background: #fff;
}

.diff-card-head {
  padding: 10px 14px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #737373;
  background: #fafafa;
  border-bottom: 1px solid #f0f0f0;
}

.diff-field {
  padding: 10px 14px;
  border-bottom: 1px solid #f5f5f5;
}

.diff-field:last-child {
  border-bottom: none;
}

.diff-field-lbl {
  display: block;
  font-size: 11px;
  font-weight: 700;
  color: #737373;
  margin-bottom: 6px;
}

.diff-field-val {
  font-size: 13px;
  color: #171717;
  line-height: 1.45;
  word-break: break-word;
}


.audit-photo-pair {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 4px;
}

.audit-photo-preview {
  max-width: 140px;
  max-height: 100px;
  object-fit: cover;
  border-radius: 8px;
  border: 1px solid #e5e5e5;
  background: #fafafa;
}

.diff-field-val--multiline {
  white-space: pre-line;
}

.diff-changed .diff-field-val {
  background: #f0fdfa;
  padding: 8px 10px;
  border-radius: 8px;
}

.diff-unchanged .diff-field-val {
  background: #f5f5f5;
  padding: 8px 10px;
  border-radius: 8px;
  color: #525252;
}

.diff-added .diff-field-val {
  background: #ecfdf5;
  padding: 8px 10px;
  border-radius: 8px;
}

.diff-removed .diff-field-val {
  background: #fff1f2;
  padding: 8px 10px;
  border-radius: 8px;
}

.diff-compare--create-only {
  grid-template-columns: 1fr 1fr;
}

.diff-card--empty {
  min-height: 120px;
}

.diff-card-empty-body {
  min-height: 72px;
  margin: 8px 14px 14px;
  border-radius: 8px;
  background: #fafafa;
  border: 1px dashed #e5e5e5;
}

.user-deactivate-card {
  border: 1px solid #fecdd3;
  border-radius: 12px;
  padding: 16px 18px;
  background: #fff1f2;
}

.user-deactivate-title {
  margin: 0 0 14px;
  font-size: 14px;
  font-weight: 700;
  color: #9f1239;
}

.user-deactivate-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 0;
  border-bottom: 1px solid #ffe4e6;
}

.user-deactivate-row:last-child {
  border-bottom: none;
}

.detail-system {
  margin-bottom: 8px;
}

.detail-system-list {
  margin: 0;
  padding: 14px 18px 14px 28px;
  background: #f5f5f5;
  border-radius: 10px;
  font-size: 13px;
  color: #525252;
  line-height: 1.6;
}

.modal-footer-detail {
  display: flex;
  justify-content: flex-end;
  padding: 14px 20px;
  border-top: 1px solid #f0f0f0;
  background: #fff;
}

.modal-tutup {
  min-width: 120px;
}
</style>
