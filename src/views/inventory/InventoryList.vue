<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import AsisSidebar from '@/components/AsisSidebar.vue'
import { useInventoryStore } from '@/stores/inventory.store'

const router = useRouter()
const store = useInventoryStore()

const search = ref('')
const page = ref(0)
const limit = ref(10)

const isLoading = computed(() => store.loading)
const currentPage = computed(() => store.page + 1)
const totalPages = computed(() => Math.max(store.totalPages || 1, 1))
const hasPrev = computed(() => currentPage.value > 1)
const hasNext = computed(() => currentPage.value < totalPages.value)
const startItem = computed(() =>
  store.totalElements === 0 ? 0 : page.value * limit.value + 1,
)
const endItem = computed(() =>
  Math.min((page.value + 1) * limit.value, store.totalElements),
)
const pageNumbers = computed(() => Array.from({ length: totalPages.value }, (_, i) => i + 1))

function formatCategory(value?: string) {
  if (!value) return '-'
  return value
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function categoryClass(value?: string) {
  switch ((value || '').toUpperCase()) {
    case 'ASET':
      return 'cat cat-aset'
    case 'KEBUTUHAN_POKOK':
      return 'cat cat-kebutuhan'
    case 'PERLENGKAPAN_IBADAH':
      return 'cat cat-ibadah'
    case 'PENDIDIKAN':
      return 'cat cat-pendidikan'
    default:
      return 'cat'
  }
}

function goCreate() {
  router.push('/inventory/create')
}

function goDetail(id: string) {
  router.push(`/inventory/${id}`)
}

async function load(pageValue = 0) {
  page.value = pageValue
  try {
    await store.fetchInventoryItems({
      search: search.value || undefined,
      page: page.value,
      limit: limit.value,
    })
  } catch {
    // handled in store
  }
}

watch(
  () => search.value,
  () => {
    page.value = 0
    void load(0)
  },
)

function prevPage() {
  if (!hasPrev.value) return
  void load(page.value - 1)
}

function nextPage() {
  if (!hasNext.value) return
  void load(page.value + 1)
}

function goToPage(targetPage: number) {
  const next = targetPage - 1
  if (next < 0 || next >= totalPages.value || next === page.value) return
  void load(next)
}

void load(0)
</script>

<template>
  <div class="layout">
    <AsisSidebar />

    <main class="content">
      <header class="content-header">
        <div class="header-row">
          <div>
            <h1 class="page-title">Daftar Inventory</h1>
            <p class="page-sub">Pantau seluruh item donasi non tunai yang dimiliki yayasan.</p>
          </div>
        </div>
      </header>

      <div v-if="store.error" class="error-banner">
        <p>{{ store.error }}</p>
      </div>

      <section class="card">
        <div class="toolbar">
          <div class="search-wrap">
            <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              v-model="search"
              type="text"
              class="search-input"
              placeholder="Cari nama barang atau sumber donasi..."
            />
          </div>
          <button type="button" class="btn-primary" @click="goCreate">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Tambah Item
          </button>
        </div>

        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th class="col-no">No</th>
                <th>Nama Barang</th>
                <th>Kategori</th>
                <th>Quantity &amp; Satuan</th>
                <th>Sumber Donasi</th>
                <th class="col-action">Aksi</th>
              </tr>
            </thead>
            <tbody v-if="!isLoading && store.items.length > 0">
              <tr v-for="(row, index) in store.items" :key="row.id">
                <td class="cell-muted">{{ page * limit + index + 1 }}</td>
                <td>
                  <div class="name-cell">
                    <div class="thumb">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                        <polyline points="3.29 7 12 12 20.71 7" />
                      </svg>
                    </div>
                    <div>
                      <p class="cell-strong">{{ row.itemName }}</p>
                      <p class="subtext">Donasi Barang</p>
                    </div>
                  </div>
                </td>
                <td>
                  <span :class="categoryClass(row.category)">
                    {{ formatCategory(row.category) }}
                  </span>
                </td>
                <td>{{ row.quantity }} {{ row.unit }}</td>
                <td>{{ row.donorSource }}</td>
                <td>
                  <div class="actions">
                    <button type="button" class="icon-btn" title="Detail" @click="goDetail(row.id)">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    </button>
                    <button type="button" class="icon-btn" disabled title="Endpoint edit inventory belum tersedia">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    <button type="button" class="icon-btn" disabled title="Endpoint hapus inventory belum tersedia">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
            <tbody v-else-if="isLoading">
              <tr>
                <td colspan="6" class="empty">Memuat data...</td>
              </tr>
            </tbody>
            <tbody v-else>
              <tr>
                <td colspan="6" class="empty">Belum ada item inventory</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="pagination">
          <span class="pagination-info">
            Menampilkan {{ startItem }} - {{ endItem }} dari {{ store.totalElements }} item
          </span>
          <div class="pagination-actions">
            <button type="button" class="btn-page" :disabled="!hasPrev || isLoading" @click="prevPage">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <button
              v-for="p in pageNumbers"
              :key="p"
              type="button"
              class="btn-page btn-page--number"
              :class="{ 'is-active': p === currentPage }"
              :disabled="isLoading"
              @click="goToPage(p)"
            >
              {{ p }}
            </button>
            <button type="button" class="btn-page" :disabled="!hasNext || isLoading" @click="nextPage">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        </div>
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

.content-header {
  margin-bottom: 20px;
}

.header-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.page-title {
  font-size: 32px;
  font-weight: 600;
  margin: 0;
  color: #171717;
  font-family: 'Poppins', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
}

.page-sub {
  margin: 6px 0 0;
  font-size: 14px;
  color: #737373;
}

.error-banner {
  background-color: #fff1f2;
  border: 1px solid rgba(255, 48, 62, 0.2);
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 16px;
  font-size: 14px;
  color: #ff303e;
}

.error-banner p {
  margin: 0;
}

.card {
  background-color: #ffffff;
  border-radius: 10px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  border: 1px solid #e5e5e5;
}

.toolbar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  margin-bottom: 18px;
}

