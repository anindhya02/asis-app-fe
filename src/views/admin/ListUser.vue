<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useUserStore } from '@/stores/user.store'
import type { User } from '@/interfaces/user.interface'
import AsisSidebar from '@/components/AsisSidebar.vue'
import CreateUser from '@/views/admin/CreateUser.vue'
import ViewUser from '@/views/admin/ViewUser.vue'
import EditUser from '@/views/admin/EditUser.vue'
import DeactivateUserConfirmModal from '@/components/DeactivateUserConfirmModal.vue'

const userStore = useUserStore()

const searchQuery = ref('')
const selectedRole = ref('')
const selectedStatus = ref('')
const currentPage = ref(1)
const ITEMS_PER_PAGE = 5

// Modal state
const showCreateModal = ref(false)
const showViewModal = ref(false)
const showEditModal = ref(false)
const showDeactivateModal = ref(false)
const deactivatingUser = ref<User | null>(null)
const isDeactivating = ref(false)
const selectedUser = ref<User | null>(null)

onMounted(async () => {
  await userStore.fetchUsers()
})

const existingUsernames = computed(() =>
  userStore.users.map((u) => u.username.toLowerCase())
)

const filteredUsers = computed(() =>
  userStore.users.filter((u) => {
    const q = searchQuery.value.toLowerCase()
    const matchName = u.nama.toLowerCase().includes(q)
    const matchUsername = u.username.toLowerCase().includes(q)
    const matchRole = selectedRole.value
      ? u.role?.toLowerCase() === selectedRole.value.toLowerCase()
      : true
    const matchStatus = selectedStatus.value
      ? u.status?.toLowerCase() === selectedStatus.value.toLowerCase()
      : true
    return (matchName || matchUsername) && matchRole && matchStatus
  })
)

const totalPages = computed(() => Math.max(1, Math.ceil(filteredUsers.value.length / ITEMS_PER_PAGE)))

const paginatedUsers = computed(() =>
  filteredUsers.value.slice(
    (currentPage.value - 1) * ITEMS_PER_PAGE,
    currentPage.value * ITEMS_PER_PAGE
  )
)

const startItem = computed(() =>
  filteredUsers.value.length === 0 ? 0 : (currentPage.value - 1) * ITEMS_PER_PAGE + 1
)
const endItem = computed(() =>
  Math.min(currentPage.value * ITEMS_PER_PAGE, filteredUsers.value.length)
)

watch([searchQuery, selectedRole, selectedStatus], () => {
  currentPage.value = 1
})

function roleBadgeClass(role: string) {
  const map: Record<string, string> = {
    'KETUA YAYASAN': 'badge-ketua',
    'Ketua Yayasan': 'badge-ketua',
    'PENGURUS': 'badge-pengurus',
    'Pengurus': 'badge-pengurus',
    'DONATUR': 'badge-donatur',
    'Donatur': 'badge-donatur',
    'ADMIN': 'badge-admin',
    'Admin': 'badge-admin',
  }
  return map[role] ?? 'badge-default'
}

function resetFilters() {
  searchQuery.value = ''
  selectedRole.value = ''
  selectedStatus.value = ''
  currentPage.value = 1
}

// View detail
function openView(user: User) {
  selectedUser.value = user
  showViewModal.value = true
}

function closeView() {
  showViewModal.value = false
  selectedUser.value = null
}

function openEdit(user: User) {
  selectedUser.value = user
  showEditModal.value = true
}

function closeEdit() {
  showEditModal.value = false
  selectedUser.value = null
}

function openDeactivateConfirm(user: User) {
  deactivatingUser.value = user
  showDeactivateModal.value = true
}

function closeDeactivateConfirm() {
  showDeactivateModal.value = false
  deactivatingUser.value = null
}

async function deactivateUser() {
  if (!deactivatingUser.value) return

  isDeactivating.value = true
  try {
    await userStore.deactivateUser(deactivatingUser.value.userId)
    closeDeactivateConfirm()
  } catch (error) {
    console.error('Gagal menonaktifkan user', error)
  } finally {
    isDeactivating.value = false
  }
}

// After create
async function onUserSaved() {
  await userStore.fetchUsers()
}
</script>

