<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import axios from 'axios'
import * as XLSX from 'xlsx'
import { toast } from 'vue-sonner'
import AsisSidebar from '@/components/AsisSidebar.vue'
import type { FinancialReportCategoryOption, FinancialReportData } from '@/interfaces/financial-report.interface'
import { getAuthToken, handleAuthError } from '@/lib/auth'
import router from '@/router'

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

const fallbackCategoryOptions: FinancialReportCategoryOption[] = [
  { id: 'DONASI', label: 'Donasi' },
  { id: 'ZAKAT', label: 'Zakat' },
  { id: 'INFAQ', label: 'Infaq' },
  { id: 'OPERASIONAL', label: 'Operasional' },
  { id: 'KONSUMSI', label: 'Konsumsi' },
  { id: 'TRANSPORTASI', label: 'Transportasi' },
  { id: 'PERLENGKAPAN', label: 'Perlengkapan' },
  { id: 'PROGRAM_KEGIATAN', label: 'Program kegiatan' },
  { id: 'GAJI', label: 'Gaji' },
  { id: 'INFRASTRUKTUR', label: 'Infrastruktur' },
  { id: 'LAIN_LAIN', label: 'Lain-lain' },
]

const categoryOptions = computed<FinancialReportCategoryOption[]>(() => {
  return report.value?.availableCategories?.length
    ? report.value.availableCategories
    : fallbackCategoryOptions
})

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
}

