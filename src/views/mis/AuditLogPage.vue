<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'
import AsisSidebar from '@/components/AsisSidebar.vue'
import { getAuthToken } from '@/lib/auth'
import type { AuditLogPage, AuditLogRow } from '@/interfaces/audit-log.interface'
import { AUDIT_ACTION_FILTER_OPTIONS, AUDIT_MODULE_FILTER_OPTIONS } from '@/constants/audit-log-options'
import {
  computeAuditFieldDiffs,
  humanActivityDescription,
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
import { getInventoryAuditDisplayMode, isInventoryItemModule } from '@/lib/audit-inventory'
import { auditLinkLines } from '@/lib/audit-proof-link'

const loading = ref(false)
const errorMessage = ref<string | null>(null)
const pageData = ref<AuditLogPage | null>(null)
const hasFetched = ref(false)

const filterFrom = ref('')
const filterTo = ref('')
const filterAction = ref('')
const filterModule = ref('')

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
  if (a === 'SUBMIT') return 'dot-submit'
  return 'dot-default'
}

function getModuleDisplayMode(moduleCode: string, actionType: string): string {
  if (isUserManagementModule(moduleCode)) return getUserAuditDisplayMode(actionType)
  if (isIncomeTransactionModule(moduleCode)) return getIncomeAuditDisplayMode(actionType)
  if (isExpenseTransactionModule(moduleCode)) return getExpenseAuditDisplayMode(actionType)
  if (isPaymentRequestModule(moduleCode)) return getPaymentRequestAuditDisplayMode(actionType)
  if (isActivityModule(moduleCode)) return getActivityAuditDisplayMode(actionType)
  if (isInventoryItemModule(moduleCode)) return getInventoryAuditDisplayMode(actionType)
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

const detailActivityDesc = computed(() => {
  if (!detailRow.value) return ''
  return humanActivityDescription(
    detailRow.value.actionType,
    detailRow.value.moduleLabel || detailRow.value.moduleCode || '',
    detailTargetLabel.value,
  )
})

function summaryChipActionClass(actionType: string): string {
  const a = (actionType || '').toUpperCase()
  if (a === 'CREATE') return 'summary-chip--create'
  if (a === 'UPDATE') return 'summary-chip--update'
  if (a === 'DELETE') return 'summary-chip--delete'
  if (a === 'APPROVE') return 'summary-chip--approve'
  if (a === 'REJECT') return 'summary-chip--reject'
  if (a === 'REVIEW') return 'summary-chip--review'
  if (a === 'CANCEL') return 'summary-chip--cancel'
  if (a === 'SUBMIT') return 'summary-chip--submit'
  return 'summary-chip--default'
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

      <section class="card filter-card">
        <div class="filter-title">
          <svg class="filter-icon" width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 4h16" /><path d="M6 12h12" /><path d="M10 20h4" />
          </svg>
          <span>Filter Aktivitas</span>
        </div>

        <div class="filter-grid">
          <div class="field">
            <label>Dari Tanggal</label>
            <input v-model="filterFrom" type="date" />
          </div>
          <div class="field">
            <label>Hingga Tanggal</label>
            <input v-model="filterTo" type="date" />
          </div>
          <div class="field">
            <label>Jenis Aksi</label>
            <select v-model="filterAction">
              <option v-for="opt in actionOptions" :key="String(opt.value)" :value="opt.value">{{ opt.label }}</option>
            </select>
          </div>
          <div class="field">
            <label>Fitur / Modul</label>
            <select v-model="filterModule">
              <option v-for="opt in moduleOptions" :key="String(opt.value)" :value="opt.value">{{ opt.label }}</option>
            </select>
          </div>
        </div>

        <div class="filter-bottom filter-bottom--end">
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
        <div class="modal-panel modal-panel--detail" role="dialog" aria-modal="true" aria-labelledby="audit-detail-title">
          <header class="modal-head modal-head--detail">
            <div>
              <h2 id="audit-detail-title" class="modal-title">Detail Aktivitas</h2>
              <p class="modal-id">ID: {{ detailShortId }}</p>
            </div>
            <button type="button" class="modal-close" aria-label="Tutup" @click="closeDetail">×</button>
          </header>

          <div class="detail-summary">
            <span class="summary-chip" :class="summaryChipActionClass(detailRow.actionType)">
              <span class="dot" :class="actionDotClass(detailRow.actionType)" />
              {{ formatActionLabel(detailRow.actionType, detailRow.moduleCode) }}
            </span>
            <span class="summary-chip summary-chip--module">{{ detailRow.moduleLabel || detailRow.moduleCode }}</span>
            <span class="summary-chip summary-chip--meta">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
              </svg>
              {{ formatDateTime(detailRow.occurredAt) }}
            </span>
            <span class="summary-chip summary-chip--meta">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
              </svg>
              {{ detailRow.actorNama || detailRow.actorUsername || '—' }}
            </span>
            <span v-if="detailRow.actorRole" class="summary-chip summary-chip--role">{{ detailRow.actorRole }}</span>
          </div>

          <div class="modal-body-scroll">
            <section class="detail-section">
              <h3 class="detail-section-title">Informasi Aktivitas</h3>
              <div class="detail-info-panel">
                <div class="detail-info-grid">
                  <div class="info-cell">
                    <span class="info-lbl">Tanggal / Waktu</span>
                    <p class="info-val">{{ formatDateTime(detailRow.occurredAt) }}</p>
                  </div>
                  <div class="info-cell">
                    <span class="info-lbl">Jenis Aksi</span>
                    <p class="info-val">
                      <span class="inline-action-pill">
                        <span class="dot" :class="actionDotClass(detailRow.actionType)" />
                        {{ formatActionLabel(detailRow.actionType, detailRow.moduleCode) }}
                      </span>
                    </p>
                  </div>
                  <div class="info-cell">
                    <span class="info-lbl">Fitur / Modul</span>
                    <p class="info-val">
                      <span class="inline-module-pill">{{ detailRow.moduleLabel || detailRow.moduleCode }}</span>
                    </p>
                  </div>
                  <div class="info-cell">
                    <span class="info-lbl">Target Data</span>
                    <p class="info-val info-val--strong">{{ detailTargetLabel }}</p>
                  </div>
                  <div class="info-cell">
                    <span class="info-lbl">Dilakukan Oleh</span>
                    <p class="info-val">{{ detailRow.actorNama || detailRow.actorUsername || '—' }}</p>
                  </div>
                  <div class="info-cell">
                    <span class="info-lbl">Role Pengguna</span>
                    <p class="info-val">
                      <span v-if="detailRow.actorRole" class="inline-role-badge">{{ detailRow.actorRole }}</span>
                      <span v-else>—</span>
                    </p>
                  </div>
                </div>
                <p v-if="detailActivityDesc" class="detail-desc-box">{{ detailActivityDesc }}</p>
              </div>
            </section>

            <section class="detail-section">
              <h3 class="detail-section-title">Perubahan Data</h3>

              <div
                v-if="detailIsSingleInfoCard"
                class="detail-event-card"
                :class="{ 'detail-event-card--delete': detailIsDeleteCard }"
              >
                <p class="detail-event-card__title">{{ detailSingleCardTitle }}</p>
                <div
                  v-for="d in detailDiffs"
                  :key="d.path"
                  class="detail-event-card__row"
                >
                  <span class="diff-field-lbl">{{ d.label }}</span>
                  <div class="detail-event-card__value">
                    <div
                      v-if="auditLinkLines(d.newDisplay || d.oldDisplay).length"
                      class="audit-proof-links"
                    >
                      <a
                        v-for="(url, linkIdx) in auditLinkLines(d.newDisplay || d.oldDisplay)"
                        :key="`ev-link-${linkIdx}`"
                        :href="url"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="audit-proof-link"
                        @click.stop
                      >{{ url }}</a>
                    </div>
                    <span v-else class="diff-field-val diff-field-val--multiline">{{ d.newDisplay || d.oldDisplay }}</span>
                  </div>
                </div>
              </div>

              <template v-else>
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
                    <div class="diff-card-head">Nilai Lama</div>
                    <div v-if="detailDisplayMode === 'create'" class="diff-card-empty-body">
                      <span class="diff-card-empty-hint">Tidak ada nilai sebelumnya</span>
                    </div>
                    <template v-else>
                      <div
                        v-for="d in detailDiffs"
                        :key="`o-${d.path}`"
                        class="diff-field"
                        :class="diffRowClass(d.kind)"
                      >
                        <span class="diff-field-lbl">{{ d.label }}</span>
                        <div
                          v-if="auditLinkLines(d.oldDisplay).length"
                          class="audit-proof-links diff-field-val"
                        >
                          <a
                            v-for="(url, linkIdx) in auditLinkLines(d.oldDisplay)"
                            :key="`old-link-${linkIdx}`"
                            :href="url"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="audit-proof-link"
                            @click.stop
                          >{{ url }}</a>
                        </div>
                        <div v-else class="diff-field-val diff-field-val--old">{{ d.oldDisplay || '—' }}</div>
                      </div>
                    </template>
                  </div>

                  <div v-if="detailDisplayMode !== 'create'" class="diff-arrow" aria-hidden="true">
                    <span class="diff-arrow-icon">→</span>
                  </div>

                  <div class="diff-card diff-card--new">
                    <div class="diff-card-head diff-card-head--new">Nilai Baru</div>
                    <div
                      v-for="d in detailDiffs"
                      :key="`n-${d.path}`"
                      class="diff-field"
                      :class="diffRowClass(d.kind)"
                    >
                      <span class="diff-field-lbl">{{ d.label }}</span>
                      <div
                        v-if="auditLinkLines(d.newDisplay).length"
                        class="audit-proof-links diff-field-val"
                      >
                        <a
                          v-for="(url, linkIdx) in auditLinkLines(d.newDisplay)"
                          :key="`new-link-${linkIdx}`"
                          :href="url"
                          target="_blank"
                          rel="noopener noreferrer"
                          class="audit-proof-link"
                          @click.stop
                        >{{ url }}</a>
                      </div>
                      <div v-else class="diff-field-val diff-field-val--new">{{ d.newDisplay || '—' }}</div>
                    </div>
                  </div>
                </div>
              </template>
            </section>

            <section class="detail-section detail-system">
              <h3 class="detail-section-title">Catatan Sistem</h3>
              <ul class="detail-system-list">
                <li>Aktivitas ini tercatat otomatis oleh sistem ASIS.</li>
                <li>Data audit log tidak dapat diubah atau dihapus oleh pengguna.</li>
                <li>Riwayat ini disimpan untuk keperluan transparansi dan akuntabilitas yayasan.</li>
              </ul>
            </section>
          </div>

          <footer class="modal-footer-detail">
            <button type="button" class="secondary-btn modal-tutup" @click="closeDetail">Tutup</button>
          </footer>
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

/* Filter card — selaras dengan halaman Pengajuan Dana */
.filter-card.card {
  background-color: #ffffff;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
  border: 1px solid #e5e5e5;
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 24px;
}

.filter-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  font-size: 14px;
  color: #525252;
}

.filter-icon {
  color: #525252;
  flex-shrink: 0;
}

.filter-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px 16px;
}