<template>
  <div class="layout">
    <AsisSidebar />

    <main class="content">
      <header class="content-header">
        <h1 class="page-title">Mengelola Pengguna</h1>
        <p class="page-subtitle">Kelola akun admin, pengurus, ketua yayasan, dan donatur</p>
      </header>

      <section class="card">
        <div class="filter-title">
          <svg class="filter-icon" width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 4h16" /><path d="M6 12h12" /><path d="M10 20h4" />
          </svg>
          <span>Filter Data</span>
        </div>

        <div class="filter-bottom">
          <div class="search-wrap">
            <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input v-model="searchQuery" type="text" placeholder="Cari nama atau username..." class="search-input" />
          </div>

          <div class="select-wrap">
            <select v-model="selectedRole" class="filter-select">
              <option value="">Semua Role</option>
              <option value="Ketua Yayasan">Ketua Yayasan</option>
              <option value="Pengurus">Pengurus</option>
              <option value="Donatur">Donatur</option>
              <option value="Admin">Admin</option>
            </select>
            <svg class="chevron" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
          </div>

          <div class="select-wrap">
            <select v-model="selectedStatus" class="filter-select">
              <option value="">Semua Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
            <svg class="chevron" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
          </div>

          <button type="button" class="secondary-btn" @click="resetFilters">
            Reset Filter
          </button>
          <button type="button" class="primary-btn" @click="showCreateModal = true">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Tambah User
          </button>
        </div>
      </section>

      <section class="table-card">
        <div v-if="userStore.loading" class="state-box">
          <div class="spinner" />
          Memuat data pengguna...
        </div>

        <div v-else class="table-wrapper">
          <table class="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Username</th>
                <th>Role</th>
                <th>Status</th>
                <th>Created At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="filteredUsers.length === 0">
                <td colspan="6" class="empty-cell">Tidak ada data pengguna.</td>
              </tr>
              <tr v-for="user in paginatedUsers" :key="user.userId">
                <td class="td-name">{{ user.nama }}</td>
                <td class="td-muted">{{ user.username }}</td>
                <td>
                  <span class="badge" :class="roleBadgeClass(user.role)">{{ user.role }}</span>
                </td>
                <td>
                  <span class="status-pill" :class="user.status === 'ACTIVE' ? 'status-active' : 'status-inactive'">
                    {{ user.status }}
                  </span>
                </td>
                <td class="td-muted">{{ user.createdDate?.slice(0, 10) }}</td>
                <td>
                  <div class="action-group">
                    <!-- View — klik ini buka modal detail -->
                    <button class="action-btn" title="Lihat detail" @click="openView(user)">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                      </svg>
                    </button>
                    <!-- Edit -->
                    <button
                      class="action-btn"
                      title="Ubah password"
                      :disabled="user.status?.toUpperCase() === 'INACTIVE'"
                      @click="openEdit(user)"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                    <!-- Deactivate -->
                    <button
                      class="action-btn"
                      title="Nonaktifkan"
                      :disabled="user.status?.toUpperCase() === 'INACTIVE'"
                      @click="openDeactivateConfirm(user)"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                        <line x1="17" y1="8" x2="23" y2="14"/><line x1="23" y1="8" x2="17" y2="14"/>
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <footer class="pagination">
            <span class="page-info">
              Menampilkan {{ startItem }}-{{ endItem }} dari {{ filteredUsers.length }} pengguna
            </span>
            <div class="page-controls">
              <button class="page-btn" :disabled="currentPage === 1" @click="currentPage--">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <button
                v-for="p in totalPages" :key="p"
                class="page-btn" :class="{ 'page-active': p === currentPage }"
                @click="currentPage = p"
              >{{ p }}</button>
              <button class="page-btn" :disabled="currentPage === totalPages" @click="currentPage++">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </div>
        </footer>
      </section>
    </main>

    <!-- ── Modals ── -->
    <CreateUser
      :isOpen="showCreateModal"
      :existingUsernames="existingUsernames"
      @close="showCreateModal = false"
      @saved="onUserSaved"
    />

    <ViewUser
      :isOpen="showViewModal"
      :user="selectedUser"
      @close="closeView"
    />

    <EditUser
      :isOpen="showEditModal"
      :user="selectedUser"
      @close="closeEdit"
      @saved="onUserSaved"
    />

    <DeactivateUserConfirmModal
      :isOpen="showDeactivateModal"
      :loading="isDeactivating"
      @cancel="closeDeactivateConfirm"
      @confirm="deactivateUser"
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

.filter-icon {
  color: #525252;
}

