<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useIncomeTransactionStore } from '@/stores/income-transaction.store'
import AsisSidebar from '@/components/AsisSidebar.vue'

const store = useIncomeTransactionStore()
const router = useRouter()

const startDate = ref<string>('')
const endDate = ref<string>('')
const category = ref<string>('')
const paymentMethod = ref<string>('')
const sourceType = ref<string>('')
const search = ref<string>('')

const categoryLabel: Record<string, string> = {
  DONASI: 'Donasi',
  ZAKAT: 'Zakat',
  INFAQ: 'Infaq',
  LAIN_LAIN: 'Lain-lain',
}

const paymentLabel: Record<string, string> = {
  CASH: 'Tunai',
  TRANSFER: 'Transfer Bank',
}

const sourceLabel: Record<string, string> = {
  INDIVIDU: 'Individu',
  KOMUNITAS: 'Komunitas',
  PERUSAHAAN: 'Perusahaan',
}

function labelOf(map: Record<string, string>, val: string) {
  return map[val] ?? val
}

async function fetchData(page = 0) {
  await store.fetchIncomeTransactions({
    startDate: startDate.value || undefined,
    endDate: endDate.value || undefined,
    category: category.value || undefined,
    paymentMethod: paymentMethod.value || undefined,
    sourceType: sourceType.value || undefined,
    search: search.value || undefined,
    page,
    size: store.size,
  })
}

function handleFilter() {
  fetchData(0)
}

function resetFilter() {
  startDate.value = ''
  endDate.value = ''
  category.value = ''
  paymentMethod.value = ''
  sourceType.value = ''
  search.value = ''
  fetchData(0)
}

function handlePageChange(newPage: number) {
  if (newPage < 0 || newPage >= store.totalPages) return
  fetchData(newPage)
}

const startItem = computed(() =>
  store.totalElements === 0 ? 0 : store.page * store.size + 1
)

const endItem = computed(() =>
  Math.min((store.page + 1) * store.size, store.totalElements)
)

const hasFilter = computed(
  () =>
    !!(
      startDate.value ||
      endDate.value ||
      category.value ||
      paymentMethod.value ||
      sourceType.value ||
      search.value
    )
)

onMounted(() => {
  fetchData()
})
</script>

<template>
  <div class="layout">
    <AsisSidebar />

    <main class="content">
      <header class="content-header">
        <h1 class="page-title">Daftar Transaksi Pemasukan</h1>
        <p class="page-subtitle">Kelola dan pantau seluruh dana masuk yayasan</p>
      </header>

      <!-- Filter Card -->
      <section class="card">
        <div class="filter-title">
          <svg class="filter-icon" width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 4h16" /><path d="M6 12h12" /><path d="M10 20h4" />
          </svg>
          <span>Filter Data</span>
        </div>

        <div class="filter-grid">
          <div class="field">
            <label>Tanggal Mulai</label>
            <input v-model="startDate" type="date" @change="handleFilter" />
          </div>
          <div class="field">
            <label>Tanggal Akhir</label>
            <input v-model="endDate" type="date" @change="handleFilter" />
          </div>
          <div class="field">
            <label>Kategori</label>
            <select v-model="category" @change="handleFilter">
              <option value="">Semua Kateogri</option>
              <option value="DONASI">Donasi</option>
              <option value="ZAKAT">Zakat</option>
              <option value="INFAQ">Infaq</option>
              <option value="LAIN_LAIN">Lain-lain</option>
            </select>
          </div>
          <div class="field">
            <label>Metode Pembayaran</label>
            <select v-model="paymentMethod" @change="handleFilter">
              <option value="">Semua Metode Pembayaran</option>
              <option value="CASH">Tunai</option>
              <option value="TRANSFER">Transfer Bank</option>
            </select>
          </div>
        </div>

        <div class="filter-bottom">
          <div class="search-wrap">
            <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              v-model="search"
              class="search-input"
              type="text"
              placeholder="Cari berdasarkan nama donatur, kategori, atau pencatat..."
              @input="handleFilter"
            />
          </div>
          <button v-if="hasFilter" type="button" class="secondary-btn" @click="resetFilter">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
            Reset Filter
          </button>
          <button type="button" class="primary-btn" @click="() => router.push('/income-transactions/create')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Tambah Pemasukan
          </button>
        </div>
      </section>

      <!-- Table Card -->
      <section class="table-card">
        <div class="table-wrapper">
          <table class="table">
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Kategori</th>
                <th>Sumber</th>
                <th>Metode</th>
                <th class="th-right">Nominal</th>
                <th>Pencatat</th>
                <th class="th-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <!-- Skeleton rows while loading -->
              <template v-if="store.loading">
                <tr v-for="n in store.size" :key="'skel-' + n" class="skeleton-row">
                  <td v-for="c in 7" :key="c"><div class="skeleton-cell" /></td>
                </tr>
              </template>

              <!-- Empty state -->
              <tr v-else-if="store.items.length === 0">
                <td colspan="7" class="empty-state">
                  <div class="empty-inner">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none"
                      stroke="#d4d4d4" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <path d="M3 9h18M9 21V9" />
                    </svg>
                    <p class="empty-title">Belum ada transaksi</p>
                    <p class="empty-sub">Belum ada transaksi pemasukan yang tercatat.</p>
                  </div>
                </td>
              </tr>

              <!-- Data rows -->
              <tr v-else v-for="item in store.items" :key="item.id">
                <td>{{ item.transactionDate }}</td>
                <td>{{ labelOf(categoryLabel, item.category) }}</td>
                <td>{{ labelOf(sourceLabel, item.sourceType) }}</td>
                <td>{{ labelOf(paymentLabel, item.paymentMethod) }}</td>
                <td class="td-amount">Rp {{ item.amount.toLocaleString('id-ID') }}</td>
                <td>{{ item.createdByUsername }}</td>
                <td class="actions-cell">
                  <!-- View -->
                  <button type="button" class="icon-btn"
                    title="Lihat Detail"
                    @click.stop="router.push(`/income-transactions/${item.id}`)">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </button>
                  <!-- Edit -->
                  <button type="button" class="icon-btn"
                    title="Edit"
                    @click.stop="router.push(`/income-transactions/${item.id}/edit`)">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                  <!-- Delete -->
                  <button type="button" class="icon-btn icon-btn--danger"
                    title="Hapus">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                      <path d="M10 11v6M14 11v6" />
                      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                    </svg>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <footer class="table-footer">
          <span class="page-info">
            Menampilkan {{ startItem }}-{{ endItem }} dari {{ store.totalElements }} transaksi
          </span>
          <div class="page-controls">
            <button
              type="button"
              class="page-btn"
              :disabled="store.page === 0"
              @click="handlePageChange(store.page - 1)"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2.5">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <button
              v-for="p in (store.totalPages || 1)"
              :key="p"
              type="button"
              class="page-btn"
              :class="{ 'page-active': p - 1 === store.page }"
              @click="handlePageChange(p - 1)"
            >
              {{ p }}
            </button>
            <button
              type="button"
              class="page-btn"
              :disabled="store.page + 1 >= store.totalPages"
              @click="handlePageChange(store.page + 1)"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2.5">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        </footer>
      </section>
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
  padding: 40px 32px;
}