@media (max-width: 960px) {
  .filter-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 520px) {
  .filter-grid {
    grid-template-columns: 1fr;
  }
}

.filter-card .field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.filter-card .field label {
  font-size: 12px;
  font-weight: 600;
  color: #525252;
}

.filter-card .field input[type='date'],
.filter-card .field select {
  width: 100%;
  height: 40px;
  border-radius: 8px;
  border: 1px solid #d4d4d4;
  padding: 8px 12px;
  font-size: 14px;
  color: #171717;
  background-color: #fff;
  box-sizing: border-box;
  transition: border-color 0.15s, box-shadow 0.15s;
  outline: none;
}

.filter-card .field input[type='date']:focus,
.filter-card .field select:focus {
  border-color: #00c6ac;
  box-shadow: 0 0 0 1px #00c6ac;
}

.filter-bottom {
  display: flex;
  gap: 12px;
  align-items: center;
}

.filter-bottom--end {
  justify-content: flex-end;
  flex-wrap: wrap;
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

.dot-submit {
  background: #3b82f6;
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
  max-width: 880px;
  border-radius: 16px;
  font-family: 'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.modal-head--detail {
  align-items: flex-start;
  padding: 20px 24px;
  border-bottom: 1px solid #f0f0f0;
}

.modal-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #171717;
}

