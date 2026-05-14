<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import axios from 'axios'
import AsisSidebar from '@/components/AsisSidebar.vue'
import UnauthorizedAccess from '@/components/UnauthorizedAccess.vue'
import { getAuthToken } from '@/lib/auth'
import { isKetua } from '@/lib/rbac'
import type { ExecutiveFinancialData } from '@/interfaces/executive-financial.interface'

const period = ref<'monthly' | 'quarterly' | 'yearly'>('monthly')
const startDate = ref('')
const endDate = ref('')
const dateRangeError = ref('')

const loading = ref(false)
const errorMessage = ref<string | null>(null)
const dashboard = ref<ExecutiveFinancialData | null>(null)

/** Preset aktif untuk highlight UI; null jika rentang kustom */
const activeQuick = ref<'ytd' | '3m' | '6m' | '12m' | null>('ytd')

function toIsoLocal(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function todayLocal(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function ytdRange(): { start: string; end: string } {
  const t = todayLocal()
  const start = new Date(t.getFullYear(), 0, 1)
  return { start: toIsoLocal(start), end: toIsoLocal(t) }
}

function monthsOffsetFromToday(monthsBack: number): { start: string; end: string } {
  const end = todayLocal()
  const start = new Date(end)
  start.setMonth(start.getMonth() - monthsBack)
  return { start: toIsoLocal(start), end: toIsoLocal(end) }
}

function isYtdSelection(): boolean {
  const { start, end } = ytdRange()
  return startDate.value === start && endDate.value === end
}

function parseAmount(v: string | number | undefined | null): number {
  if (v == null || v === '') return 0
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function formatRp(n: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Math.round(n))
}

function formatPercentOne(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return '—'
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(n)
}

/** Label sumbu-X pendek dari `period` agar tidak kepotong saat rotasi (fallback ke label backend). */
const MONTH_SHORT_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

function shortChartAxisLabel(periodKey: string | undefined, fullLabel: string): string {
  const pk = (periodKey ?? '').trim()
  const ym = /^(\d{4})-(\d{2})$/.exec(pk)
  if (ym) {
    const mi = parseInt(ym[2], 10) - 1
    if (mi >= 0 && mi < 12) return `${MONTH_SHORT_ID[mi]} ${ym[1]}`
  }
  const yq = /^(\d{4})-Q([1-4])$/i.exec(pk)
  if (yq) return `T${yq[2]} ${yq[1]}`
  if (/^\d{4}$/.test(pk)) return pk
  return fullLabel || pk || '—'
}

const donationTitle = computed(() =>
  isYtdSelection() ? 'Total Donasi Tahun Berjalan' : 'Total Donasi Periode Dipilih',
)

const donationSubtitle = computed(() => {
  if (!dashboard.value?.selectedRange) return ''
  const { startDate: s, endDate: e } = dashboard.value.selectedRange
  return `Rentang ${s} — ${e}`
})

const isEmptyDashboard = computed(() => {
  if (!dashboard.value) return false
  const t = parseAmount(dashboard.value.totalDonationYTD)
  const ratio = dashboard.value.programVsOperationalRatio
  const te = parseAmount(ratio?.totalExpense)
  const trend = dashboard.value.donationTrend ?? []
  const trendSum = trend.reduce((acc, p) => acc + parseAmount(p.totalDonation), 0)
  return t === 0 && te === 0 && trendSum === 0
})

const growthCaption = computed(() => {
  const g = dashboard.value?.donationGrowth
  if (!g) return ''
  if (g.direction === 'STABLE') return 'Stabil dibanding periode sebelumnya'
  if (g.percentage == null && g.direction === 'UP') {
    return 'Ada donasi di periode ini dibanding periode sebelumnya (basis 0)'
  }
  const abs = Math.abs(Number(g.percentage))
  const pct = formatPercentOne(abs)
  if (g.direction === 'UP') return `Naik ${pct}% dibanding periode sebelumnya`
  return `Turun ${pct}% dibanding periode sebelumnya`
})

const lineChartModel = computed(() => {
  const pts = dashboard.value?.donationTrend ?? []
  if (pts.length === 0) return null
  const values = pts.map((p) => parseAmount(p.totalDonation))
  const max = Math.max(...values, 1)
  const n = pts.length
  /** Ruang horizontal minimum antar titik agar label tidak bertumpuk (scroll horizontal jika perlu). */
  const MIN_X_STEP = 92
  const padL = 52
  const padR = 20
  const padT = 14
  /** Area bawah cukup besar agar teks label (termasuk saat dirotasi) tidak ter-clip oleh viewBox SVG. */
  const padB = 118
  const h = 332
  const innerW = n <= 1 ? 360 : Math.max(520, (n - 1) * MIN_X_STEP)
  const w = padL + padR + innerW
  const innerH = h - padT - padB
  const innerBottom = padT + innerH
  const labelBaseY = innerBottom + 56
  const xLabelDegrees = -30
  const coords = values.map((v, i) => {
    const x = padL + (n === 1 ? innerW / 2 : (innerW * i) / (n - 1))
    const y = padT + innerH - (v / max) * innerH
    return { x, y }
  })
  const pathD = coords
    .map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
    .join(' ')
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => ({
    y: padT + innerH - t * innerH,
    label: formatRp(Math.round(max * t)),
  }))
  const axisLabels = pts.map((p) => shortChartAxisLabel(p.period, p.label))
  return {
    w,
    h,
    pathD,
    coords,
    pts,
    axisLabels,
    yTicks,
    padL,
    padT,
    innerW,
    innerH,
    padB,
    labelBaseY,
    xLabelDegrees,
  }
})

const donutStyle = computed(() => {
  const r = dashboard.value?.programVsOperationalRatio
  if (!r) return { background: '#e5e5e5' }
  const p = Math.min(100, Math.max(0, parseAmount(r.programPercentage)))
  return {
    background: `conic-gradient(from -90deg, #F69BD4 0% ${p}%, #AC6D94 ${p}% 100%)`,
  }
})

function applyQuick(preset: 'ytd' | '3m' | '6m' | '12m') {
  activeQuick.value = preset
  dateRangeError.value = ''
  if (preset === 'ytd') {
    const y = ytdRange()
    startDate.value = y.start
    endDate.value = y.end
  } else if (preset === '3m') {
    const r = monthsOffsetFromToday(3)
    startDate.value = r.start
    endDate.value = r.end
  } else if (preset === '6m') {
    const r = monthsOffsetFromToday(6)
    startDate.value = r.start
    endDate.value = r.end
  } else {
    const r = monthsOffsetFromToday(12)
    startDate.value = r.start
    endDate.value = r.end
  }
  fetchDashboard()
}

function onCustomDateChange() {
  activeQuick.value = null
}

function validateRange(): boolean {
  if (!startDate.value || !endDate.value) {
    dateRangeError.value = 'Tanggal mulai dan akhir wajib diisi'
    return false
  }
  if (endDate.value < startDate.value) {
    dateRangeError.value = 'Tanggal akhir tidak boleh sebelum tanggal mulai'
    return false
  }
  dateRangeError.value = ''
  return true
}

async function fetchDashboard() {
  if (!isKetua()) return
  if (!validateRange()) return

  errorMessage.value = null
  loading.value = true
  const token = getAuthToken()
  if (!token) {
    loading.value = false
    errorMessage.value = 'Sesi login tidak ditemukan. Silakan login ulang.'
    dashboard.value = null
    return
  }

  try {
    const res = await axios.get<{ status: string; message: string; data: ExecutiveFinancialData }>(
      `${import.meta.env.VITE_API_URL}/eis/executive-financial`,
      {
        params: {
          period: period.value,
          startDate: startDate.value,
          endDate: endDate.value,
        },
        headers: { Authorization: `Bearer ${token}` },
      },
    )
    if (res.data.status !== 'success' || !res.data.data) {
      errorMessage.value = res.data.message || 'Gagal memuat dashboard'
      dashboard.value = null
      return
    }
    dashboard.value = res.data.data
  } catch (e: unknown) {
    dashboard.value = null
    if (axios.isAxiosError(e) && e.response?.status === 403) {
      errorMessage.value = 'Tidak memiliki akses'
      return
    }
    if (axios.isAxiosError(e) && e.response?.status === 401) {
      errorMessage.value = String(e.response?.data?.message || 'Sesi tidak valid. Silakan login ulang.')
      return
    }
    if (axios.isAxiosError(e) && e.response?.data?.message) {
      errorMessage.value = String(e.response.data.message)
    } else if (axios.isAxiosError(e) && e.response?.status === 400) {
      errorMessage.value = 'Permintaan tidak valid. Periksa rentang tanggal.'
    } else {
      errorMessage.value = 'Terjadi kesalahan saat memuat dashboard.'
    }
  } finally {
    loading.value = false
  }
}

function resetFilters() {
  const y = ytdRange()
  startDate.value = y.start
  endDate.value = y.end
  period.value = 'monthly'
  activeQuick.value = 'ytd'
  dateRangeError.value = ''
  fetchDashboard()
}

watch(period, () => {
  if (isKetua()) fetchDashboard()
})

onMounted(() => {
  const y = ytdRange()
  startDate.value = y.start
  endDate.value = y.end
  activeQuick.value = 'ytd'
  if (isKetua()) fetchDashboard()
})
</script>

<template>
  <div class="layout">
    <AsisSidebar />

    <main class="content">
      <UnauthorizedAccess
        v-if="!isKetua()"
        mode="content"
        title="Tidak memiliki akses"
        message="Halaman ini hanya dapat diakses oleh Ketua Yayasan."
      />

      <template v-else>
        <header class="page-head">
          <div>
            <h1 class="page-title">Dashboard Finansial Eksekutif</h1>
            <p class="page-subtitle">
              Pantau tren donasi dan komposisi biaya untuk mendukung pengambilan keputusan strategis.
            </p>
          </div>
        </header>

        <section class="filter-card">
          <div class="filter-head">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 4h16" /><path d="M6 12h12" /><path d="M10 20h4" />
            </svg>
            <span>Filter Data</span>
          </div>

          <div class="filter-grid filter-grid--dashboard">
            <div class="field field-span-2">
              <label class="lbl">Rentang cepat</label>
              <div class="seg">
                <button type="button" class="seg-btn" :class="{ on: activeQuick === '3m' }" @click="applyQuick('3m')">
                  3 Bulan
                </button>
                <button type="button" class="seg-btn" :class="{ on: activeQuick === '6m' }" @click="applyQuick('6m')">
                  6 Bulan
                </button>
                <button type="button" class="seg-btn" :class="{ on: activeQuick === '12m' }" @click="applyQuick('12m')">
                  1 Tahun
                </button>
                <button type="button" class="seg-btn" :class="{ on: activeQuick === 'ytd' }" @click="applyQuick('ytd')">
                  Tahun berjalan
                </button>
              </div>
            </div>

            <div class="field field-span-2">
              <label class="lbl">Periode agregasi tren</label>
              <div class="seg">
                <button type="button" class="seg-btn" :class="{ on: period === 'monthly' }" @click="period = 'monthly'">
                  Bulanan
                </button>
                <button type="button" class="seg-btn" :class="{ on: period === 'quarterly' }" @click="period = 'quarterly'">
                  Triwulan
                </button>
                <button type="button" class="seg-btn" :class="{ on: period === 'yearly' }" @click="period = 'yearly'">
                  Tahunan
                </button>
              </div>
            </div>

            <div class="field">
              <label class="lbl">Tanggal mulai</label>
              <input
                v-model="startDate"
                class="inp"
                type="date"
                :max="endDate || undefined"
                @change="onCustomDateChange"
              />
            </div>
            <div class="field">
              <label class="lbl">Tanggal akhir</label>
              <input
                v-model="endDate"
                class="inp"
                type="date"
                :min="startDate || undefined"
                @change="onCustomDateChange"
              />
            </div>
          </div>

          <p v-if="dateRangeError" class="field-error">{{ dateRangeError }}</p>

          <div class="filter-bottom">
            <div style="flex: 1" />
            <button type="button" class="secondary-btn" :disabled="loading" @click="resetFilters">
              Reset filter
            </button>
            <button type="button" class="primary-btn" :disabled="loading" @click="fetchDashboard">
              <span v-if="loading" class="spin" />
              {{ loading ? 'Memuat…' : 'Terapkan filter' }}
            </button>
          </div>
        </section>

        <div v-if="errorMessage" class="alert alert-err">{{ errorMessage }}</div>

        <div v-if="loading && !dashboard" class="skeleton-stack">
          <div class="sk sk-line" />
          <div class="sk sk-cards" />
          <div class="sk sk-block" />
        </div>

        <p v-else-if="loading && dashboard" class="refresh-hint">Memperbarui data…</p>

        <template v-else-if="dashboard && !errorMessage">
          <div v-if="isEmptyDashboard" class="empty-banner">
            <p class="empty-title">Data belum tersedia untuk periode yang dipilih</p>
            <p class="empty-sub">Belum ada transaksi donasi atau pengeluaran pada rentang ini.</p>
          </div>

          <div class="cards cards-3" :class="{ 'cards--muted': loading }">
            <div class="card">
              <div class="card-icon icon-teal">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="2" y="6" width="20" height="14" rx="2" />
                  <path d="M2 10h20" />
                </svg>
              </div>
              <span class="card-lbl">{{ donationTitle }}</span>
              <span class="card-val val-teal">{{ formatRp(parseAmount(dashboard.totalDonationYTD)) }}</span>
              <span class="card-hint card-hint-teal">{{ donationSubtitle }}</span>
              <div class="growth-row" :class="'growth--' + dashboard.donationGrowth.direction.toLowerCase()">
                <span v-if="dashboard.donationGrowth.direction === 'UP'" class="growth-icon" aria-hidden="true">↑</span>
                <span v-else-if="dashboard.donationGrowth.direction === 'DOWN'" class="growth-icon" aria-hidden="true">↓</span>
                <span v-else class="growth-icon" aria-hidden="true">→</span>
                <span class="growth-text">{{ growthCaption }}</span>
              </div>
            </div>

            <div class="card">
              <div class="card-icon icon-program">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </div>
              <span class="card-lbl">Total biaya program</span>
              <span class="card-val val-program">
                {{ formatRp(parseAmount(dashboard.programVsOperationalRatio.programExpense)) }}
              </span>
              <span class="card-hint card-hint-program">Pengeluaran untuk program yayasan</span>
            </div>

            <div class="card">
              <div class="card-icon icon-operational">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="4" y1="21" x2="4" y2="14" />
                  <line x1="4" y1="10" x2="4" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12" y2="3" />
                  <line x1="20" y1="21" x2="20" y2="16" />
                  <line x1="20" y1="12" x2="20" y2="3" />
                </svg>
              </div>
              <span class="card-lbl">Total biaya operasional</span>
              <span class="card-val val-operational">
                {{ formatRp(parseAmount(dashboard.programVsOperationalRatio.operationalExpense)) }}
              </span>
              <span class="card-hint card-hint-operational">Pengeluaran operasional yayasan</span>
            </div>
          </div>

          <section class="panel panel--trend-chart" :class="{ 'panel--muted': loading }">
            <div class="panel-head">
              <h2>Tren donasi</h2>
              <p class="panel-sub">Perkembangan donasi masuk berdasarkan periode agregasi yang dipilih.</p>
            </div>
            <div v-if="(dashboard.donationTrend?.length ?? 0) === 0" class="empty inner-empty">
              <p class="empty-title">Belum ada data tren</p>
            </div>
            <div v-else-if="lineChartModel" class="chart-wrap">
              <svg
                class="line-chart"
                overflow="visible"
                :viewBox="`0 0 ${lineChartModel.w} ${lineChartModel.h}`"
                :width="lineChartModel.w"
                :height="lineChartModel.h"
                role="img"
                :aria-label="'Grafik tren donasi, ' + lineChartModel.pts.length + ' titik data'"
              >
                <line
                  v-for="(tk, i) in lineChartModel.yTicks"
                  :key="'g' + i"
                  class="grid-line"
                  :x1="lineChartModel.padL"
                  :x2="lineChartModel.w - 16"
                  :y1="tk.y"
                  :y2="tk.y"
                />
                <text
                  v-for="(tk, i) in lineChartModel.yTicks"
                  :key="'t' + i"
                  class="axis-label"
                  x="4"
                  :y="tk.y + 4"
                >{{ tk.label }}</text>
                <path class="line-path" :d="lineChartModel.pathD" fill="none" />
                <circle
                  v-for="(c, i) in lineChartModel.coords"
                  :key="'pt' + i"
                  class="line-dot"
                  :cx="c.x"
                  :cy="c.y"
                  r="4"
                />
                <text
                  v-for="(c, i) in lineChartModel.coords"
                  :key="'xl' + i"
                  class="x-label"
                  :x="c.x"
                  :y="lineChartModel.labelBaseY"
                  text-anchor="middle"
                  :title="lineChartModel.pts[i]?.label"
                  :transform="`rotate(${lineChartModel.xLabelDegrees} ${c.x} ${lineChartModel.labelBaseY})`"
                >{{ lineChartModel.axisLabels[i] ?? '' }}</text>
              </svg>
            </div>
          </section>

          <section class="panel ratio-panel" :class="{ 'panel--muted': loading }">
            <div class="panel-head">
              <h2>Rasio biaya program vs operasional</h2>
              <p class="panel-sub">Komposisi pengeluaran pada rentang tanggal yang dipilih.</p>
            </div>
            <div class="ratio-body">
              <div class="donut-visual">
                <div class="donut-ring" :style="donutStyle" />
                <div class="donut-center">
                  <span class="donut-pct">{{ formatPercentOne(parseAmount(dashboard.programVsOperationalRatio.programPercentage)) }}%</span>
                  <span class="donut-lbl">Program</span>
                </div>
              </div>
              <ul class="ratio-legend">
                <li>
                  <span class="dot dot-program" />
                  <strong>Program</strong>
                  <span class="muted">{{ formatPercentOne(parseAmount(dashboard.programVsOperationalRatio.programPercentage)) }}%</span>
                  <span class="amt">{{ formatRp(parseAmount(dashboard.programVsOperationalRatio.programExpense)) }}</span>
                </li>
                <li>
                  <span class="dot dot-operational" />
                  <strong>Operasional</strong>
                  <span class="muted">{{ formatPercentOne(parseAmount(dashboard.programVsOperationalRatio.operationalPercentage)) }}%</span>
                  <span class="amt">{{ formatRp(parseAmount(dashboard.programVsOperationalRatio.operationalExpense)) }}</span>
                </li>
              </ul>
            </div>
          </section>
        </template>
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
  margin-bottom: 24px;
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

.filter-card {
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

.filter-head {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  font-size: 14px;
  color: #525252;
}

.filter-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px 16px;
  align-items: end;
}

.filter-grid--dashboard .field-span-2 {
  grid-column: span 2;
}

@media (max-width: 960px) {
  .filter-grid--dashboard {
    grid-template-columns: 1fr;
  }
  .filter-grid--dashboard .field-span-2 {
    grid-column: span 1;
  }
}

.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.lbl {
  font-size: 12px;
  font-weight: 600;
  color: #525252;
}

.seg {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.seg-btn {
  height: 40px;
  padding: 0 14px;
  border-radius: 8px;
  border: 1px solid #d4d4d4;
  background: #fff;
  font-size: 13px;
  font-weight: 600;
  color: #525252;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}

.seg-btn.on {
  background: #00c6ac;
  border-color: #00c6ac;
  color: #fff;
}

.inp {
  height: 40px;
  border-radius: 8px;
  border: 1px solid #d4d4d4;
  padding: 8px 12px;
  font-size: 14px;
  color: #171717;
  background: #fff;
  outline: none;
  width: 100%;
  box-sizing: border-box;
}

.inp:focus {
  border-color: #00c6ac;
  box-shadow: 0 0 0 1px #00c6ac;
}

.field-error {
  margin: 0;
  font-size: 13px;
  color: #b91c1c;
}

.filter-bottom {
  display: flex;
  gap: 12px;
  align-items: center;
}

.secondary-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  border-radius: 8px;
  padding: 0 16px;
  height: 40px;
  border: 1px solid #d4d4d4;
  background: #fff;
  color: #525252;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.secondary-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.primary-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  border-radius: 8px;
  padding: 0 20px;
  height: 40px;
  border: none;
  background: #00c6ac;
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.primary-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.spin {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.35);
  border-top-color: #fff;
  border-radius: 50%;
  animation: sp 0.7s linear infinite;
}

@keyframes sp {
  to {
    transform: rotate(360deg);
  }
}

.alert {
  border-radius: 12px;
  padding: 12px 16px;
  font-size: 14px;
  margin-bottom: 16px;
}

.alert-err {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #b91c1c;
}

.skeleton-stack {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.sk {
  background: linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%);
  background-size: 200% 100%;
  animation: sh 1.2s ease infinite;
  border-radius: 12px;
}

@keyframes sh {
  0% {
    background-position: 100% 0;
  }
  100% {
    background-position: -100% 0;
  }
}

.sk-line {
  height: 48px;
}

.sk-cards {
  height: 120px;
}

.sk-block {
  height: 280px;
}

.empty-banner {
  background: #fff;
  border: 1px solid #e5e5e5;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 20px;
  text-align: center;
}

.empty-title {
  margin: 0 0 6px;
  font-size: 16px;
  font-weight: 600;
  color: #525252;
}

.empty-sub {
  margin: 0;
  font-size: 13px;
  color: #a1a1a1;
}

.cards {
  display: grid;
  gap: 16px;
  margin-bottom: 24px;
}

.cards--muted {
  opacity: 0.65;
  transition: opacity 0.2s;
}

@media (max-width: 900px) {
  .cards-3 {
    grid-template-columns: 1fr;
  }
}

.card {
  position: relative;
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
  border: 1px solid #e5e5e5;
  display: flex;
  flex-direction: column;
}

.card-lbl {
  font-size: 12px;
  font-weight: 600;
  color: #a1a1a1;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.card-val {
  display: block;
  margin-top: 8px;
  font-size: 22px;
  font-weight: 700;
}

.val-teal {
  color: #00a88f;
}
.val-program {
  color: #f69bd4;
}
.val-operational {
  color: #ac6d94;
}

.card-hint {
  display: inline-flex;
  margin-top: 12px;
  font-size: 11px;
  font-weight: 600;
  border-radius: 999px;
  padding: 4px 10px;
  width: fit-content;
}

.card-hint-teal {
  background: #ecfdf5;
  color: #059669;
}
.card-hint-program {
  background: rgba(246, 155, 212, 0.22);
  color: #8b3a6a;
}
.card-hint-operational {
  background: rgba(172, 109, 148, 0.18);
  color: #5c3550;
}

.card-icon {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 34px;
  height: 34px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-teal {
  background: #ccfbf1;
  color: #00a88f;
}
.icon-program {
  background: rgba(246, 155, 212, 0.35);
  color: #f69bd4;
}
.icon-operational {
  background: rgba(172, 109, 148, 0.28);
  color: #ac6d94;
}

.growth-row {
  margin-top: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
}

.growth--up {
  color: #059669;
}
.growth--down {
  color: #dc2626;
}
.growth--stable {
  color: #525252;
}

.growth-icon {
  font-size: 16px;
  line-height: 1;
}

.panel {
  background: #fff;
  border-radius: 12px;
  border: 1px solid #e5e5e5;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
  padding: 20px;
  margin-bottom: 24px;
}

.panel--trend-chart {
  overflow: visible;
}

.panel-head h2 {
  margin: 0 0 4px;
  font-size: 16px;
  font-weight: 600;
  color: #171717;
}

.panel-sub {
  margin: 0 0 16px;
  font-size: 13px;
  color: #737373;
}

.panel--muted {
  opacity: 0.65;
  transition: opacity 0.2s;
}

.refresh-hint {
  margin: 0 0 16px;
  font-size: 13px;
  font-weight: 600;
  color: #00a88f;
}

.chart-wrap {
  width: 100%;
  overflow-x: auto;
  overflow-y: visible;
  padding-bottom: 20px;
  -webkit-overflow-scrolling: touch;
}

.line-chart {
  display: block;
  max-width: none;
  overflow: visible;
}

.grid-line {
  stroke: #f0f0f0;
  stroke-width: 1;
}

.axis-label {
  fill: #a1a1a1;
  font-size: 10px;
}

.line-path {
  stroke: #00c6ac;
  stroke-width: 2.5;
  stroke-linejoin: round;
  stroke-linecap: round;
}

.line-dot {
  fill: #fff;
  stroke: #00c6ac;
  stroke-width: 2;
}

.x-label {
  fill: #525252;
  font-size: 11px;
}

.inner-empty {
  padding: 32px;
  text-align: center;
}

.ratio-panel .ratio-body {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 32px;
  justify-content: center;
}

.donut-visual {
  position: relative;
  width: 200px;
  height: 200px;
  flex-shrink: 0;
}

.donut-ring {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  -webkit-mask-image: radial-gradient(circle, transparent 62px, #000 63px);
  mask-image: radial-gradient(circle, transparent 62px, #000 63px);
}

.donut-center {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.donut-pct {
  font-size: 22px;
  font-weight: 700;
  color: #171717;
}

.donut-lbl {
  font-size: 12px;
  color: #737373;
}

.ratio-legend {
  list-style: none;
  padding: 0;
  margin: 0;
  min-width: 260px;
}

.ratio-legend li {
  display: grid;
  grid-template-columns: 16px 1fr auto auto;
  gap: 10px;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #f5f5f5;
  font-size: 14px;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}
.dot-program {
  background: #f69bd4;
}
.dot-operational {
  background: #ac6d94;
}

.muted {
  color: #737373;
  font-weight: 600;
}

.amt {
  font-weight: 700;
  color: #171717;
}
</style>
