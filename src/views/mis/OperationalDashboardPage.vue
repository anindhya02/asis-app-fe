<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import AsisSidebar from '@/components/AsisSidebar.vue'
import UnauthorizedAccess from '@/components/UnauthorizedAccess.vue'
import { getAuthToken } from '@/lib/auth'
import { canViewOperationalDashboard } from '@/lib/rbac'
import type { OperationalDashboardData } from '@/interfaces/operational-dashboard.interface'

const router = useRouter()

const now = new Date()
const month = ref(now.getMonth() + 1)
const year = ref(now.getFullYear())
const pendingMonth = ref(month.value)
const pendingYear = ref(year.value)

const loading = ref(false)
const applying = ref(false)
const refreshing = ref(false)
const errorMessage = ref<string | null>(null)
const data = ref<OperationalDashboardData | null>(null)
const lastUpdated = ref<Date | null>(null)
const hasFetched = ref(false)
const autoRefresh = ref(false)

let autoRefreshTimer: ReturnType<typeof setInterval> | null = null

const isAuthorized = computed(() => canViewOperationalDashboard())

const months = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

const years = computed(() => {
  const y = new Date().getFullYear()
  return Array.from({ length: 8 }, (_, i) => y - 3 + i)
})

function parseAmount(v: number | string | null | undefined): number {
  if (v == null || v === '') return 0
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function formatRp(n: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
}

function formatCurrency(amount: number): string {
  if (amount === 0) return 'Rp 0'
  return formatRp(amount)
}

function formatTime(d: Date | null): string {
  if (!d) return '-'
  return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB'
}

function formatDateInput(date: Date): string {
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function getPeriodRange() {
  const start = new Date(year.value, month.value - 1, 1)
  const end = new Date(year.value, month.value, 0)
  return {
    startDate: formatDateInput(start),
    endDate: formatDateInput(end),
  }
}

const totalFundIn = computed(() => parseAmount(data.value?.totalFundIn))
const totalFundOut = computed(() => parseAmount(data.value?.totalFundOut))
const runningBalance = computed(() => parseAmount(data.value?.runningBalance))
const derivedBalance = computed(() => totalFundIn.value - totalFundOut.value)

const balanceMismatch = computed(() => {
  if (!data.value) return false
  return Math.abs(derivedBalance.value - runningBalance.value) > 1
})

const ticketSummary = computed(() => data.value?.ticketSummary)
const totalTickets = computed(() => {
  if (!ticketSummary.value) return 0
  return ticketSummary.value.pending
    + ticketSummary.value.approved
    + ticketSummary.value.reject
    + ticketSummary.value.revisionRequested
})

const isEmpty = computed(() => {
  if (!data.value) return false
  return totalFundIn.value === 0 && totalFundOut.value === 0 && totalTickets.value === 0
})

const balanceTone = computed(() => {
  if (!data.value) return 'neutral'
  if (runningBalance.value > 0) return 'surplus'
  if (runningBalance.value < 0) return 'deficit'
  return 'neutral'
})

const chartStep = 500000
const chartHeight = 320

const chartMaxValue = computed(() => {
  const maxValue = Math.max(totalFundIn.value, totalFundOut.value, 0)
  if (maxValue <= 0) return chartStep
  return Math.ceil(maxValue / chartStep) * chartStep
})

const chartTicks = computed(() => {
  return [1, 0.75, 0.5, 0.25].map((ratio) => ({
    ratio,
    value: chartMaxValue.value * ratio,
    offset: (1 - ratio) * chartHeight,
  }))
})

function getBarHeight(value: number): number {
  const maxValue = chartMaxValue.value
  if (maxValue <= 0) return 0
  const safeValue = Math.max(0, Math.min(value, maxValue))
  return (safeValue / maxValue) * chartHeight
}

async function fetchDashboard(options?: { silent?: boolean }) {
  errorMessage.value = null
  hasFetched.value = true
  if (!options?.silent) loading.value = true
  const token = getAuthToken()
  if (!token) {
    loading.value = false
    data.value = null
    errorMessage.value = 'Sesi login tidak ditemukan. Silakan login ulang.'
    return
  }

  const params: Record<string, string | number> = {
    period: 'monthly',
    year: year.value,
    month: month.value,
  }

  try {
    const res = await axios.get<{ status: string; message: string; data: OperationalDashboardData }>(
      `${import.meta.env.VITE_API_URL}/mis/operational-dashboard`,
      { params, headers: { Authorization: `Bearer ${token}` } },
    )
    if (res.data.status !== 'success' || !res.data.data) {
      data.value = null
      errorMessage.value = res.data.message || 'Gagal memuat dashboard operasional.'
      return
    }
    data.value = res.data.data
    lastUpdated.value = new Date()
    if (balanceMismatch.value) {
      console.warn('Running balance mismatch', {
        api: runningBalance.value,
        derived: derivedBalance.value,
      })
    }
  } catch (e: unknown) {
    data.value = null
    if (axios.isAxiosError(e) && e.response?.status === 401) {
      errorMessage.value = String(e.response?.data?.message || 'Sesi tidak valid. Silakan login ulang.')
      return
    }
    if (axios.isAxiosError(e) && e.response?.data?.message) {
      errorMessage.value = String(e.response.data.message)
    } else if (axios.isAxiosError(e) && e.response?.status === 400) {
      errorMessage.value = 'Permintaan tidak valid. Periksa periode dan parameter.'
    } else {
      errorMessage.value = 'Terjadi kesalahan saat memuat dashboard operasional.'
    }
  } finally {
    loading.value = false
  }
}

async function handleApply() {
  if (pendingMonth.value === month.value && pendingYear.value === year.value) return
  applying.value = true
  month.value = pendingMonth.value
  year.value = pendingYear.value
  await fetchDashboard()
  applying.value = false
}

async function handleRefresh() {
  if (refreshing.value || loading.value) return
  refreshing.value = true
  await fetchDashboard({ silent: true })
  refreshing.value = false
}

async function handleRetry() {
  await fetchDashboard()
}

function goToTickets(status?: string) {
  const { startDate, endDate } = getPeriodRange()
  const query: Record<string, string> = { startDate, endDate }
  if (status) query.status = status
  router.push({ path: '/pengajuandana', query })
}

watch(autoRefresh, (enabled) => {
  if (autoRefreshTimer) {
    clearInterval(autoRefreshTimer)
    autoRefreshTimer = null
  }
  if (!enabled) return
  autoRefreshTimer = setInterval(() => {
    if (loading.value || refreshing.value) return
    handleRefresh()
  }, 30000)
})

onMounted(() => {
  if (isAuthorized.value) {
    fetchDashboard()
  }
})

onBeforeUnmount(() => {
  if (autoRefreshTimer) clearInterval(autoRefreshTimer)
})
</script>

<template>
  <div class="layout">
    <AsisSidebar />
    <main class="content">
      <UnauthorizedAccess v-if="!isAuthorized" mode="content" />

      <div class="page">
        <header class="page-header">
          <div>
            <h1 class="page-title">Dashboard Operasional</h1>
            <p class="page-subtitle">Pantau kondisi keuangan dan status pengajuan dana pada periode berjalan.</p>
          </div>
          <div class="header-actions">
            <div class="filter-row">
              <div class="field">
                <label>Bulan</label>
                <select v-model.number="pendingMonth" :disabled="loading" class="input">
                  <option v-for="(m, idx) in months" :key="m" :value="idx + 1">{{ m }}</option>
                </select>
              </div>
              <div class="field">
                <label>Tahun</label>
                <select v-model.number="pendingYear" :disabled="loading" class="input">
                  <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
                </select>
              </div>
              <button type="button" class="btn-primary" :disabled="loading" @click="handleApply">
                <span v-if="applying" class="spin" />
                {{ applying ? 'Menerapkan...' : 'Terapkan' }}
              </button>
              <button type="button" class="btn-icon" :disabled="loading" @click="handleRefresh" aria-label="Refresh">
                <span v-if="refreshing" class="spin" />
                <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="23 4 23 10 17 10" />
                  <polyline points="1 20 1 14 7 14" />
                  <path d="M3.51 9a9 9 0 0 1 14.13-3.36L23 10" />
                  <path d="M20.49 15a9 9 0 0 1-14.13 3.36L1 14" />
                </svg>
              </button>
            </div>
          </div>
        </header>

        <div class="period-info">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <span>Menampilkan data periode {{ months[month - 1] }} {{ year }}</span>
        </div>

        <div v-if="errorMessage" class="error-card">
          <div class="error-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <div>
            <h3>Gagal memuat dashboard operasional</h3>
            <p>{{ errorMessage }}</p>
          </div>
          <button type="button" class="btn-outline" @click="handleRetry">Coba Lagi</button>
        </div>

        <div v-else>
          <div v-if="isEmpty && !loading" class="empty-card">
            <div class="empty-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <line x1="3" y1="9" x2="21" y2="9" />
                <line x1="9" y1="21" x2="9" y2="9" />
              </svg>
            </div>
            <div>
              <h3>Belum ada data pada periode ini</h3>
              <p>Ubah periode atau tunggu transaksi dan ticket baru.</p>
            </div>
          </div>

          <div v-else class="main-grid">
            <div class="main-left">
              <div v-if="loading" class="kpi-grid">
                <div v-for="n in 3" :key="n" class="kpi-card skeleton">
                  <div class="skeleton-line sm" />
                  <div class="skeleton-line lg" />
                  <div class="skeleton-line md" />
                </div>
              </div>

              <div v-else class="kpi-grid">
                <div class="kpi-card">
                  <div class="kpi-top">
                    <div>
                      <span class="kpi-label">Dana Masuk</span>
                      <div class="kpi-value kpi-in-value">{{ formatCurrency(totalFundIn) }}</div>
                    </div>
                    <div class="kpi-icon kpi-in">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="8 12 12 8 16 12" />
                        <line x1="12" y1="16" x2="12" y2="8" />
                      </svg>
                    </div>
                  </div>
                  <div class="kpi-caption">Total dana masuk bulan ini</div>
                </div>

                <div class="kpi-card">
                  <div class="kpi-top">
                    <div>
                      <span class="kpi-label">Dana Terserap</span>
                      <div class="kpi-value kpi-out-value">{{ formatCurrency(totalFundOut) }}</div>
                    </div>
                    <div class="kpi-icon kpi-out">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="8 12 12 16 16 12" />
                        <line x1="12" y1="8" x2="12" y2="16" />
                      </svg>
                    </div>
                  </div>
                  <div class="kpi-caption">Total pengeluaran bulan ini</div>
                </div>

                <div class="kpi-card">
                  <div class="kpi-top">
                    <div>
                      <span class="kpi-label">Saldo Berjalan</span>
                      <div class="kpi-value" :class="balanceTone === 'deficit' ? 'kpi-out-value' : 'kpi-in-value'">
                        {{ formatCurrency(runningBalance) }}
                      </div>
                    </div>
                    <div class="kpi-icon" :class="balanceTone === 'deficit' ? 'kpi-out' : 'kpi-in'">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M7 17L17 7" />
                        <path d="M13 7h4v4" />
                      </svg>
                    </div>
                  </div>
                  <div class="kpi-caption">Saldo awal + dana masuk - dana terserap</div>
                  <span class="kpi-chip" :class="balanceTone">
                    {{ balanceTone === 'deficit' ? 'Defisit' : balanceTone === 'surplus' ? 'Surplus' : 'Netral' }}
                  </span>
                  <p v-if="balanceMismatch" class="kpi-warning">Perhitungan saldo belum sinkron.</p>
                </div>
              </div>

              <section class="card">
                <div class="card-header">
                  <div>
                    <h2 class="section-title">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M23 6l-9.5 9.5-5-5L1 18" />
                        <polyline points="17 6 23 6 23 12" />
                      </svg>
                      Ringkasan Arus Kas
                    </h2>
                    <p>Bandingkan dana masuk dan dana terserap.</p>
                  </div>
                </div>

                <div class="cashflow">
                  <div class="cash-main">
                    <div class="bar-chart" :style="{ '--chart-height': `${chartHeight}px` }">
                      <div class="bar-area">
                        <div class="bar-grid">
                          <div
                            v-for="tick in chartTicks"
                            :key="tick.ratio"
                            class="bar-grid-line"
                            :style="{ top: `${tick.offset}px` }"
                          >
                            <span class="bar-grid-label">{{ formatCurrency(tick.value) }}</span>
                            <span class="bar-grid-rule" />
                          </div>
                        </div>
                        <div class="bar-plot">
                          <div class="bar-item">
                            <div
                              class="bar bar-in"
                              :data-value="formatCurrency(totalFundIn)"
                              :style="{ height: `${getBarHeight(totalFundIn)}px` }"
                            />
                          </div>
                          <div class="bar-item">
                            <div
                              class="bar bar-out"
                              :data-value="formatCurrency(totalFundOut)"
                              :style="{ height: `${getBarHeight(totalFundOut)}px` }"
                            />
                          </div>
                        </div>
                      </div>
                      <div class="bar-labels">
                        <span>Dana Masuk</span>
                        <span>Dana Terserap</span>
                      </div>
                    </div>

                    <div class="cash-legend">
                      <div>
                        <span class="dot dot-pending" /> Dana Masuk
                        <strong>{{ formatCurrency(totalFundIn) }}</strong>
                      </div>
                      <div>
                        <span class="dot dot-reject" /> Dana Terserap
                        <strong>{{ formatCurrency(totalFundOut) }}</strong>
                      </div>
                      <div>
                        <span class="dot dot-approved" /> Saldo Berjalan
                        <strong :class="balanceTone === 'deficit' ? 'kpi-out-value' : 'kpi-in-value'">
                          {{ formatCurrency(runningBalance) }}
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div class="progress-head">
                    <span class="progress-label">Tingkat penyerapan dana</span>
                    <span class="progress-text">{{ totalFundIn === 0 ? '0' : Math.min(100, Math.round((totalFundOut / totalFundIn) * 100)) }}%</span>
                  </div>
                  <div class="progress-wrap">
                    <div class="progress-bar">
                      <div class="progress-fill" :style="{ width: totalFundIn === 0 ? '0%' : Math.min(100, (totalFundOut / totalFundIn) * 100) + '%' }" />
                    </div>
                  </div>
                </div>
              </section>
            </div>

            <section class="card status-column">
              <div class="card-header">
                <div>
                  <h2>Ringkasan Status Ticket</h2>
                </div>
              </div>

              <div class="ticket-total">
                <span class="ticket-total-label">Total Ticket</span>
                <span class="ticket-total-value">{{ totalTickets }}</span>
                <span class="ticket-total-help">Jumlah pengajuan pada periode ini</span>
              </div>

              <div class="status-grid">
                
                <div class="status-card status-approved">
                  <div class="status-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="9 12 12 15 16 9" />
                    </svg>
                  </div>
                  <span class="status-count">{{ ticketSummary?.approved ?? 0 }}</span>
                  <span class="status-label">Approved</span>
                  <span class="status-helper">Telah disetujui</span>
                  <button type="button" class="status-link" @click="goToTickets('APPROVED')">Lihat</button>
                </div>
                <div class="status-card status-reject">
                  <div class="status-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="15" y1="9" x2="9" y2="15" />
                      <line x1="9" y1="9" x2="15" y2="15" />
                    </svg>
                  </div>
                  <span class="status-count">{{ ticketSummary?.reject ?? 0 }}</span>
                  <span class="status-label">Rejected</span>
                  <span class="status-helper">Ditolak</span>
                  <button type="button" class="status-link" @click="goToTickets('REJECTED')">Lihat</button>
                </div>
                <div class="status-card status-pending">
                  <div class="status-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                  </div>
                  <span class="status-count">{{ ticketSummary?.pending ?? 0 }}</span>
                  <span class="status-label">Pending Review</span>
                  <span class="status-helper">Menunggu review</span>
                  <button type="button" class="status-link" @click="goToTickets('PENDING_REVIEW')">Lihat</button>
                </div>
                <div class="status-card status-revision">
                  <div class="status-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="1 4 1 10 7 10" />
                      <path d="M3.51 15a9 9 0 1 0 .49-5" />
                    </svg>
                  </div>
                  <span class="status-count">{{ ticketSummary?.revisionRequested ?? 0 }}</span>
                  <span class="status-label">Revision Requested</span>
                  <span class="status-helper">Perlu diperbaiki</span>
                  <button type="button" class="status-link" @click="goToTickets('REVISION_REQUESTED')">Lihat</button>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.layout {
  display: flex;
  min-height: 100vh;
  background: #f7f7f7;
  font-family: 'Manrope', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
}

.content {
  position: relative;
  flex: 1;
  overflow-y: auto;
  padding: 32px 28px;
}

.page {
  width: 100%;
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #737373;
  margin-bottom: 10px;
}

.breadcrumb-muted {
  color: #a3a3a3;
}

.breadcrumb-current {
  color: #525252;
  font-weight: 600;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 12px;
}

.page-title {
  font-family: 'Poppins', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
  font-weight: 600;
  font-size: 32px;
  color: #171717;
  margin: 0 0 6px;
}

.page-subtitle {
  margin: 0;
  font-size: 13px;
  color: #737373;
}

.header-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.filter-row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 10px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 120px;
}

.field label {
  font-size: 11px;
  color: #737373;
  font-weight: 600;
}

.input {
  height: 36px;
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid #e5e5e5;
  background: #fff;
  font-size: 13px;
  color: #171717;
  outline: none;
}

.input:focus {
  border-color: #00c6ac;
  box-shadow: 0 0 0 1px #00c6ac;
}

.btn-primary {
  height: 36px;
  padding: 0 16px;
  border-radius: 8px;
  border: none;
  background: #00c6ac;
  color: #fff;
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.btn-outline {
  height: 36px;
  padding: 0 14px;
  border-radius: 8px;
  border: 1px solid #00c6ac;
  background: #fff;
  color: #00a88f;
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.btn-icon {
  height: 34px;
  width: 34px;
  border-radius: 8px;
  border: 1px solid #e5e5e5;
  background: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #737373;
  cursor: pointer;
}

.btn-icon:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-outline:disabled,
.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.refresh-row {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12px;
  color: #737373;
}

.toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 12px;
  color: #525252;
}

.toggle input {
  display: none;
}

.toggle-ui {
  width: 36px;
  height: 20px;
  background: #e5e5e5;
  border-radius: 999px;
  position: relative;
  transition: background 0.2s;
}

.toggle-ui::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #fff;
  transition: transform 0.2s;
}

.toggle input:checked + .toggle-ui {
  background: #00c6ac;
}

.toggle input:checked + .toggle-ui::after {
  transform: translateX(16px);
}

.toggle-text {
  font-weight: 600;
}

.last-updated {
  font-size: 11px;
  color: #a3a3a3;
}

.period-info {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #a3a3a3;
  margin: 6px 0 8px;
}

.error-card {
  display: flex;
  align-items: center;
  gap: 16px;
  background: #fff;
  border: 1px solid #fee2e2;
  border-radius: 12px;
  padding: 16px;
  color: #991b1b;
}

.error-card h3 {
  margin: 0 0 4px;
  font-size: 15px;
  color: #b91c1c;
}

.error-card p {
  margin: 0;
  font-size: 12px;
  color: #7f1d1d;
}

.error-icon {
  width: 40px;
  height: 40px;
  border-radius: 999px;
  background: #fee2e2;
  display: flex;
  align-items: center;
  justify-content: center;
}

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.kpi-card {
  background: #fff;
  border: 1px solid #e5e5e5;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.kpi-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.kpi-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #a3a3a3;
  font-weight: 600;
}

.kpi-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #525252;
  font-weight: 600;
}