.modal-id {
  margin: 4px 0 0;
  font-size: 13px;
  color: #a3a3a3;
}

.detail-summary {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 10px;
  padding: 14px 24px;
  border-bottom: 1px solid #f0f0f0;
  background: #fafafa;
}

.summary-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 600;
  border: 1px solid #e5e5e5;
  background: #fff;
  color: #404040;
}

.summary-chip--create {
  background: #ecfdf5;
  border-color: #bbf7d0;
  color: #15803d;
}

.summary-chip--update {
  background: #f0fdfa;
  border-color: #99f6e4;
  color: #0f766e;
}

.summary-chip--delete {
  background: #fff1f2;
  border-color: #fecdd3;
  color: #be123c;
}

.summary-chip--review {
  background: #fff7ed;
  border-color: #fed7aa;
  color: #c2410c;
}

.summary-chip--approve {
  background: #ecfdf5;
  border-color: #bbf7d0;
  color: #15803d;
}

.summary-chip--reject {
  background: #fef2f2;
  border-color: #fecaca;
  color: #b91c1c;
}

.summary-chip--cancel {
  background: #f8fafc;
  border-color: #cbd5e1;
  color: #475569;
}

.summary-chip--submit {
  background: #eff6ff;
  border-color: #bfdbfe;
  color: #1d4ed8;
}