.filter-bottom {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}

.search-wrap {
  position: relative;
  flex: 1;
  min-width: 200px;
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
  padding: 0 14px 0 38px;
  border-radius: 8px;
  border: 1px solid #d4d4d4;
  background-color: #fff;
  font-family: inherit;
  font-size: 14px;
  color: #171717;
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.search-input::placeholder {
  color: #a1a1a1;
}

.search-input:focus {
  border-color: #00c6ac;
  box-shadow: 0 0 0 1px #00c6ac;
}

.select-wrap {
  position: relative;
}

.filter-select {
  height: 40px;
  padding: 0 32px 0 12px;
  border-radius: 8px;
  border: 1px solid #d4d4d4;
  background-color: #fff;
  font-family: inherit;
  font-size: 14px;
  color: #171717;
  appearance: none;
  cursor: pointer;
  outline: none;
  min-width: 140px;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.filter-select:focus {
  border-color: #00c6ac;
  box-shadow: 0 0 0 1px #00c6ac;
}

.chevron {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: #a1a1a1;
  pointer-events: none;
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
  font-family: inherit;
  cursor: pointer;
  transition: background-color 0.15s;
  white-space: nowrap;
}

.secondary-btn:hover {
  background-color: #f5f5f5;
}

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
  font-family: inherit;
  cursor: pointer;
  transition: background-color 0.15s;
  white-space: nowrap;
}

.primary-btn:hover {
  background-color: #00b39c;
}

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
  vertical-align: middle;
}

.table th {
  font-weight: 600;
  font-size: 12px;
  color: #525252;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.table tbody tr:last-child td {
  border-bottom: none;
}

.table tbody tr:hover {
  background-color: #f0fdfb;
  transition: background-color 0.1s;
}

.td-name {
  font-weight: 500;
  color: #171717;
}

.td-muted {
  color: #525252;
}

.empty-cell {
  text-align: center;
  color: #a1a1a1;
  padding: 3rem !important;
}

.badge { display: inline-block; padding: 3px 12px; border-radius: 8px; font-size: 0.78rem; font-weight: 500; border: 1px solid transparent; }
.badge-ketua    { background:rgb(250, 226, 244); color:rgb(159, 11, 92); border-color:rgb(234, 188, 220); }
.badge-pengurus { background: #e0f2fe; color: #075985; border-color: #bae6fd; }
.badge-donatur  { background: #f3e8ff; color: #6b21a8; border-color: #e9d5ff; }
.badge-admin    { background: #ffedd5; color: #9a3412; border-color: #fed7aa; }
.badge-default  { background: #d0f0ea; color: #006B5A; border-color: #a3ddd4; }

.status-pill { display: inline-block; padding: 3px 14px; border-radius: 8px; font-size: 0.78rem; font-weight: 500; border: 1px solid transparent; }
.status-active { background: #d0f0ea !important; color: #006B5A !important; border-color: #a3ddd4 !important; }
.status-inactive { background: #f3f4f6; color: #6b7280; border-color: #e5e7eb; }

.action-group { display: flex; gap: 6px; }
.action-btn {
  width: 32px; height: 32px; border-radius: 8px;
  border: 1.5px solid #e5e7eb; background: #fff; color: #9ca3af;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: border-color 0.15s, color 0.15s, background 0.15s;
}
.action-btn:hover:not(:disabled) { border-color: #00C6AC; color: #00C6AC; background: #f0fdfb; }
.action-btn:disabled { opacity: 0.35; cursor: not-allowed; }

.pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-top: 1px solid #e5e5e5;
}

.page-info {
  font-size: 13px;
  color: #737373;
}

.page-controls {
  display: flex;
  gap: 4px;
  align-items: center;
}

.page-btn {
  min-width: 34px;
  height: 34px;
  padding: 0 6px;
  border-radius: 8px;
  border: 1px solid #d4d4d4;
  background: #fff;
  color: #525252;
  font-size: 13px;
  font-family: inherit;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}

.page-btn:hover:not(:disabled):not(.page-active) {
  background: #f5f5f5;
}

.page-btn.page-active {
  background: #00c6ac;
  border-color: #00c6ac;
  color: #fff;
  font-weight: 600;
}

.page-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.state-box {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 3rem;
  color: #737373;
  font-size: 14px;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2.5px solid #e5e7eb;
  border-top-color: #00c6ac;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>