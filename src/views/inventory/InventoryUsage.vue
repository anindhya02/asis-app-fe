<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import axios from 'axios'
import { useRoute, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import AsisSidebar from '@/components/AsisSidebar.vue'
import { useInventoryStore } from '@/stores/inventory.store'
import type { InventoryItem } from '@/interfaces/inventory.interface'

const route = useRoute()
const router = useRouter()
const store = useInventoryStore()

const id = computed(() => {
  const raw = route.params.id
  if (typeof raw === 'string') return raw
  if (Array.isArray(raw)) return raw[0] ?? ''
  return ''
})

const item = ref<InventoryItem | null>(null)
const pageLoading = ref(true)
const submitting = ref(false)
const notFound = ref(false)

const usagePurpose = ref('')
const purposeError = ref('')
const submittedAttempt = ref(false)

/** Satu baris per sub-item dari detail inventory */
interface BreakdownUsageRow {
  breakdownId: string
  name: string
  /** Stok sub-item saat ini (batas atas tombol +) */
  maxAmount: number
  /** Jumlah yang akan dipakai pada submit */
  useAmount: number
}

const breakdownRows = ref<BreakdownUsageRow[]>([])

function formatNumber(value?: string | number | null) {
  if (value == null) return '-'
  const n = Number(value)
  if (!Number.isFinite(n)) return String(value)
  return n.toLocaleString('id-ID')
}

function formatCategory(value?: string) {
  if (!value) return '-'
  return value
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

const unitLabel = computed(() => String(item.value?.unit || '').toLowerCase())

const stockQty = computed(() => {
  if (!item.value?.quantity) return 0
  const n = Number(item.value.quantity)
  return Number.isFinite(n) ? n : 0
})

const totalUsage = computed(() =>
  breakdownRows.value.reduce((s, r) => {
    const v = Number(r.useAmount)
    if (!Number.isFinite(v) || v < 0) return s
    return s + v
  }, 0),
)

const stockExceeded = computed(() => totalUsage.value > stockQty.value)

const anySubItemExceeded = computed(() =>
  breakdownRows.value.some((r) => {
    const v = Number(r.useAmount)
    return Number.isFinite(v) && v > r.maxAmount
  }),
)

const usageSummaryLines = computed(() =>
  breakdownRows.value.filter((r) => {
    const v = Number(r.useAmount)
    return Number.isFinite(v) && v > 0
  }),
)

const hasBreakdowns = computed(
  () => !!(item.value?.breakdownsList && item.value.breakdownsList.length > 0),
)

const canSubmit = computed(() => {
  if (!usagePurpose.value.trim()) return false
  if (!hasBreakdowns.value) return false
  if (breakdownRows.value.length === 0) return false
  if (stockExceeded.value) return false
  if (anySubItemExceeded.value) return false
  if (totalUsage.value <= 0) return false
  for (const r of breakdownRows.value) {
    const v = Number(r.useAmount)
    if (!Number.isFinite(v) || v < 0) return false
    if (v > r.maxAmount) return false
  }
  return true
})

function initBreakdownUsageFromItem(it: InventoryItem) {
  const list = [...(it.breakdownsList || [])].sort((a, b) =>
    (a.name || '').localeCompare(b.name || '', 'id'),
  )
  breakdownRows.value = list.map((b) => {
    const max = Math.max(0, Number(b.amount))
    return {
      breakdownId: b.id || '',
      name: b.name || '-',
      maxAmount: Number.isFinite(max) ? max : 0,
      useAmount: 0,
    }
  })
}

function decUse(row: BreakdownUsageRow) {
  const v = Number(row.useAmount)
  const cur = Number.isFinite(v) ? v : 0
  row.useAmount = Math.max(0, cur - 1)
}

function incUse(row: BreakdownUsageRow) {
  const v = Number(row.useAmount)
  const cur = Number.isFinite(v) ? v : 0
  if (cur < row.maxAmount) {
    row.useAmount = cur + 1
    return
  }
  if (cur === row.maxAmount) {
    toast.warning(
      `Pemakaian sub-item tidak boleh melebihi stok yang tersedia (maks. ${formatNumber(row.maxAmount)} ${unitLabel.value}).`,
    )
    return
  }
  row.useAmount = cur + 1
}

function onUseAmountInput(row: BreakdownUsageRow, raw: string) {
  const t = raw.trim()
  if (t === '' || t === '-') {
    row.useAmount = 0
    return
  }
  const n = parseFloat(t.replace(',', '.'))
  if (Number.isNaN(n)) {
    row.useAmount = 0
    return
  }
  row.useAmount = Math.max(0, n)
}

function rowInputError(row: BreakdownUsageRow) {
  const v = Number(row.useAmount)
  if (!Number.isFinite(v)) return false
  if (v > row.maxAmount) return true
  if (stockExceeded.value && v > 0) return true
  return false
}

function onAmountBlurRow(row: BreakdownUsageRow) {
  const v = Number(row.useAmount)
  if (!Number.isFinite(v)) return
  if (v > row.maxAmount) {
    toast.warning(
      `Pemakaian untuk "${row.name}" tidak boleh melebihi stok sub-item (maks. ${formatNumber(row.maxAmount)} ${unitLabel.value}).`,
    )
  }
  if (totalUsage.value > stockQty.value) {
    toast.warning(
      `Total pemakaian tidak boleh melebihi quantity barang yang tersedia (maks. ${formatNumber(stockQty.value)} ${unitLabel.value}).`,
    )
  }
}

function clearPurposeError() {
  purposeError.value = ''
}

function validateForm(): boolean {
  let ok = true
  purposeError.value = ''
  if (!usagePurpose.value.trim()) {
    purposeError.value = 'Tujuan pemakaian wajib diisi.'
    ok = false
  }
  if (!hasBreakdowns.value) {
    ok = false
  }
  if (totalUsage.value <= 0) {
    ok = false
  }
  if (stockExceeded.value) ok = false
  if (anySubItemExceeded.value) ok = false
  for (const r of breakdownRows.value) {
    const v = Number(r.useAmount)
    if (!Number.isFinite(v) || v < 0 || v > r.maxAmount) ok = false
  }
  return ok
}

async function loadItem() {
  if (!id.value) {
    notFound.value = true
    pageLoading.value = false
    return
  }
  pageLoading.value = true
  notFound.value = false
  item.value = null
  breakdownRows.value = []
  try {
    const data = await store.fetchInventoryItemById(id.value)
    item.value = data
    initBreakdownUsageFromItem(data)
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status
      if (status === 404 || status === 400) {
        notFound.value = true
        pageLoading.value = false
        return
      }
    }
  } finally {
    pageLoading.value = false
  }
}

function goList() {
  router.push('/inventory')
}

function goDetail() {
  if (!id.value) return
  router.push(`/inventory/${id.value}`)
}

async function onSubmit() {
  submittedAttempt.value = true
  if (!validateForm() || !item.value || !hasBreakdowns.value) return

  submitting.value = true
  try {
    await store.recordInventoryUsage(id.value, {
      usagePurpose: usagePurpose.value.trim(),
      breakdownsList: breakdownRows.value.map((r) => ({
        breakdownId: r.breakdownId,
        amount: Number(r.useAmount),
      })),
    })
    toast.success('Rincian pemakaian berhasil disimpan')
    await router.push(`/inventory/${id.value}`)
  } catch (error) {
    const msg =
      (axios.isAxiosError(error) && error.response?.data?.message) ||
      store.error ||
      'Gagal menyimpan rincian pemakaian'
    toast.error(typeof msg === 'string' ? msg : 'Gagal menyimpan rincian pemakaian')
  } finally {
    submitting.value = false
  }
}

watch(
  () => id.value,
  () => {
    usagePurpose.value = ''
    purposeError.value = ''
    submittedAttempt.value = false
    void loadItem()
  },
  { immediate: true },
)
</script>

<template>
  <div class="layout">
    <AsisSidebar />

    <main class="content">
      <template v-if="pageLoading">
        <section class="card">Memuat data item...</section>
      </template>

      <template v-else-if="notFound || !item">
        <section class="card card-empty">
          <h2 class="empty-title">Item tidak ditemukan</h2>
          <p class="empty-text">Item inventory tidak tersedia atau sudah tidak aktif.</p>
          <button type="button" class="btn-primary" @click="goList">Kembali ke Daftar Inventory</button>
        </section>
      </template>

      <template v-else>
        <div class="breadcrumb">
          <button type="button" class="crumb-link" @click="goList">Daftar Inventory</button>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a1a1a1"
            stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
          <button type="button" class="crumb-link" @click="goDetail">Detail Item</button>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a1a1a1"
            stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
          <span class="crumb-current">Rincian Pemakaian</span>
        </div>

        <header class="page-head">
          <div>
            <h1 class="page-title">Rincian Pemakaian Item</h1>
            <p class="page-sub">Catat pemakaian barang dan kurangi stok yang tersedia.</p>
          </div>
          <button type="button" class="btn-back" @click="goDetail">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Kembali
          </button>
        </header>

        <section class="card card-summary">
          <div class="summary-inner">
            <div class="thumb">
              <img v-if="item.photoUrl" :src="item.photoUrl" alt="" class="thumb-img" />
              <svg v-else width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#c5c5c5"
                stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              </svg>
            </div>
            <div class="summary-main">
              <div class="summary-top">
                <div>
                  <p class="k">Nama Barang</p>
                  <h2 class="item-name">{{ item.itemName }}</h2>
                  <p class="sub">{{ item.donorSource }}</p>
                </div>
                <div class="qty-box">
                  <p class="k k-teal">Quantity Tersisa</p>
                  <div class="qty-line">
                    <span class="qty-num">{{ formatNumber(item.quantity) }}</span>
                    <span class="qty-unit">{{ unitLabel }}</span>
                  </div>
                </div>
              </div>
              <div class="meta-row">
                <div>
                  <p class="k">Sumber Donasi</p>
                  <p class="v">{{ item.donorSource }}</p>
                </div>
                <div>
                  <p class="k">Jenis Donasi</p>
                  <p class="v">Donasi Langsung</p>
                </div>
                <div>
                  <p class="k">Kategori</p>
                  <p class="v">{{ formatCategory(item.category) }}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section v-if="!hasBreakdowns" class="card card-warn">
          <h2 class="card-h">Tidak dapat mencatat pemakaian</h2>
          <p class="muted">
            Item ini belum memiliki rincian barang (breakdown). Tambahkan rincian di data inventory terlebih dahulu.
          </p>
          <button type="button" class="btn-outline" @click="goDetail">Kembali ke detail</button>
        </section>

        <template v-else>
          <section class="card">
            <label class="field-label">Tujuan Pemakaian<span class="req">*</span></label>
            <p class="hint">Jelaskan untuk kegiatan atau keperluan apa barang ini digunakan.</p>
            <textarea
              v-model="usagePurpose"
              class="textarea"
              :class="{ 'textarea--err': purposeError }"
              rows="3"
              placeholder="Tuliskan tujuan pemakaian barang..."
              @input="clearPurposeError"
            />
            <p v-if="purposeError" class="err-line">{{ purposeError }}</p>
          </section>

          <section class="card card-table">
            <div class="table-head">
              <div>
                <h2 class="card-h">Breakdown Pemakaian</h2>
                <p class="hint">Atur jumlah per sub-item. Nilai yang melebihi stok tidak dapat disimpan — tombol Simpan nonaktif sampai diperbaiki.</p>
              </div>
              <span class="row-count">{{ breakdownRows.length }} sub-item</span>
            </div>
            <div class="table-scroll">
              <table class="table">
                <thead>
                  <tr>
                    <th class="col-no">No</th>
                    <th>Nama Sub-item</th>
                    <th class="col-stock">Stok sub-item</th>
                    <th class="col-amt">Jumlah dipakai</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(row, idx) in breakdownRows" :key="row.breakdownId">
                    <td class="td-muted">{{ idx + 1 }}</td>
                    <td>
                      <span class="sub-name">{{ row.name }}</span>
                    </td>
                    <td class="td-stock">{{ formatNumber(row.maxAmount) }} {{ unitLabel }}</td>
                    <td>
                      <div class="amt-wrap">
                        <button
                          type="button"
                          class="step-btn"
                          :disabled="(Number(row.useAmount) || 0) <= 0"
                          @click="decUse(row)"
                        >
                          −
                        </button>
                        <input
                          :value="Number(row.useAmount) === 0 ? '' : row.useAmount"
                          type="number"
                          step="any"
                          class="inp inp-num"
                          :class="{ 'inp--err': rowInputError(row) }"
                          placeholder="0"
                          @input="onUseAmountInput(row, ($event.target as HTMLInputElement).value)"
                          @blur="onAmountBlurRow(row)"
                        />
                        <button type="button" class="step-btn step-btn-plus" @click="incUse(row)">
                          +
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="ringkasan-pemakaian">
              <h3 class="ringkasan-title">Ringkasan pemakaian</h3>
              <p v-if="usageSummaryLines.length === 0" class="ringkasan-empty">
                Belum ada sub-item yang dialokasikan. Gunakan tombol + atau isi jumlah dipakai.
              </p>
              <ul v-else class="ringkasan-list">
                <li v-for="line in usageSummaryLines" :key="line.breakdownId" class="ringkasan-item">
                  <span class="ringkasan-name">{{ line.name }}</span>
                  <span class="ringkasan-qty">
                    dipakai {{ formatNumber(line.useAmount) }} {{ unitLabel }}
                  </span>
                </li>
              </ul>
            </div>
          </section>

          <section class="summary-band" :class="{ 'summary-band--bad': stockExceeded || anySubItemExceeded }">
            <p v-if="anySubItemExceeded" class="stock-alert">
              Pemakaian salah satu sub-item melebihi stok sub-item yang tersedia.
            </p>
            <p v-else-if="stockExceeded" class="stock-alert">Jumlah pemakaian melebihi stok yang tersedia</p>
            <div class="summary-grid">
              <div>
                <p class="sk">Total Pemakaian</p>
                <p class="sv" :class="{ 'sv-bad': stockExceeded || anySubItemExceeded }">{{ formatNumber(totalUsage) }}</p>
              </div>
              <div>
                <p class="sk">Quantity Tersisa</p>
                <p class="sv sv-teal">{{ formatNumber(stockQty) }}</p>
              </div>
              <div>
                <p class="sk">Sisa Setelah Pemakaian</p>
                <p class="sv" :class="stockQty - totalUsage < 0 ? 'sv-bad' : 'sv-teal'">
                  {{ formatNumber(Math.max(0, stockQty - totalUsage)) }}
                </p>
              </div>
            </div>
          </section>

          <div class="actions">
            <button type="button" class="btn-outline" :disabled="submitting" @click="goDetail">Batal</button>
            <button type="button" class="btn-primary" :disabled="!canSubmit || submitting" @click="onSubmit">
              {{ submitting ? 'Menyimpan...' : 'Simpan' }}
            </button>
          </div>
          <p v-if="submittedAttempt && !canSubmit && !stockExceeded" class="form-hint">
            Isi tujuan pemakaian dan alokasikan minimal satu sub-item (jumlah &gt; 0).
          </p>
        </template>
      </template>
    </main>
  </div>
</template>

<style scoped>
.layout {
  display: flex;
  min-height: 100vh;
  background: #f5f5f5;
  font-family: 'Manrope', system-ui, sans-serif;
}
.content {
  flex: 1;
  min-width: 0;
  width: 100%;
  overflow-y: auto;
  padding: 40px 32px;
  max-width: 900px;
}
.breadcrumb {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  margin-bottom: 16px;
}
.crumb-link {
  background: none;
  border: none;
  padding: 0;
  color: #00c6ac;
  cursor: pointer;
  font-size: 13px;
}
.crumb-current {
  color: #525252;
}
.page-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 20px;
}
.page-title {
  margin: 0;
  font-size: 28px;
  font-weight: 600;
  color: #171717;
  font-family: 'Poppins', system-ui, sans-serif;
}
.page-sub {
  margin: 6px 0 0;
  font-size: 14px;
  color: #737373;
}
.btn-back {
  height: 40px;
  padding: 0 14px;
  border-radius: 8px;
  border: 2px solid #e5e5e5;
  background: #fff;
  color: #404040;
  font-weight: 700;
  font-size: 13px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.card {
  background: #fff;
  border: 1px solid #e5e5e5;
  border-radius: 10px;
  padding: 20px 22px;
  margin-bottom: 14px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  min-width: 0;
  box-sizing: border-box;
}
.card-warn {
  border-color: #fde68a;
  background: #fffbeb;
}
.card-summary {
  padding: 22px;
}
.summary-inner {
  display: flex;
  gap: 18px;
  align-items: flex-start;
}
.thumb {
  width: 88px;
  height: 88px;
  border-radius: 8px;
  border: 1px solid #e5e5e5;
  background: #f5f5f5;
  overflow: hidden;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.thumb-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.summary-main {
  flex: 1;
  min-width: 0;
}
.summary-top {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
}
.k {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #a1a1a1;
  font-weight: 600;
  margin: 0 0 4px;
}
.k-teal {
  color: #00a896;
}
.item-name {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #171717;
  font-family: 'Poppins', system-ui, sans-serif;
}
.sub {
  margin: 4px 0 0;
  font-size: 13px;
  color: #737373;
}
.qty-box {
  border: 1px solid rgba(0, 198, 172, 0.25);
  background: #e6faf7;
  border-radius: 10px;
  padding: 10px 16px;
  text-align: center;
  min-width: 140px;
}
.qty-line {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 6px;
}
.qty-num {
  font-size: 34px;
  font-weight: 600;
  color: #00c6ac;
  font-family: 'Poppins', system-ui, sans-serif;
  line-height: 1;
}
.qty-unit {
  font-size: 14px;
  font-weight: 600;
  color: #00a896;
  margin-bottom: 4px;
}
.meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 24px 32px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
}
.v {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: #404040;
}
.field-label {
  display: block;
  font-weight: 700;
  font-size: 14px;
  color: #171717;
  margin-bottom: 4px;
}
.req {
  color: #ff303e;
  margin-left: 2px;
}
.hint {
  margin: 0 0 10px;
  font-size: 12px;
  color: #a1a1a1;
}
.muted {
  margin: 0 0 16px;
  font-size: 14px;
  color: #525252;
  line-height: 1.5;
}
.textarea {
  display: block;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
  border: 2px solid #e5e5e5;
  border-radius: 8px;
  padding: 12px 14px;
  font-size: 14px;
  resize: none;
  outline: none;
  font-family: inherit;
}
.textarea:focus {
  border-color: #00c6ac;
}
.textarea--err {
  border-color: #ff303e;
  background: #fff8f8;
}
.err-line {
  margin: 8px 0 0;
  font-size: 12px;
  color: #ff303e;
}
.card-h {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #171717;
  font-family: 'Poppins', system-ui, sans-serif;
}
.table-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding-bottom: 14px;
  border-bottom: 1px solid #f0f0f0;
  margin: -4px -4px 0;
}
.row-count {
  font-size: 12px;
  color: #a1a1a1;
}
.table-scroll {
  overflow-x: auto;
}
.table {
  width: 100%;
  border-collapse: collapse;
}
th,
td {
  padding: 12px 10px;
  border-bottom: 1px solid #f0f0f0;
  text-align: left;
  vertical-align: middle;
}
th {
  font-size: 11px;
  text-transform: uppercase;
  color: #737373;
  font-weight: 700;
  background: #fafafa;
}
.col-no {
  width: 44px;
}
.col-stock {
  width: 130px;
}
.col-amt {
  width: 220px;
}
.td-muted {
  color: #a1a1a1;
  font-size: 12px;
}
.td-stock {
  font-size: 13px;
  font-weight: 600;
  color: #404040;
}
.sub-name {
  font-size: 14px;
  font-weight: 600;
  color: #171717;
}
.inp {
  width: 100%;
  height: 38px;
  border: 2px solid #e5e5e5;
  border-radius: 8px;
  padding: 0 10px;
  font-size: 13px;
  outline: none;
}
.inp:focus {
  border-color: #00c6ac;
}
.inp--err {
  border-color: #ff303e;
  background: #fff8f8;
}
.inp-num {
  text-align: center;
  font-weight: 600;
  flex: 1;
  min-width: 0;
}
.amt-wrap {
  display: flex;
  align-items: center;
  gap: 4px;
}
.step-btn {
  width: 34px;
  height: 38px;
  border: 2px solid #e5e5e5;
  border-radius: 8px;
  background: #fff;
  color: #737373;
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
}
.step-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
.step-btn-plus:hover:not(:disabled) {
  border-color: #00c6ac;
  color: #00c6ac;
  background: #e6faf7;
}
.ringkasan-pemakaian {
  margin-top: 18px;
  padding-top: 16px;
  border-top: 1px dashed #d4d4d4;
}
.ringkasan-title {
  margin: 0 0 10px;
  font-size: 14px;
  font-weight: 700;
  color: #171717;
  font-family: 'Poppins', system-ui, sans-serif;
}
.ringkasan-empty {
  margin: 0;
  font-size: 13px;
  color: #737373;
}
.ringkasan-list {
  list-style: none;
  margin: 0;
  padding: 0;
}
.ringkasan-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 8px;
  background: #f8fffe;
  border: 1px solid rgba(0, 198, 172, 0.15);
  margin-bottom: 8px;
}
.ringkasan-item:last-child {
  margin-bottom: 0;
}
.ringkasan-name {
  font-weight: 600;
  font-size: 14px;
  color: #171717;
}
.ringkasan-qty {
  font-size: 13px;
  font-weight: 700;
  color: #00a896;
  white-space: nowrap;
}
.summary-band {
  border-radius: 10px;
  border: 1px solid rgba(0, 198, 172, 0.2);
  background: #f8fffe;
  padding: 18px 16px;
  margin-bottom: 18px;
}
.summary-band--bad {
  border-color: rgba(255, 48, 62, 0.25);
  background: #fff1f2;
}
.stock-alert {
  margin: 0 0 12px;
  padding: 10px 12px;
  background: #fff;
  border: 1px solid rgba(255, 48, 62, 0.2);
  border-radius: 8px;
  font-size: 13px;
  font-weight: 700;
  color: #ff303e;
}
.summary-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  text-align: center;
}
.sk {
  margin: 0 0 8px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  color: #737373;
}
.sv {
  margin: 0;
  font-size: 28px;
  font-weight: 600;
  font-family: 'Poppins', system-ui, sans-serif;
  color: #171717;
}
.sv-teal {
  color: #00c6ac;
}
.sv-bad {
  color: #ff303e;
}
.actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
.btn-outline {
  height: 44px;
  padding: 0 20px;
  border-radius: 8px;
  border: 2px solid #e5e5e5;
  background: #fff;
  color: #404040;
  font-weight: 700;
  cursor: pointer;
}
.btn-primary {
  height: 44px;
  padding: 0 22px;
  border-radius: 8px;
  border: none;
  background: #00c6ac;
  color: #fff;
  font-weight: 700;
  cursor: pointer;
}
.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.form-hint {
  text-align: right;
  font-size: 12px;
  color: #a1a1a1;
  margin-top: 8px;
}
.card-empty {
  text-align: center;
  padding: 48px 20px;
}
.empty-title {
  margin: 0 0 8px;
  font-family: 'Poppins', system-ui, sans-serif;
  font-size: 22px;
}
.empty-text {
  color: #525252;
  margin: 0 0 20px;
}
@media (max-width: 720px) {
  .summary-inner {
    flex-direction: column;
  }
  .summary-grid {
    grid-template-columns: 1fr;
  }
  .ringkasan-item {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