.kpi-icon {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.kpi-in {
  background: #e6faf8;
  color: #00a88f;
}

.kpi-out {
  background: #fff1f2;
  color: #ef4444;
}

.kpi-ticket {
  background: #f0f9ff;
  color: #0284c7;
}

.kpi-value {
  font-size: 26px;
  font-weight: 600;
  color: #171717;
}

.kpi-in-value {
  color: #00a88f;
}

.kpi-out-value {
  color: #ef4444;
}

.kpi-caption {
  font-size: 11px;
  color: #a3a3a3;
}

.kpi-chip {
  align-self: flex-start;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
}

.kpi-chip.surplus {
  background: #e6faf8;
  color: #00a88f;
}

.kpi-chip.deficit {
  background: #fee2e2;
  color: #ef4444;
}

.kpi-chip.neutral {
  background: #f5f5f5;
  color: #737373;
}

.kpi-warning {
  font-size: 11px;
  color: #b91c1c;
  margin: 0;
}

.ticket-mini {
  display: grid;
  gap: 4px;
  font-size: 11px;
  color: #737373;
}

.dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 999px;
  margin-right: 6px;
}

.dot-pending { background: #fbbf24; }
.dot-approved { background: #22c55e; }
.dot-reject { background: #f87171; }
.dot-review { background: #fb923c; }

.link-btn {
  align-self: flex-start;
  border: none;
  background: transparent;
  color: #00a88f;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
}

.main-grid {
  display: grid;
  grid-template-columns: minmax(0, 3fr) minmax(0, 1fr);
  gap: 16px;
  margin-top: 8px;
  align-items: stretch;
}

.main-left {
  display: grid;
  gap: 16px;
}

.status-column {
  display: flex;
  align-items: flex-center;
  flex-direction: column;
}

.ticket-total {
  display: grid;
  gap: 6px;
  padding: 12px 14px;
  border-radius: 10px;
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  text-align: center;
  margin-bottom: 14px;
}

.ticket-total-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #94a3b8;
  font-weight: 600;
}

.ticket-total-value {
  font-size: 26px;
  font-weight: 700;
  color: #0f172a;
}

.ticket-total-help {
  font-size: 11px;
  color: #94a3b8;
}
.ticket-summary {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 12px;
}

.ticket-summary-body {
  display: grid;
  gap: 10px;
}

.ticket-total {
  font-size: 20px;
  font-weight: 700;
  color: #171717;
}

.card {
  background: #fff;
  border: 1px solid #e5e5e5;
  border-radius: 12px;
  padding: 16px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.card-header h2 {
  font-size: 15px;
  font-weight: 600;
  margin: 0;
  color: #171717;
  font-family: 'Poppins', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
}

.card-header p {
  margin: 4px 0 0;
  font-size: 12px;
  color: #a3a3a3;
}

.status-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
}

.status-card {
  border-radius: 10px;
  padding: 8px;
  border: 1px solid transparent;
  display: flex;
  flex-direction: column;
  gap: 0px;
  align-items: center;
  text-align: center;
}

.status-icon {
  width: 30px;
  height: 30px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.7);
  margin-bottom: 0;
}

.status-count {
  font-size: 24px;
  font-weight: 700;
}

.status-label {
  font-size: 14px;
  font-weight: 600;
}

.status-helper {
  font-size: 12px;
  color: #737373;
}

.status-link {
  margin-top: 4px;
  border: none;
  background: transparent;
  color: #00a88f;
  font-size: 10px;
  font-weight: 600;
  cursor: pointer;
}

.status-pending {
  background: #fefce8;
  border-color: #fcd34d;
  color: #a16207;
}

.status-approved {
  background: #f0fdf4;
  border-color: #86efac;
  color: #15803d;
}

.status-reject {
  background: #fff1f2;
  border-color: #fda4af;
  color: #be123c;
}

.status-revision {
  background: #fff7ed;
  border-color: #fdba74;
  color: #c2410c;
}

.section-title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.cashflow {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.cash-main {
  display: grid;
  grid-template-columns: minmax(0, 3fr) minmax(0, 0.9fr);
  gap: 16px;
  align-items: stretch;
}

.bar-chart {
  display: grid;
  gap: 10px;
  border-bottom: 1px solid #f1f5f9;
  position: relative;
  flex: 1;
  --bar-column-min: 120px;
  --chart-left: 96px;
  --chart-right: 20px;
}

.bar-area {
  position: relative;
  height: var(--chart-height);
  overflow: visible;
}

.bar-grid {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.bar-grid-line {
  position: absolute;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  gap: 10px;
}

.bar-grid-label {
  width: 88px;
  font-size: 11px;
  color: #a3a3a3;
  text-align: left;
}

.bar-grid-rule {
  flex: 1;
  height: 1px;
  background: #f1f5f9;
}

.bar-plot {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(2, minmax(var(--bar-column-min), 1fr));
  align-items: end;
  justify-items: center;
  column-gap: 24px;
  height: 100%;
  width: calc(100% - var(--chart-left) - var(--chart-right));
  margin-left: var(--chart-left);
  margin-right: var(--chart-right);
}

.bar-item {
  display: flex;
  align-items: flex-end;
  justify-content: flex-end;
  height: 100%;
  width: 100%;
  min-width: var(--bar-column-min);
  justify-content: center;
}

.bar {
  width: 40px;
  border-radius: 8px;
  transition: height 0.3s ease;
  position: relative;
  cursor: pointer;
}

.bar::after {
  content: attr(data-value);
  position: absolute;
  left: 50%;
  bottom: 100%;
  transform: translate(-50%, -8px);
  background: #111827;
  color: #ffffff;
  font-size: 11px;
  padding: 4px 8px;
  border-radius: 6px;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.bar::before {
  content: '';
  position: absolute;
  left: 50%;
  bottom: 100%;
  transform: translate(-50%, -2px);
  border: 5px solid transparent;
  border-top-color: #111827;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s ease;
}

.bar:hover::after,
.bar:hover::before {
  opacity: 1;
}

.bar-in {
  background: #00c6ac;
}

.bar-out {
  background: #f87171;
}

.bar-labels {
  display: grid;
  grid-template-columns: repeat(2, minmax(var(--bar-column-min), 1fr));
  align-items: center;
  justify-items: center;
  column-gap: 48px;
  width: calc(100% - var(--chart-left) - var(--chart-right));
  margin-left: var(--chart-left);
  margin-right: var(--chart-right);
  font-size: 11px;
  color: #737373;
}

.bar-labels span {
  text-align: center;
  width: 100%;
}

.cash-legend {
  display: grid;
  gap: 12px;
  font-size: 12px;
  color: #525252;
  height: 100%;
  align-content: flex-end;
}

.cash-legend strong {
  display: block;
  margin-top: 2px;
}

.progress-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  color: #737373;
}

.progress-label {
  color: #a3a3a3;
}

.progress-wrap {
  display: flex;
  align-items: center;
}

.progress-bar {
  position: relative;
  flex: 1;
  height: 20px;
  border-radius: 999px;
  background: #e5e7eb;
  overflow: hidden;
}

.progress-fill {
  position: absolute;
  inset: 0;
  background: #00c6ac;
}

.progress-text {
  font-size: 18 px;
  color: #737373;
  min-width: 36px;
  text-align: right;
}
.follow-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.follow-list {
  display: grid;
  gap: 12px;
}

.follow-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid #f1f5f9;
  background: #fff;
}

.follow-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.follow-item.highlight {
  border-color: #fed7aa;
  background: #fff7ed;
}

.follow-icon {
  width: 36px;
  height: 36px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #ffedd5;
  color: #f97316;
}

.follow-icon.muted {
  background: #f5f5f5;
  color: #737373;
}

.follow-label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: #171717;
}

.follow-sub {
  display: block;
  margin-top: 2px;
  font-size: 11px;
  color: #a3a3a3;
}

.follow-count {
  font-weight: 700;
  font-size: 18px;
  color: #f97316;
}

.follow-btn {
  width: 100%;
  justify-content: center;
}

.empty-card {
  background: #fff;
  border: 1px dashed #e5e5e5;
  border-radius: 12px;
  padding: 24px;
  display: flex;
  align-items: center;
  gap: 16px;
  color: #737373;
}

.empty-card h3 {
  margin: 0 0 4px;
  color: #171717;
  font-size: 14px;
}

.empty-card p {
  margin: 0;
  font-size: 12px;
}

.empty-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #a3a3a3;
}

.skeleton {
  position: relative;
  overflow: hidden;
}

.skeleton::after {
  content: '';
  position: absolute;
  inset: 0;
  transform: translateX(-100%);
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.6), transparent);
  animation: shimmer 1.5s infinite;
}

.skeleton-line {
  height: 10px;
  border-radius: 6px;
  background: #f1f5f9;
  margin-bottom: 10px;
}

.skeleton-line.sm { width: 40%; }
.skeleton-line.md { width: 70%; }
.skeleton-line.lg { width: 90%; height: 18px; }

.spin {
  width: 12px;
  height: 12px;
  border-radius: 999px;
  border: 2px solid rgba(255, 255, 255, 0.5);
  border-top-color: #fff;
  animation: spin 1s linear infinite;
}

.btn-outline .spin {
  border-color: rgba(0, 168, 143, 0.4);
  border-top-color: #00a88f;
}

@keyframes shimmer {
  100% { transform: translateX(100%); }
}

@keyframes spin {
  100% { transform: rotate(360deg); }
}

@media (max-width: 1100px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .header-actions {
    width: 100%;
    align-items: flex-start;
  }

  .kpi-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .main-grid {
    grid-template-columns: 1fr;
  }

  .cash-main {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .content {
    padding: 24px 16px;
  }

  .filter-row {
    width: 100%;
  }

  .kpi-grid {
    grid-template-columns: 1fr;
  }

  .status-grid {
    grid-template-columns: 1fr;
  }
}
</style>