.summary-chip--module {
  background: #f5f5f5;
  border-color: #e5e5e5;
  color: #525252;
  font-weight: 500;
}

.summary-chip--meta {
  background: transparent;
  border-color: transparent;
  color: #525252;
  font-weight: 500;
  padding-left: 4px;
  padding-right: 4px;
}

.summary-chip--meta svg {
  color: #a3a3a3;
  flex-shrink: 0;
}

.summary-chip--role {
  background: #00c6ac;
  border-color: #00c6ac;
  color: #fff;
  font-weight: 600;
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
  padding: 8px 24px 20px;
}

.detail-section {
  margin-top: 24px;
}

.detail-section-title {
  margin: 0 0 14px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #a3a3a3;
}

.detail-info-panel {
  background: #fafafa;
  border: 1px solid #f0f0f0;
  border-radius: 12px;
  padding: 18px 20px;
}

.detail-info-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px 24px;
}

@media (max-width: 720px) {
  .detail-info-grid {
    grid-template-columns: 1fr;
  }
}

.info-cell {
  min-width: 0;
}

.info-lbl {
  display: block;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #a3a3a3;
  margin-bottom: 6px;
}

.info-val {
  margin: 0;
  font-size: 14px;
  color: #171717;
  line-height: 1.4;
}

.info-val--strong {
  font-weight: 600;
}

.inline-action-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
}

.inline-module-pill {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 6px;
  background: #f5f5f5;
  color: #525252;
  font-size: 13px;
  font-weight: 500;
}

.inline-role-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 999px;
  background: #00c6ac;
  color: #fff;
  font-size: 12px;
  font-weight: 600;
}

.detail-desc-box {
  margin: 16px 0 0;
  padding: 14px 16px;
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 10px;
  font-size: 14px;
  color: #525252;
  line-height: 1.55;
  font-style: italic;
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
  gap: 14px;
  align-items: stretch;
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
  display: flex;
  align-items: center;
  justify-content: center;
  padding-top: 40px;
}

.diff-arrow-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #f5f5f5;
  border: 1px solid #e5e5e5;
  font-size: 16px;
  color: #737373;
}

.diff-card {
  border-radius: 12px;
  overflow: hidden;
  min-height: 120px;
}