.content > * {
  max-width: 1200px;
  margin-left: auto;
  margin-right: auto;
}

.content-header {
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

/*  Filter Card */
.card {
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

.filter-icon { color: #525252; }

.filter-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px 16px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

label {
  font-size: 12px;
  font-weight: 600;
  color: #525252;
  font-family: 'Manrope', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

input[type='text'],
input[type='date'],
select {
  height: 40px;
  border-radius: 8px;
  border: 1px solid #d4d4d4;
  padding: 8px 12px;
  font-size: 14px;
  color: #171717;
  font-family: 'Manrope', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background-color: #fff;
  transition: border-color 0.15s, box-shadow 0.15s;
  outline: none;
}

input[type='text']:focus,
input[type='date']:focus,
select:focus {
  border-color: #00c6ac;
  box-shadow: 0 0 0 1px #00c6ac;
}

.filter-bottom {
  display: flex;
  gap: 12px;
  align-items: center;
}

.search-wrap {
  position: relative;
  flex: 1;
}

.search-icon {
  position: absolute;
  left: 13px;
  top: 50%;
  transform: translateY(-50%);
  color: #a1a1a1;
  pointer-events: none;
}

.search-input {
  width: 100%;
  height: 40px;
  padding-left: 36px !important;
  box-sizing: border-box;
}

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

.secondary-btn:hover { background-color: #f5f5f5; }

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

.primary-btn:hover { background-color: #00b39c; }

/*  Table Card */
.table-card {
  background-color: #ffffff;
  border-radius: 12px;
  border: 1px solid #e5e5e5;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
  overflow: hidden;
  margin-bottom: 24px;
}

.table-wrapper {
  overflow-x: auto;
}

.table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}

.table thead {
  background-color: #fafafa;
}

.table th,
.table td {
  padding: 12px 16px;
  border-bottom: 1px solid #e5e5e5;
  text-align: left;
}

.table th {
  font-weight: 600;
  font-size: 12px;
  color: #525252;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.table tbody tr:last-child td { border-bottom: none; }
.table tbody tr:hover { background-color: #f0fdfb; transition: background-color 0.1s; }

.th-right  { text-align: right; }
.th-center { text-align: center; }
.td-amount { text-align: right; font-weight: 600; }

/*  Action icon buttons */
.actions-cell {
  text-align: center;
  white-space: nowrap;
}

.icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: none;
  background: none;
  border-radius: 6px;
  color: #a1a1a1;
  cursor: pointer;
  transition: background-color 0.15s, color 0.15s;
}

.icon-btn:hover {
  background-color: #f5f5f5;
  color: #525252;
}

.icon-btn--danger:hover {
  background-color: #fff1f0;
  color: #ef4444;
}

/*  Skeleton  */
.skeleton-row td { border-bottom: 1px solid #f0f0f0; }

.skeleton-cell {
  height: 16px;
  border-radius: 6px;
  background: linear-gradient(90deg, #e5e5e5 25%, #f0f0f0 50%, #e5e5e5 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
}

@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/*  Empty state */
.empty-state { border-bottom: none !important; }

.empty-inner {
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

/*  Pagination  */
.table-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-top: 1px solid #e5e5e5;
  font-size: 13px;
  color: #525252;
}

.page-info { color: #6b7280; font-size: 13px; }

.page-controls {
  display: flex;
  align-items: center;
  gap: 4px;
}

.page-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  height: 32px;
  padding: 0 4px;
  border-radius: 6px;
  border: 1px solid #e5e5e5;
  background-color: #ffffff;
  color: #525252;
  font-size: 13px;
  cursor: pointer;
  transition: background-color 0.15s, border-color 0.15s, color 0.15s;
}

.page-btn:hover:not(:disabled):not(.page-active) { background-color: #f5f5f5; }

.page-btn:disabled {
  opacity: 0.35;
  cursor: default;
}

.page-active {
  background-color: #00c6ac;
  border-color: #00c6ac;
  color: #ffffff;
  font-weight: 600;
}
</style>

