<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useUserStore } from '@/stores/user.store'
import { useAuthStore } from '@/stores/auth.store'
import { useRouter } from 'vue-router'
import type { User } from '@/interfaces/user.interface'
import CreateUser from './CreateUser.vue'
import ViewUser from './ViewUser.vue'

const userStore = useUserStore()
const authStore = useAuthStore()
const router = useRouter()

const searchQuery = ref('')
const selectedRole = ref('')
const selectedStatus = ref('')
const currentPage = ref(1)
const ITEMS_PER_PAGE = 5

// Modal state
const showCreateModal = ref(false)
const showViewModal = ref(false)
const selectedUser = ref<User | null>(null)

onMounted(async () => {
  await userStore.fetchUsers()
})

const existingUsernames = computed(() =>
  userStore.users.map((u) => u.username.toLowerCase())
)

const filteredUsers = computed(() =>
  userStore.users.filter((u) => {
    const matchName = u.nama.toLowerCase().includes(searchQuery.value.toLowerCase())
    const matchRole = selectedRole.value ? u.role === selectedRole.value : true
    const matchStatus = selectedStatus.value ? u.status === selectedStatus.value : true
    return matchName && matchRole && matchStatus
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
    'Ketua Yayasan': 'badge-ketua',
    'Pengurus': 'badge-pengurus',
    'Donatur': 'badge-donatur',
    'Admin': 'badge-admin',
  }
  return map[role] ?? 'badge-default'
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

// After create
async function onUserSaved() {
  await userStore.fetchUsers()
}

function handleLogout() {
  authStore.logout()
  router.push('/auth/login')
}
</script>

<template>
  <div class="layout">
    <!-- ── SIDEBAR ── -->
    <aside class="sidebar">
      <div class="sidebar-logo">
        <span class="logo-text">ASIS</span>
      </div>

      <nav class="sidebar-nav">
        <button class="nav-item active">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          User Management
        </button>
      </nav>

      <div class="sidebar-footer">
        <div class="user-info">
          <div class="user-avatar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
          <div class="user-meta">
            <span class="user-name">Admin</span>
            <span class="user-role-label">Administrator</span>
          </div>
        </div>
        <button class="logout-btn" @click="handleLogout" title="Logout">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
        </button>
      </div>
    </aside>

    <!-- ── MAIN ── -->
    <main class="main">
      <div class="content">
        <h1 class="page-title">Mengelola Pengguna</h1>

        <!-- Toolbar -->
        <div class="toolbar">
          <div class="search-wrap">
            <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input v-model="searchQuery" type="text" placeholder="Search by name..." class="search-input" />
          </div>

          <div class="select-wrap">
            <select v-model="selectedRole" class="filter-select">
              <option value="">Roles</option>
              <option value="Ketua Yayasan">Ketua Yayasan</option>
              <option value="Pengurus">Pengurus</option>
              <option value="Donatur">Donatur</option>
              <option value="Admin">Admin</option>
            </select>
            <svg class="chevron" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
          </div>

          <div class="select-wrap">
            <select v-model="selectedStatus" class="filter-select">
              <option value="">Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
            <svg class="chevron" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
          </div>

          <button class="btn-add" @click="showCreateModal = true">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Tambah User
          </button>
        </div>

        <!-- Table -->
        <div class="table-card">
          <div v-if="userStore.loading" class="state-box">
            <div class="spinner" />
            Memuat data pengguna...
          </div>

          <table v-else class="table">
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
                  <span class="status-pill" :class="user.status === 'Active' ? 'status-active' : 'status-inactive'">
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
                    <button class="action-btn" title="Edit">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                    <!-- Deactivate -->
                    <button class="action-btn" title="Nonaktifkan" :disabled="user.status === 'Inactive'">
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

          <!-- Pagination -->
          <div class="pagination">
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
          </div>
        </div>
      </div>
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
  </div>
</template>

<style scoped>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

.layout {
  display: flex; height: 100vh;
  font-family: 'Segoe UI', system-ui, sans-serif;
  background: #f5f6f7; color: #111827;
}

.sidebar {
  width: 272px; min-width: 272px;
  background: #fff; border-right: 1px solid #ebebeb;
  display: flex; flex-direction: column;
}
.sidebar-logo { padding: 28px 24px 16px; }
.logo-text {
  font-size: 2rem; font-weight: 800; letter-spacing: 0.1em;
  background: linear-gradient(135deg, #00C6AC 0%, #009e89 100%);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
}
.sidebar-nav { flex: 1; padding: 4px 16px; }
.nav-item {
  display: flex; align-items: center; gap: 10px;
  width: 100%; padding: 12px 16px; border-radius: 10px;
  border: none; font-family: inherit; font-size: 0.875rem;
  font-weight: 500; color: #6b7280; background: transparent;
  cursor: pointer; text-align: left; transition: background 0.15s, color 0.15s;
}
.nav-item:hover { background: #f0fdfb; color: #00C6AC; }
.nav-item.active { background: #00C6AC; color: #fff; font-weight: 600; }

.sidebar-footer { border-top: 1px solid #f0f0f0; padding: 16px; display: flex; align-items: center; gap: 10px; }
.user-info { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0; }
.user-avatar {
  width: 36px; height: 36px; border-radius: 50%;
  background: #f0fdfb; border: 1.5px solid #d0f0ea;
  display: flex; align-items: center; justify-content: center; color: #00C6AC; flex-shrink: 0;
}
.user-meta { display: flex; flex-direction: column; }
.user-name { font-size: 0.85rem; font-weight: 600; color: #111827; }
.user-role-label { font-size: 0.72rem; color: #9ca3af; }
.logout-btn {
  width: 34px; height: 34px; border-radius: 8px; background: #fff0ee;
  border: none; color: #ef4444; display: flex; align-items: center; justify-content: center;
  cursor: pointer; flex-shrink: 0; transition: background 0.15s;
}
.logout-btn:hover { background: #fee2e2; }

.main { flex: 1; overflow-y: auto; background: #f5f6f7; }
.content { max-width: 1060px; margin: 0 auto; padding: 40px 36px; }
.page-title { font-size: 2.1rem; font-weight: 700; color: #111827; margin-bottom: 24px; letter-spacing: -0.02em; }

.toolbar {
  display: flex; align-items: center; gap: 10px;
  background: #fff; border-radius: 14px; padding: 14px 18px;
  margin-bottom: 18px; box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}
.search-wrap { position: relative; flex: 1; }
.search-icon { position: absolute; left: 13px; top: 50%; transform: translateY(-50%); color: #9ca3af; pointer-events: none; }
.search-input {
  width: 100%; height: 44px; padding: 0 14px 0 38px;
  border-radius: 10px; border: 1.5px solid #e5e7eb; background: #fafafa;
  font-family: inherit; font-size: 0.875rem; color: #111827; outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.search-input::placeholder { color: #c2c8ce; }
.search-input:focus { border-color: #00C6AC; background: #fff; box-shadow: 0 0 0 3px rgba(0,198,172,0.1); }

.select-wrap { position: relative; }
.filter-select {
  height: 44px; padding: 0 32px 0 14px; border-radius: 10px;
  border: 1.5px solid #e5e7eb; background: #fafafa;
  font-family: inherit; font-size: 0.875rem; color: #374151;
  appearance: none; cursor: pointer; outline: none; min-width: 108px; transition: border-color 0.2s;
}
.filter-select:focus { border-color: #00C6AC; }
.chevron { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); color: #9ca3af; pointer-events: none; }

.btn-add {
  display: flex; align-items: center; gap: 6px;
  height: 44px; padding: 0 18px; border-radius: 10px;
  border: none; background: #00C6AC; color: #fff;
  font-family: inherit; font-size: 0.875rem; font-weight: 600;
  cursor: pointer; white-space: nowrap;
  box-shadow: 0 4px 12px rgba(0,198,172,0.28);
  transition: background 0.2s, transform 0.1s;
}
.btn-add:hover { background: #00b39c; transform: translateY(-1px); }

.table-card { background: #fff; border-radius: 14px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); overflow: hidden; }
.table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
.table thead tr { border-bottom: 1px solid #f0f0f0; }
.table th { padding: 13px 20px; text-align: left; font-size: 0.78rem; font-weight: 600; color: #6b7280; background: #fafafa; }
.table tbody tr { border-bottom: 1px solid #f5f5f5; transition: background 0.12s; }
.table tbody tr:last-child { border-bottom: none; }
.table tbody tr:hover { background: #f0fdfb; }
.table td { padding: 15px 20px; vertical-align: middle; }
.td-name { font-weight: 500; color: #111827; }
.td-muted { color: #6b7280; }
.empty-cell { text-align: center; color: #9ca3af; padding: 3rem !important; }

.badge { display: inline-block; padding: 3px 12px; border-radius: 8px; font-size: 0.78rem; font-weight: 500; border: 1px solid transparent; }
.badge-ketua    { background: #d1fae5; color: #065f46; border-color: #a7f3d0; }
.badge-pengurus { background: #f1f5f9; color: #475569; border-color: #e2e8f0; }
.badge-donatur  { background: #f1f5f9; color: #475569; border-color: #e2e8f0; }
.badge-admin    { background: #d1fae5; color: #065f46; border-color: #a7f3d0; }
.badge-default  { background: #f3f4f6; color: #6b7280; }

.status-pill { display: inline-block; padding: 3px 14px; border-radius: 8px; font-size: 0.78rem; font-weight: 500; border: 1px solid transparent; }
.status-active   { background: #d1fae5; color: #065f46; border-color: #a7f3d0; }
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

.pagination { display: flex; align-items: center; justify-content: space-between; padding: 14px 20px; border-top: 1px solid #f0f0f0; }
.page-info { font-size: 0.78rem; color: #9ca3af; }
.page-controls { display: flex; gap: 4px; align-items: center; }
.page-btn {
  min-width: 34px; height: 34px; padding: 0 6px; border-radius: 8px;
  border: 1.5px solid #e5e7eb; background: #fff; color: #374151;
  font-size: 0.82rem; font-family: inherit; font-weight: 500;
  cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.15s;
}
.page-btn:hover:not(:disabled):not(.page-active) { background: #f9fafb; }
.page-btn.page-active { background: #00C6AC; border-color: #00C6AC; color: #fff; font-weight: 600; }
.page-btn:disabled { opacity: 0.4; cursor: not-allowed; }

.state-box { display: flex; align-items: center; justify-content: center; gap: 10px; padding: 3rem; color: #9ca3af; font-size: 0.875rem; }
.spinner { width: 20px; height: 20px; border: 2.5px solid #e5e7eb; border-top-color: #00C6AC; border-radius: 50%; animation: spin 0.7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>