.search-wrap {
  position: relative;
  width: 100%;
  min-width: 0;
  max-width: 1090px;
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #a3a3a3;
}

.search-input {
  height: 44px;
  border-radius: 8px;
  border: 2px solid #e5e5e5;
  padding: 0 14px 0 30px;
  font-size: 14px;
  width: 100%;
  min-width: 0;
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.search-input:focus {
  border-color: #00c6ac;
  box-shadow: none;
}

.table-wrap {
  overflow-x: auto;
}

.table {
  width: 100%;
  border-collapse: collapse;
}

th, td {
  padding: 13px 10px;
  border-bottom: 1px solid #f0f0f0;
  text-align: left;
  font-size: 14px;
  vertical-align: middle;
}

th {
  font-size: 12px;
  color: #737373;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  background: #f8f8f8;
}

.col-no {
  width: 56px;
}

.col-action {
  width: 140px;
  text-align: center;
}

.name-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}

.thumb {
  width: 34px;
  height: 34px;
  border-radius: 6px;
  border: 1px solid #ececec;
  background: #f9fafb;
  color: #b3b3b3;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.subtext {
  margin: 2px 0 0;
  font-size: 12px;
  color: #a1a1a1;
}

.cat {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
  color: #525252;
  background: #f5f5f5;
}

.cat-aset {
  color: #3f51b5;
  background: #eef2ff;
}

.cat-kebutuhan {
  color: #ea580c;
  background: #fff7ed;
}

.cat-ibadah {
  color: #0f766e;
  background: #f0fdfa;
}

.cat-pendidikan {
  color: #0369a1;
  background: #f0f9ff;
}

.cell-strong {
  margin: 0;
  font-weight: 600;
  color: #171717;
}

.cell-muted {
  color: #737373;
  font-size: 13px;
}

.actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
}

.icon-btn {
  width: 34px;
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: #737373;
  cursor: pointer;
  transition: background-color 0.15s, color 0.15s;
}

.icon-btn:hover:not(:disabled) {
  color: #00c6ac;
  background: #e6faf7;
}

.icon-btn:disabled {
  color: #a3a3a3;
  background: transparent;
  cursor: not-allowed;
  opacity: 0.6;
}

.empty {
  padding: 18px 10px;
  text-align: center;
  color: #737373;
}

.pagination {
  margin-top: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.pagination-info {
  color: #737373;
  font-size: 13px;
}

.pagination-actions {
  display: flex;
  gap: 8px;
}

.btn-page {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  border: 1px solid #d4d4d4;
  background: #fff;
  color: #171717;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.btn-page:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-page--number {
  background: #fff;
}

.btn-page--number.is-active {
  background: #00c6ac;
  border-color: #00c6ac;
  color: #fff;
}

.btn-primary {
  height: 44px;
  padding: 0 18px;
  border-radius: 10px;
  border: none;
  background-color: #00c6ac;
  color: #ffffff;
  font-size: 14px;
  font-weight: 700;
  font-family: 'Manrope', system-ui, sans-serif;
  cursor: pointer;
  transition: background-color 0.15s;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  white-space: nowrap;
}

.btn-primary:hover {
  background-color: #00b39c;
}

@media (max-width: 900px) {
  .toolbar {
    grid-template-columns: 1fr;
  }

  .btn-primary {
    width: 100%;
  }
}
</style>