async function fetchReport() {
  errorMessage.value = null
  loading.value = true
  hasFetched.value = true
  const token = getAuthToken()
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
      await handleAuthError(401, router)
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

function exportExcel() {
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

  const rows: (string | number)[][] = [
    ['LAPORAN KEUANGAN'],
    ['Periode', r.periodLabel],
    ['Rentang tanggal', `${r.dateRange.startDate} s/d ${r.dateRange.endDate}`],
    ['Filter kategori', selectedLabels],
    [],
    ['RINGKASAN'],
    ['Total pemasukan', formatExcelCurrency(parseAmount(r.totalIncome))],
    ['Total pengeluaran', formatExcelCurrency(parseAmount(r.totalExpense))],
    ['Selisih', formatExcelCurrency(parseAmount(r.netDifference))],
    [],
    ['Kategori / jenis', 'Total pemasukan', 'Total pengeluaran', 'Selisih'],
  ]
  for (const b of r.breakdown ?? []) {
    rows.push([
      b.label,
      formatExcelCurrency(parseAmount(b.totalIncome)),
      formatExcelCurrency(parseAmount(b.totalExpense)),
      formatExcelCurrency(parseAmount(b.netDifference)),
    ])
  }
  rows.push([])
  rows.push([
    'TOTAL',
    formatExcelCurrency(parseAmount(r.totalIncome)),
    formatExcelCurrency(parseAmount(r.totalExpense)),
    formatExcelCurrency(parseAmount(r.netDifference)),
  ])

  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws['!cols'] = [{ wch: 36 }, { wch: 22 }, { wch: 22 }, { wch: 22 }]
  ws['!autofilter'] = { ref: 'A11:D11' }
  ws['!freeze'] = { xSplit: 0, ySplit: 11 }

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Ringkasan')
  const safe = r.periodLabel.replace(/\s+/g, '_')
  XLSX.writeFile(wb, `laporan-keuangan_${safe}.xlsx`)
  toast.success('File Excel berhasil diunduh')
}
</script>

<template>
  <div class="layout">
    <AsisSidebar />
    <main class="main">
      <div class="content">
        <header class="page-head">
          <div>
            <h1 class="page-title">Laporan Keuangan</h1>
            <p class="page-sub">
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

        <section class="filter-card">
          <div class="filter-head">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
            <span>Filter data</span>
          </div>

          <div class="filter-grid">
            <div class="field">
              <label class="lbl">Periode</label>
              <div class="seg">
                <button type="button" class="seg-btn" :class="{ on: period === 'monthly' }" @click="period = 'monthly'">Bulanan</button>
                <button type="button" class="seg-btn" :class="{ on: period === 'quarterly' }" @click="period = 'quarterly'">Triwulan</button>
                <button type="button" class="seg-btn" :class="{ on: period === 'yearly' }" @click="period = 'yearly'">Tahunan</button>
              </div>
            </div>

            <div class="field">
              <label class="lbl">Tahun</label>
              <select v-model.number="year" class="inp">
                <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
              </select>
            </div>

            <div v-if="period === 'monthly'" class="field">
              <label class="lbl">Bulan</label>
              <select v-model.number="month" class="inp">
                <option v-for="(m, idx) in monthNames" :key="idx" :value="idx + 1">{{ m }}</option>
              </select>
            </div>

            <div v-if="period === 'quarterly'" class="field">
              <label class="lbl">Triwulan</label>
              <select v-model.number="quarter" class="inp">
                <option :value="1">Triwulan 1 (Jan–Mar)</option>
                <option :value="2">Triwulan 2 (Apr–Jun)</option>
                <option :value="3">Triwulan 3 (Jul–Sep)</option>
                <option :value="4">Triwulan 4 (Okt–Des)</option>
              </select>
            </div>

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

            <div class="field field-actions">
              <label class="lbl">&nbsp;</label>
              <div class="action-row">
                <button type="button" class="btn-reset" :disabled="loading" @click="resetFilters">Reset filter</button>
                <button type="button" class="btn-primary" :disabled="loading" @click="fetchReport">
                  <span v-if="loading" class="spin" />
                  {{ loading ? 'Memuat…' : 'Terapkan filter' }}
                </button>
              </div>
            </div>
          </div>

          <div v-if="selectedCategoryLabels.length > 0" class="active-filters">
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
        </section>

        <div v-if="errorMessage" class="alert alert-err">{{ errorMessage }}</div>

        <template v-if="report && !errorMessage">
          <div class="period-chip">{{ report.periodLabel }}</div>

          <div class="cards">
            <div class="card card-in">
              <div class="card-icon icon-in">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="8 12 12 8 16 12" />
                  <line x1="12" y1="16" x2="12" y2="8" />
                </svg>
              </div>
              <span class="card-lbl">Total pemasukan</span>
              <span class="card-val val-in">{{ formatAmount(parseAmount(report.totalIncome)) }}</span>
              <span class="card-hint card-hint-in">
                <i class="bi bi-arrow-down"></i>
                Pemasukan periode ini
              </span>
            </div>
            <div class="card card-out">
              <div class="card-icon icon-out">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="8 12 12 16 16 12" />
                  <line x1="12" y1="8" x2="12" y2="16" />
                </svg>
              </div>
              <span class="card-lbl">Total pengeluaran</span>
              <span class="card-val val-out">{{ formatAmount(parseAmount(report.totalExpense)) }}</span>
              <span class="card-hint card-hint-out">
                <i class="bi bi-box-arrow-up-right"></i>
                Pengeluaran periode ini
              </span>
            </div>
            <div class="card card-net">
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
                <i :class="isNetDeficit ? 'bi bi-arrow-down' : 'bi bi-arrow-up'"></i>
                {{ isNetDeficit ? 'Keuangan defisit' : 'Keuangan surplus' }}
              </span>
            </div>
          </div>

          <section class="table-card">
            <div class="table-head">
              <h2>Ringkasan per kategori</h2>
              <span class="badge-count">{{ report.breakdown?.length ?? 0 }} baris</span>
            </div>

            <div v-if="isEmpty" class="empty">
              <p>Tidak ada transaksi pada periode ini.</p>
              <p class="empty-sub">Coba ubah periode atau terapkan filter lain.</p>
            </div>

            <table v-else class="tbl">
              <thead>
                <tr>
                  <th>Kategori</th>
                  <th class="num">Total pemasukan</th>
                  <th class="num">Total pengeluaran</th>
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
      </div>
    </main>
  </div>
</template>

<style scoped>
.layout { display: flex; min-height: 100vh; background: #f5f6f7; font-family: 'Manrope', system-ui, sans-serif; }
.main { flex: 1; overflow-y: auto; }
.content { max-width: 1040px; margin: 0 auto; padding: 36px 28px 48px; }

.page-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; margin-bottom: 22px; }
.page-title { font-family: 'Poppins', sans-serif; font-size: 28px; font-weight: 600; color: #111827; letter-spacing: -0.02em; }
.page-sub { margin-top: 6px; font-size: 0.9rem; color: #6b7280; max-width: 560px; line-height: 1.5; }

.btn-export {
  display: inline-flex; align-items: center; gap: 8px;
  height: 42px; padding: 0 16px; border-radius: 10px;
  border: 1.5px solid #00C6AC; background: #fff; color: #00a88f;
  font-weight: 600; font-size: 0.875rem; cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.btn-export:hover:not(:disabled) { background: #f0fdfb; }
.btn-export:disabled { opacity: 0.45; cursor: not-allowed; }

.filter-card {
  background: #fff; border-radius: 14px; padding: 18px 20px 20px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06); margin-bottom: 16px;
}
.filter-head { display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 0.78rem; letter-spacing: 0.06em; color: #6b7280; margin-bottom: 14px; }
.filter-grid { display: flex; flex-wrap: wrap; gap: 14px 18px; align-items: flex-end; }
.field { display: flex; flex-direction: column; gap: 6px; min-width: 140px; }
.field-actions { margin-left: auto; }
.field-category { position: relative; min-width: 240px; }
.lbl { font-size: 0.78rem; font-weight: 600; color: #374151; }

.active-filters {
  margin-top: 16px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 5px;
}

.active-label {
  font-size: 0.72rem;
  color: #9ca3af;
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
  font-size: 0.74rem;
  font-weight: 500;
  cursor: pointer;
}

.chip-close {
  font-size: 0.82rem;
  line-height: 1;
}

.seg { display: flex; gap: 6px; flex-wrap: wrap; }
.seg-btn {
  height: 38px; padding: 0 14px; border-radius: 10px; border: 1.5px solid #e5e7eb;
  background: #fafafa; font-family: inherit; font-size: 0.82rem; font-weight: 600; color: #4b5563; cursor: pointer;
}
.seg-btn.on { background: #00C6AC; border-color: #00C6AC; color: #fff; }

.inp {
  height: 40px; padding: 0 12px; border-radius: 10px; border: 1.5px solid #e5e7eb;
  background: #fafafa; font-family: inherit; font-size: 0.875rem; min-width: 160px;
}
.inp:focus { outline: none; border-color: #00C6AC; background: #fff; }

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
  border: 1.5px solid #e5e7eb;
  border-radius: 12px;
  box-shadow: 0 10px 24px rgba(0,0,0,0.12);
  padding: 8px;
}

.cat-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  font-size: 0.875rem;
  color: #111827;
}

.cat-item:hover {
  background: #f9fafb;
}

.cat-item input[type='checkbox'] {
  width: 16px;
  height: 16px;
  accent-color: #00C6AC;
}

.btn-primary {
  height: 40px; padding: 0 20px; border-radius: 10px; border: none; background: #00C6AC; color: #fff;
  font-weight: 600; font-size: 0.875rem; cursor: pointer; display: inline-flex; align-items: center; gap: 8px;
  box-shadow: 0 4px 12px rgba(0,198,172,0.25);
}
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

.action-row { display: flex; align-items: center; gap: 8px; }

.btn-reset {
  height: 40px;
  padding: 0 16px;
  border-radius: 10px;
  border: 1.5px solid #d1d5db;
  background: #fff;
  color: #374151;
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
}
.btn-reset:hover:not(:disabled) { background: #f9fafb; }
.btn-reset:disabled { opacity: 0.6; cursor: not-allowed; }
.spin {
  width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.35); border-top-color: #fff;
  border-radius: 50%; animation: sp 0.7s linear infinite;
}
@keyframes sp { to { transform: rotate(360deg); } }

.alert { border-radius: 12px; padding: 12px 16px; font-size: 0.875rem; margin-bottom: 16px; }
.alert-err { background: #fef2f2; border: 1px solid #fecaca; color: #b91c1c; }

.period-chip {
  display: inline-block; padding: 6px 14px; border-radius: 999px; background: #d0f0ea; color: #006B5A;
  font-size: 0.78rem; font-weight: 600; margin-bottom: 14px;
}

.cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 20px; }
@media (max-width: 900px) { .cards { grid-template-columns: 1fr; } }

.card {
  position: relative;
  background: #fff; border-radius: 14px; padding: 18px 18px 16px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06); border: 1px solid #f0f0f0;
}
.card-lbl { font-size: 0.75rem; font-weight: 600; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.04em; }
.card-val { display: block; margin-top: 8px; font-size: 1.35rem; font-weight: 700; letter-spacing: -0.02em; }
.card-hint {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-top: 14px;
  font-size: 0.72rem;
  font-weight: 600;
  border-radius: 999px;
  padding: 4px 10px;
}
.val-in { color: #059669; }
.val-out { color: #dc2626; }
.net-pos { color: #059669; }
.net-neg { color: #dc2626; }
.net-neutral { color: #374151; }

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
.icon-in { background: #ecfdf5; color: #10b981; }
.icon-out { background: #fef2f2; color: #ef4444; }
.icon-net { background: #ecfdf5; color: #22c55e; }

.card-hint-in { background: #ecfdf5; color: #059669; }
.card-hint-out { background: #fef2f2; color: #dc2626; }
.card-hint-net { background: #ecfdf5; color: #059669; }

.table-card { background: #fff; border-radius: 14px; padding: 18px 0 8px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
.table-head { display: flex; align-items: center; justify-content: space-between; padding: 0 20px 12px; border-bottom: 1px solid #f0f0f0; }
.table-head h2 { font-size: 1rem; font-weight: 700; color: #111827; }
.badge-count { font-size: 0.75rem; font-weight: 600; color: #6b7280; background: #f3f4f6; padding: 4px 10px; border-radius: 8px; }

.tbl { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
.tbl th { text-align: left; padding: 12px 20px; color: #6b7280; font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; background: #fafafa; }
.tbl td { padding: 14px 20px; border-bottom: 1px solid #f5f5f5; vertical-align: middle; }
.tbl .num { text-align: right; font-variant-numeric: tabular-nums; }
.total-row td { background: #fafafa; border-bottom: none; }
.dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 8px; vertical-align: middle; }
.dot-in { background: #10b981; }
.dot-out { background: #f97316; }

.empty { padding: 48px 24px; text-align: center; color: #6b7280; }
.empty-sub { margin-top: 8px; font-size: 0.85rem; color: #9ca3af; }

.footnote { padding: 12px 20px 18px; font-size: 0.72rem; color: #9ca3af; line-height: 1.5; }

.hint { text-align: center; padding: 40px; color: #9ca3af; font-size: 0.9rem; }
</style>
