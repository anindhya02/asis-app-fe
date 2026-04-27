<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import axios from 'axios'
import ExcelJS from 'exceljs'
import { toast } from 'vue-sonner'
import AsisSidebar from '@/components/AsisSidebar.vue'
import type { FinancialReportCategoryOption, FinancialReportData } from '@/interfaces/financial-report.interface'
import { FINANCIAL_REPORT_CATEGORY_OPTIONS } from '@/constants/financial-report-categories'
import { getAuthToken } from '@/lib/auth'

const period = ref<'monthly' | 'quarterly' | 'yearly'>('monthly')
const year = ref(new Date().getFullYear())
const month = ref(new Date().getMonth() + 1)
const quarter = ref(1)
const selectedCategoryIds = ref<string[]>([])
const showCategoryMenu = ref(false)

const loading = ref(false)
const errorMessage = ref<string | null>(null)
const report = ref<FinancialReportData | null>(null)
const hasFetched = ref(false)

const years = computed(() => {
  const y = new Date().getFullYear()
  return Array.from({ length: 8 }, (_, i) => y - 3 + i)
})

const monthNames = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

const categoryOptions = computed<FinancialReportCategoryOption[]>(() => FINANCIAL_REPORT_CATEGORY_OPTIONS)

const selectedCategoryText = computed(() => {
  if (selectedCategoryIds.value.length === 0) return 'Semua kategori'
  return `${selectedCategoryIds.value.length} dipilih`
})

const selectedCategoryLabels = computed(() =>
  selectedCategoryIds.value.map((id) => {
    const found = categoryOptions.value.find((opt) => opt.id === id)
    return { id, label: found?.label ?? id }
  }),
)