.diff-card--old {
  background: #fffbeb;
  border: 1px solid #fde68a;
}

.diff-card--new {
  background: #f0fdfa;
  border: 1px solid #99f6e4;
}

.diff-card-head {
  padding: 10px 16px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #92400e;
  background: rgba(253, 230, 138, 0.35);
  border-bottom: 1px solid #fde68a;
}

.diff-card-head--new {
  color: #0f766e;
  background: rgba(153, 246, 228, 0.35);
  border-bottom-color: #99f6e4;
}

.diff-field {
  padding: 12px 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.04);
}

.diff-field:last-child {
  border-bottom: none;
}

.diff-field-lbl {
  display: block;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #a3a3a3;
  margin-bottom: 6px;
}

.diff-field-val {
  font-size: 14px;
  line-height: 1.5;
  word-break: break-word;
}

.diff-field-val--old {
  color: #92400e;
  font-weight: 500;
}

.diff-field-val--new {
  color: #0f766e;
  font-weight: 500;
}

.diff-added .diff-field-val--new {
  color: #15803d;
}

.diff-removed .diff-field-val--old {
  color: #be123c;
}

.diff-unchanged .diff-field-val--old,
.diff-unchanged .diff-field-val--new {
  color: #525252;
  font-weight: 400;
}

.audit-proof-link {
  display: block;
  font-size: 12px;
  color: #2563eb;
  text-decoration: underline;
  word-break: break-all;
  cursor: pointer;
  position: relative;
  z-index: 1;
}

.audit-proof-link:hover {
  color: #1d4ed8;
}

.audit-proof-links {
  display: flex;
  flex-direction: column;
  gap: 6px;
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

.diff-compare--create-only {
  grid-template-columns: 1fr;
}

.diff-compare--create-only .diff-card--old {
  display: none;
}

.diff-compare--create-only .diff-arrow {
  display: none;
}

.diff-card--empty .diff-card-empty-body {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100px;
  margin: 12px 16px 16px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.5);
  border: 1px dashed #fde68a;
}

.diff-card-empty-hint {
  font-size: 13px;
  color: #a8a29e;
  font-style: italic;
}

.detail-event-card {
  border: 1px solid #e5e5e5;
  border-radius: 12px;
  padding: 18px 20px;
  background: #fafafa;
}

.detail-event-card--delete {
  background: #fff1f2;
  border-color: #fecdd3;
}

.detail-event-card--delete .detail-event-card__title {
  color: #9f1239;
}

.detail-event-card--delete .detail-event-card__row {
  border-bottom-color: #ffe4e6;
}

.detail-event-card--delete .diff-field-lbl {
  color: #be123c;
}

.detail-event-card--delete .detail-event-card__value,
.detail-event-card--delete .diff-field-val {
  color: #881337;
}

.detail-event-card__title {
  margin: 0 0 16px;
  font-size: 15px;
  font-weight: 600;
  color: #171717;
}

.detail-event-card__row {
  display: grid;
  grid-template-columns: minmax(120px, 38%) 1fr;
  gap: 8px 16px;
  padding: 10px 0;
  border-bottom: 1px solid #f0f0f0;
  align-items: start;
}

.detail-event-card__row:last-child {
  border-bottom: none;
}

.detail-event-card__value {
  font-size: 14px;
  color: #404040;
  line-height: 1.5;
}

.detail-system {
  margin-bottom: 8px;
}

.detail-system-list {
  margin: 0;
  padding: 16px 20px 16px 32px;
  background: #f5f5f5;
  border-radius: 12px;
  border: 1px solid #f0f0f0;
  font-size: 13px;
  color: #525252;
  line-height: 1.65;
}

.detail-system-list li {
  margin-bottom: 4px;
}

.detail-system-list li:last-child {
  margin-bottom: 0;
}

.modal-footer-detail {
  display: flex;
  justify-content: flex-end;
  padding: 16px 24px;
  border-top: 1px solid #f0f0f0;
  background: #fff;
}

.modal-tutup {
  min-width: 100px;
}
</style>