function parseAmount(v: string | number | undefined | null): number {
  if (v == null || v === '') return 0
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

const isEmpty = computed(() => {
  if (!report.value) return false
  return (
    parseAmount(report.value.totalIncome) === 0 &&
    parseAmount(report.value.totalExpense) === 0 &&
    (report.value.breakdown?.length ?? 0) === 0
  )
})

function formatRp(n: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
}

function formatAmount(n: number): string {
  if (n === 0) return '-'
  return formatRp(n)
}

function formatExcelCurrency(n: number): string {
  if (n === 0) return '-'
  return formatRp(n)
}

const netClass = computed(() => {
  if (!report.value) return 'net-neutral'
  const n = parseAmount(report.value.netDifference)
  if (n > 0) return 'net-pos'
  if (n < 0) return 'net-neg'
  return 'net-neutral'
})

const isNetDeficit = computed(() => {
  if (!report.value) return false
  return parseAmount(report.value.netDifference) < 0
})

watch(period, (p) => {
  if (p === 'monthly' && (month.value < 1 || month.value > 12)) month.value = 1
  if (p === 'quarterly' && (quarter.value < 1 || quarter.value > 4)) quarter.value = 1
})

function toggleCategory(id: string) {
  if (selectedCategoryIds.value.includes(id)) {
    selectedCategoryIds.value = selectedCategoryIds.value.filter((v) => v !== id)
    return
  }
  selectedCategoryIds.value = [...selectedCategoryIds.value, id]
}

function resetFilters() {
  period.value = 'monthly'
  year.value = new Date().getFullYear()
  month.value = new Date().getMonth() + 1
  quarter.value = 1
  selectedCategoryIds.value = []
  showCategoryMenu.value = false
  errorMessage.value = null
  pruneInvalidCategorySelections()
}

function pruneInvalidCategorySelections() {
  const allowed = new Set(FINANCIAL_REPORT_CATEGORY_OPTIONS.map((o) => o.id))
  selectedCategoryIds.value = selectedCategoryIds.value.filter((id) => allowed.has(id))
}

async function fetchReport() {
  errorMessage.value = null
  loading.value = true
  hasFetched.value = true
  const token = getAuthToken()
  if (!token) {
    loading.value = false
    report.value = null
    errorMessage.value = 'Sesi login tidak ditemukan. Silakan login ulang.'
    return
  }
  pruneInvalidCategorySelections()
  const params: Record<string, string | number> = {
    period: period.value,
    year: year.value,
  }
  if (period.value === 'monthly') params.month = month.value
  if (period.value === 'quarterly') params.quarter = quarter.value
  if (selectedCategoryIds.value.length > 0) params.categoryIds = selectedCategoryIds.value.join(',')

  try {
    const res = await axios.get<{ status: string; message: string; data: FinancialReportData }>(
      `${import.meta.env.VITE_API_URL}/mis/financial-report`,
      { params, headers: { Authorization: `Bearer ${token}` } },
    )
    if (res.data.status !== 'success' || !res.data.data) {
      errorMessage.value = res.data.message || 'Gagal memuat laporan'
      report.value = null
      return
    }
    report.value = res.data.data
  } catch (e: unknown) {
    report.value = null
    if (axios.isAxiosError(e) && e.response?.status === 401) {
      errorMessage.value = String(e.response?.data?.message || 'Sesi tidak valid. Silakan login ulang.')
      return
    }
    if (axios.isAxiosError(e) && e.response?.data?.message) {
      errorMessage.value = String(e.response.data.message)
    } else if (axios.isAxiosError(e) && e.response?.status === 400) {
      errorMessage.value = 'Permintaan tidak valid. Periksa periode dan parameter.'
    } else {
      errorMessage.value = 'Terjadi kesalahan saat memuat laporan.'
    }
  } finally {
    loading.value = false
  }
}

async function exportExcel() {
  if (!report.value) {
    toast.error('Belum ada data laporan untuk diekspor')
    return
  }
  const r = report.value
  const selectedLabels = selectedCategoryIds.value.length === 0
    ? 'Semua kategori'
    : selectedCategoryIds.value
      .map((id) => categoryOptions.value.find((opt) => opt.id === id)?.label || id)
      .join(', ')

  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('Ringkasan')

  worksheet.columns = [
    { width: 32 },
    { width: 28 },
    { width: 20 },
    { width: 20 },
  ]

  const fontNormal = { name: 'Cambria', size: 14 }
  const fontBold = { name: 'Cambria', size: 14, bold: true }
  const fillGreen = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFB8CE92' } }
  const thinBorder = {
    top: { style: 'thin' as const },
    left: { style: 'thin' as const },
    bottom: { style: 'thin' as const },
    right: { style: 'thin' as const },
  }

  const headerFill = fillGreen

  worksheet.mergeCells('A1:B1')
  worksheet.getCell('A1').value = 'LAPORAN KEUANGAN'
  worksheet.getCell('A1').font = fontBold
  worksheet.getCell('A1').fill = headerFill
  worksheet.getCell('A1').alignment = { vertical: 'middle', horizontal: 'left' }

  worksheet.getCell('A2').value = 'Periode'
  worksheet.getCell('B2').value = r.periodLabel
  worksheet.getCell('A3').value = 'Rentang tanggal'
  worksheet.getCell('B3').value = `${r.dateRange.startDate} s/d ${r.dateRange.endDate}`
  worksheet.getCell('A4').value = 'Filter kategori'
  worksheet.getCell('B4').value = selectedLabels

  worksheet.mergeCells('A6:B6')
  worksheet.getCell('A6').value = 'RINGKASAN'
  worksheet.getCell('A6').font = fontBold
  worksheet.getCell('A6').fill = headerFill

  worksheet.getCell('A7').value = 'Total pemasukan'
  worksheet.getCell('B7').value = formatExcelCurrency(parseAmount(r.totalIncome))
  worksheet.getCell('A8').value = 'Total pengeluaran'
  worksheet.getCell('B8').value = formatExcelCurrency(parseAmount(r.totalExpense))
  worksheet.getCell('A9').value = 'Selisih'
  worksheet.getCell('B9').value = formatExcelCurrency(parseAmount(r.netDifference))

  const headerRow = 11
  worksheet.getCell(`A${headerRow}`).value = 'Kategori / jenis'
  worksheet.getCell(`B${headerRow}`).value = 'Total pemasukan'
  worksheet.getCell(`C${headerRow}`).value = 'Total pengeluaran'
  worksheet.getCell(`D${headerRow}`).value = 'Selisih'

  let row = headerRow + 1
  for (const b of r.breakdown ?? []) {
    worksheet.getCell(`A${row}`).value = b.label
    worksheet.getCell(`B${row}`).value = formatExcelCurrency(parseAmount(b.totalIncome))
    worksheet.getCell(`C${row}`).value = formatExcelCurrency(parseAmount(b.totalExpense))
    worksheet.getCell(`D${row}`).value = formatExcelCurrency(parseAmount(b.netDifference))
    row++
  }
  row++
  worksheet.getCell(`A${row}`).value = 'TOTAL'
  worksheet.getCell(`B${row}`).value = formatExcelCurrency(parseAmount(r.totalIncome))
  worksheet.getCell(`C${row}`).value = formatExcelCurrency(parseAmount(r.totalExpense))
  worksheet.getCell(`D${row}`).value = formatExcelCurrency(parseAmount(r.netDifference))

  for (let i = 1; i <= row; i++) {
    for (const col of ['A', 'B', 'C', 'D']) {
      const c = worksheet.getCell(`${col}${i}`)
      const isInfoTable = ['A', 'B'].includes(col) && i >= 1 && i <= 4
      const isSummaryTable = ['A', 'B'].includes(col) && i >= 6 && i <= 9
      const isBreakdownTable = i >= headerRow && i <= row
      const isInsideTable = isInfoTable || isSummaryTable || isBreakdownTable

      if (!isInsideTable) {
        c.value = c.value ?? null
        c.border = undefined as any
        c.fill = undefined as any
        c.font = fontNormal
        continue
      }

      const isHeaderCell = i === 1 || i === 6 || i === headerRow || i === row
      c.font = isHeaderCell ? fontBold : fontNormal
      c.border = thinBorder
      if (isHeaderCell) {
        c.fill = headerFill
      } else {
        c.fill = undefined as any
      }
      c.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true }
    }
  }

  const safe = r.periodLabel.replace(/\s+/g, '_')
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `laporan-keuangan_${safe}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
  toast.success('File Excel berhasil diunduh')
}
</script>

<template>
  <div class="layout">
    <AsisSidebar />

    <main class="content">
      <!-- Header -->
      <header class="page-head">
        <div>
          <h1 class="page-title">Laporan Keuangan</h1>
          <p class="page-subtitle">
            Ringkasan pemasukan dan pengeluaran dari transaksi kas masuk dan kas keluar per periode.
          </p>
        </div>
        <button type="button" class="btn-export" :disabled="!report" @click="exportExcel">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Ekspor Excel
        </button>
      </header>

      <!-- Filter Card -->
      <section class="filter-card">
        <div class="filter-head">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 4h16" /><path d="M6 12h12" /><path d="M10 20h4" />
          </svg>
          <span>Filter Data</span>
        </div>

        <div class="filter-grid">
          <!-- Periode -->
          <div class="field">
            <label class="lbl">Periode</label>
            <div class="seg">
              <button type="button" class="seg-btn" :class="{ on: period === 'monthly' }" @click="period = 'monthly'">Bulanan</button>
              <button type="button" class="seg-btn" :class="{ on: period === 'quarterly' }" @click="period = 'quarterly'">Triwulan</button>
              <button type="button" class="seg-btn" :class="{ on: period === 'yearly' }" @click="period = 'yearly'">Tahunan</button>
            </div>
          </div>

          <!-- Tahun -->
          <div class="field">
            <label class="lbl">Tahun</label>
            <select v-model.number="year" class="inp">
              <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
            </select>
          </div>

          <!-- Bulan (monthly) -->
          <div v-if="period === 'monthly'" class="field">
            <label class="lbl">Bulan</label>
            <select v-model.number="month" class="inp">
              <option v-for="(m, idx) in monthNames" :key="idx" :value="idx + 1">{{ m }}</option>
            </select>
          </div>

          <!-- Triwulan (quarterly) -->
          <div v-if="period === 'quarterly'" class="field">
            <label class="lbl">Triwulan</label>
            <select v-model.number="quarter" class="inp">
              <option :value="1">Triwulan 1 (Jan–Mar)</option>
              <option :value="2">Triwulan 2 (Apr–Jun)</option>
              <option :value="3">Triwulan 3 (Jul–Sep)</option>
              <option :value="4">Triwulan 4 (Okt–Des)</option>
            </select>
          </div>

          <!-- Kategori -->
          <div class="field field-category">
            <label class="lbl">Kategori</label>
            <button type="button" class="inp category-trigger" @click="showCategoryMenu = !showCategoryMenu">
              <span>{{ selectedCategoryText }}</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            <div v-if="showCategoryMenu" class="category-menu">
              <label v-for="opt in categoryOptions" :key="opt.id" class="cat-item">
                <input
                  type="checkbox"
                  :checked="selectedCategoryIds.includes(opt.id)"
                  @change="toggleCategory(opt.id)"
                />
                <span>{{ opt.label }}</span>
              </label>
            </div>
          </div>
        </div>

        <!-- Bottom row: active chips + reset + apply -->
        <div class="filter-bottom">
          <div class="active-filters" v-if="selectedCategoryLabels.length > 0">
            <span class="active-label">Filter aktif:</span>
            <button
              v-for="item in selectedCategoryLabels"
              :key="item.id"
              type="button"
              class="active-chip"
              @click="toggleCategory(item.id)"
            >
              <span>{{ item.label }}</span>
              <span class="chip-close">×</span>
            </button>
          </div>
          <div v-else style="flex: 1" />

          <button type="button" class="secondary-btn" :disabled="loading" @click="resetFilters">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
            Reset Filter
          </button>
          <button type="button" class="primary-btn" :disabled="loading" @click="fetchReport">
            <span v-if="loading" class="spin" />
            {{ loading ? 'Memuat…' : 'Terapkan Filter' }}
          </button>
        </div>
      </section>

      <!-- Error -->
      <div v-if="errorMessage" class="alert alert-err">{{ errorMessage }}</div>

      <!-- Report content -->
      <template v-if="report && !errorMessage">
        <div class="period-chip">{{ report.periodLabel }}</div>

        <!-- Summary Cards -->
        <div class="cards">
          <div class="card">
            <div class="card-icon icon-in">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="8 12 12 8 16 12" />
                <line x1="12" y1="16" x2="12" y2="8" />
              </svg>
            </div>
            <span class="card-lbl">Total Pemasukan</span>
            <span class="card-val val-in">{{ formatAmount(parseAmount(report.totalIncome)) }}</span>
            <span class="card-hint card-hint-in">Pemasukan periode ini</span>
          </div>

          <div class="card">
            <div class="card-icon icon-out">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="8 12 12 16 16 12" />
                <line x1="12" y1="8" x2="12" y2="16" />
              </svg>
            </div>
            <span class="card-lbl">Total Pengeluaran</span>
            <span class="card-val val-out">{{ formatAmount(parseAmount(report.totalExpense)) }}</span>
            <span class="card-hint card-hint-out">Pengeluaran periode ini</span>
          </div>

          <div class="card">
            <div class="card-icon" :class="isNetDeficit ? 'icon-out' : 'icon-in'">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <template v-if="isNetDeficit">
                  <path d="M7 7L17 17" />
                  <path d="M17 13v4h-4" />
                </template>
                <template v-else>
                  <path d="M7 17L17 7" />
                  <path d="M13 7h4v4" />
                </template>
              </svg>
            </div>
            <span class="card-lbl">Selisih</span>
            <span class="card-val" :class="netClass">{{ formatAmount(parseAmount(report.netDifference)) }}</span>
            <span class="card-hint" :class="isNetDeficit ? 'card-hint-out' : 'card-hint-net'">
              {{ isNetDeficit ? 'Keuangan defisit' : 'Keuangan surplus' }}
            </span>
          </div>
        </div>

        <!-- Table Card -->
        <section class="table-card">
          <div class="table-head">
            <h2>Ringkasan per kategori</h2>
            <span class="badge-count">{{ report.breakdown?.length ?? 0 }} baris</span>
          </div>

          <div v-if="isEmpty" class="empty">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none"
              stroke="#d4d4d4" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 9h18M9 21V9" />
            </svg>
            <p class="empty-title">Tidak ada transaksi</p>
            <p class="empty-sub">Coba ubah periode atau terapkan filter lain.</p>
          </div>

          <table v-else class="tbl">
            <thead>
              <tr>
                <th>Kategori</th>
                <th class="num">Total Pemasukan</th>
                <th class="num">Total Pengeluaran</th>
                <th class="num">Selisih</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, i) in report.breakdown" :key="i">
                <td>
                  <span class="dot" :class="row.rowType === 'INCOME' ? 'dot-in' : 'dot-out'" />
                  {{ row.label }}
                </td>
                <td class="num val-in">{{ formatAmount(parseAmount(row.totalIncome)) }}</td>
                <td class="num val-out">{{ formatAmount(parseAmount(row.totalExpense)) }}</td>
                <td class="num" :class="parseAmount(row.netDifference) >= 0 ? 'val-in' : 'val-out'">
                  {{ formatAmount(parseAmount(row.netDifference)) }}
                </td>
              </tr>
              <tr class="total-row">
                <td><strong>Total keseluruhan</strong></td>
                <td class="num val-in"><strong>{{ formatAmount(parseAmount(report.totalIncome)) }}</strong></td>
                <td class="num val-out"><strong>{{ formatAmount(parseAmount(report.totalExpense)) }}</strong></td>
                <td class="num" :class="netClass"><strong>{{ formatAmount(parseAmount(report.netDifference)) }}</strong></td>
              </tr>
            </tbody>
          </table>

          <p class="footnote">
            Data dari transaksi kas masuk (status terkonfirmasi, tidak dihapus) dan kas keluar (aktif, tidak dihapus)
            untuk rentang {{ report.dateRange.startDate }} — {{ report.dateRange.endDate }}.
          </p>
        </section>
      </template>

      <div v-else-if="!loading && hasFetched && !errorMessage" class="hint">
        Terapkan filter untuk menampilkan laporan.
      </div>
    </main>
  </div>
</template>

<style scoped>
/* ───────── Layout ───────── */
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

/* ───────── Header ───────── */
.page-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 24px;
}

.page-title {
  font-size: 32px;
  font-weight: 600;
  margin: 0 0 4px;
  font-family: 'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  color: #171717;
}

.page-subtitle {
  margin: 0;
  color: #525252;
  font-size: 14px;
}

/* ───────── Export button ───────── */
.btn-export {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 40px;
  padding: 0 20px;
  border-radius: 8px;
  border: 1.5px solid #00c6ac;
  background: #fff;
  color: #00a88f;
  font-weight: 600;
  font-size: 13px;
  font-family: 'Manrope', system-ui, sans-serif;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.15s;
}
.btn-export:hover:not(:disabled) { background: #f0fdfb; }
.btn-export:disabled { opacity: 0.45; cursor: not-allowed; }

/* ───────── Filter Card ───────── */
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

.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.field-category { position: relative; }

.lbl {
  font-size: 12px;
  font-weight: 600;
  color: #525252;
  font-family: 'Manrope', system-ui, sans-serif;
}

/* Segmented control */
.seg { display: flex; gap: 6px; flex-wrap: wrap; }
.seg-btn {
  height: 40px;
  padding: 0 14px;
  border-radius: 8px;
  border: 1px solid #d4d4d4;
  background: #fff;
  font-family: 'Manrope', system-ui, sans-serif;
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

/* Inputs & selects */
.inp {
  height: 40px;
  border-radius: 8px;
  border: 1px solid #d4d4d4;
  padding: 8px 12px;
  font-size: 14px;
  color: #171717;
  font-family: 'Manrope', system-ui, sans-serif;
  background-color: #fff;
  transition: border-color 0.15s, box-shadow 0.15s;
  outline: none;
  width: 100%;
  box-sizing: border-box;
}
.inp:focus {
  border-color: #00c6ac;
  box-shadow: 0 0 0 1px #00c6ac;
}

/* Category dropdown */
.category-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
}

.category-menu {
  position: absolute;
  z-index: 20;
  top: calc(100% + 6px);
  left: 0;
  width: 100%;
  max-height: 260px;
  overflow-y: auto;
  background: #fff;
  border: 1px solid #e5e5e5;
  border-radius: 12px;
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.12);
  padding: 8px;
}

.cat-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  font-size: 14px;
  color: #171717;
  cursor: pointer;
}
.cat-item:hover { background: #f5f5f5; }
.cat-item input[type='checkbox'] {
  width: 16px;
  height: 16px;
  accent-color: #00c6ac;
}

/* Filter bottom row */
.filter-bottom {
  display: flex;
  gap: 12px;
  align-items: center;
}

/* Active chips */
.active-filters {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 5px;
  flex: 1;
}
.active-label {
  font-size: 12px;
  color: #a1a1a1;
  margin-right: 2px;
}
.active-chip {
  height: 24px;
  border: 1.5px solid #bfeae2;
  background: #eaf9f6;
  color: #17a995;
  border-radius: 999px;
  padding: 0 8px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
}
.chip-close { font-size: 13px; line-height: 1; }

/* Buttons */
.secondary-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  border-radius: 8px;
  padding: 0 16px;
  height: 40px;
  border: 1px solid #d4d4d4;
  background-color: #ffffff;
  color: #525252;
  font-size: 13px;
  font-weight: 600;
  font-family: 'Manrope', system-ui, sans-serif;
  cursor: pointer;
  transition: background-color 0.15s;
  white-space: nowrap;
}
.secondary-btn:hover:not(:disabled) { background-color: #f5f5f5; }
.secondary-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.primary-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  border-radius: 8px;
  padding: 0 20px;
  height: 40px;
  border: none;
  background-color: #00c6ac;
  color: #ffffff;
  font-size: 13px;
  font-weight: 600;
  font-family: 'Manrope', system-ui, sans-serif;
  cursor: pointer;
  transition: background-color 0.15s;
  white-space: nowrap;
}
.primary-btn:hover:not(:disabled) { background-color: #00b39c; }
.primary-btn:disabled { opacity: 0.6; cursor: not-allowed; }

.spin {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.35);
  border-top-color: #fff;
  border-radius: 50%;
  animation: sp 0.7s linear infinite;
}
@keyframes sp { to { transform: rotate(360deg); } }

/* ───────── Alert ───────── */
.alert { border-radius: 12px; padding: 12px 16px; font-size: 14px; margin-bottom: 16px; }
.alert-err { background: #fef2f2; border: 1px solid #fecaca; color: #b91c1c; }

/* ───────── Period chip ───────── */
.period-chip {
  display: inline-block;
  padding: 6px 14px;
  border-radius: 999px;
  background: #d0f0ea;
  color: #006b5a;
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 14px;
}

/* ───────── Summary Cards ───────── */
.cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}
@media (max-width: 900px) { .cards { grid-template-columns: 1fr; } }

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
  letter-spacing: -0.02em;
}

.card-hint {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-top: 14px;
  font-size: 11px;
  font-weight: 600;
  border-radius: 999px;
  padding: 4px 10px;
  width: fit-content;
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
.icon-in  { background: #ecfdf5; color: #10b981; }
.icon-out { background: #fef2f2; color: #ef4444; }

.val-in  { color: #059669; }
.val-out { color: #dc2626; }
.net-pos { color: #059669; }
.net-neg { color: #dc2626; }
.net-neutral { color: #374151; }

.card-hint-in  { background: #ecfdf5; color: #059669; }
.card-hint-out { background: #fef2f2; color: #dc2626; }
.card-hint-net { background: #ecfdf5; color: #059669; }

/* ───────── Table Card ───────── */
.table-card {
  background-color: #ffffff;
  border-radius: 12px;
  border: 1px solid #e5e5e5;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
  overflow: hidden;
  margin-bottom: 24px;
}

.table-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #e5e5e5;
}
.table-head h2 {
  font-size: 14px;
  font-weight: 600;
  color: #171717;
  margin: 0;
}
.badge-count {
  font-size: 12px;
  font-weight: 600;
  color: #525252;
  background: #f5f5f5;
  padding: 4px 10px;
  border-radius: 8px;
}

.tbl { width: 100%; border-collapse: collapse; font-size: 14px; }
.tbl thead { background-color: #fafafa; }
.tbl th {
  padding: 12px 16px;
  text-align: left;
  font-weight: 600;
  font-size: 12px;
  color: #525252;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border-bottom: 1px solid #e5e5e5;
}
.tbl td {
  padding: 14px 16px;
  border-bottom: 1px solid #f5f5f5;
  vertical-align: middle;
}
.tbl .num { text-align: right; font-variant-numeric: tabular-nums; }
.tbl tbody tr:hover { background-color: #f0fdfb; transition: background-color 0.1s; }
.total-row td { background: #fafafa; border-bottom: none; }

.dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 8px; vertical-align: middle; }
.dot-in  { background: #10b981; }
.dot-out { background: #f97316; }

/* Empty state */
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48px 16px;
  gap: 8px;
}
.empty-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #525252;
}
.empty-sub {
  margin: 0;
  font-size: 13px;
  color: #a1a1a1;
}

.footnote {
  padding: 12px 16px 16px;
  font-size: 12px;
  color: #a1a1a1;
  line-height: 1.5;
}

.hint {
  text-align: center;
  padding: 40px;
  color: #a1a1a1;
  font-size: 14px;
}
</style>