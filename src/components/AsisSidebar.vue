<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import { getCurrentUser } from '@/lib/auth'
import LogoutConfirmModal from '@/components/LogoutConfirmModal.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const currentUser = computed(() => {
  return authStore.user ?? getCurrentUser()
})

const displayName = computed(() => currentUser.value?.nama ?? currentUser.value?.username ?? 'Pengguna')
const roleUpper = computed(() => (currentUser.value?.role || '').toUpperCase())
const displayRole = computed(() => currentUser.value?.role ?? '')
const isAdmin = computed(() => roleUpper.value === 'ADMIN')
const isPengurus = computed(() => roleUpper.value === 'PENGURUS')

function go(path: string) {
  router.push(path)
}

function isActive(startWith: string) {
  return route.path.startsWith(startWith)
}

// ── Logout dengan konfirmasi ──
const showLogoutModal = ref(false)

function requestLogout() {
  showLogoutModal.value = true
}

async function confirmLogout() {
  showLogoutModal.value = false
  await authStore.logout()
  router.push('/auth/login')
}

function cancelLogout() {
  showLogoutModal.value = false
}
</script>

<template>
  <aside class="sidebar">
    <div>
      <div class="sidebar-logo">
        <span class="logo-text">ASIS</span>
      </div>

      <nav class="sidebar-nav">
        <!-- Menu untuk Pengurus -->
        <template v-if="isPengurus">
          <button
            type="button"
            class="nav-item"
            :class="{ 'nav-item--active': isActive('/income-transactions') }"
            @click="go('/income-transactions')"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="8 12 12 16 16 12" />
              <line x1="12" y1="8" x2="12" y2="16" />
            </svg>
            <span>Transaksi Kas Masuk</span>
          </button>

          <button
            type="button"
            class="nav-item"
            :class="{ 'nav-item--active': isActive('/expense-transactions') }"
            @click="go('/expense-transactions')"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="16 12 12 8 8 12" />
              <line x1="12" y1="16" x2="12" y2="8" />
            </svg>
            <span>Transaksi Kas Keluar</span>
          </button>

          <button
            type="button"
            class="nav-item"
            :class="{ 'nav-item--active': isActive('/payment-requests') }"
            @click="go('/payment-requests')"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
            <span>Pengajuan Dana</span>
          </button>

          <button
            type="button"
            class="nav-item"
            :class="{ 'nav-item--active': isActive('/activities') }"
            @click="go('/activities')"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a4 4 0 0 1-4 4z" />
              <path d="M8 2v16" />
              <line x1="12" y1="7" x2="18" y2="7" />
              <line x1="12" y1="11" x2="18" y2="11" />
              <line x1="12" y1="15" x2="18" y2="15" />
            </svg>
            <span>Postingan Kegiatan</span>
          </button>

          <button type="button" class="nav-item nav-item--disabled">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="7" height="9" />
              <rect x="14" y="3" width="7" height="5" />
              <rect x="14" y="12" width="7" height="9" />
              <rect x="3" y="16" width="7" height="5" />
            </svg>
            <span>Dashboard Operasional</span>
          </button>

          <button type="button" class="nav-item nav-item--disabled">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
              <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
              <line x1="9" y1="12" x2="15" y2="12" />
              <line x1="9" y1="16" x2="13" y2="16" />
            </svg>
            <span>Laporan Keuangan Periodik</span>
          </button>
        </template>

        <!-- Menu untuk Admin -->
        <button
          v-if="isAdmin"
          type="button"
          class="nav-item"
          :class="{ 'nav-item--active': isActive('/users') }"
          @click="go('/users')"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <span>User Management</span>
        </button>
      </nav>
    </div>

    <footer class="sidebar-footer">
      <div class="user-info">
        <div class="user-avatar">
          <span class="user-avatar-initials">{{ displayName.slice(0, 2).toUpperCase() }}</span>
        </div>
        <div class="user-meta">
          <span class="user-name">{{ displayName }}</span>
          <span class="user-role-label">{{ displayRole }}</span>
        </div>
      </div>
      <button
        type="button"
        class="logout-btn"
        title="Logout"
        @click="requestLogout"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
      </button>
    </footer>
  </aside>

  <!-- Modal konfirmasi logout -->
  <LogoutConfirmModal
    :isOpen="showLogoutModal"
    @confirm="confirmLogout"
    @cancel="cancelLogout"
  />
</template>

<style scoped>
.sidebar {
  width: 272px;
  min-width: 272px;
  background: #ffffff;
  border-right: 1px solid #ebebeb;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.sidebar-logo {
  padding: 28px 24px 16px;
}

.logo-text {
   font-family: 'Poppins', sans-serif !important;;
    font-weight: 700;
    font-size: clamp(2rem, 3.5vw, 52px);
    font-style: normal;
    line-height: 54px;
    background: linear-gradient(138.29deg, #EFEFEF 8.4%, #77DACD 39.72%, #146E61 81.36%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
}

.sidebar-nav {
  flex: 1;
  padding: 4px 16px 16px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 12px 16px;
  border-radius: 10px;
  border: none;
  font-family: inherit;
  font-size: 0.875rem;
  font-weight: 500;
  color: #6b7280;
  background: transparent;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s, color 0.15s;
}

.nav-item:hover {
  background: #f0fdfb;
  color: #00c6ac;
}

.nav-item--active {
  background: #00c6ac;
  color: #ffffff;
  font-weight: 600;
}

.nav-item--disabled {
  opacity: 0.45;
  cursor: not-allowed;
  pointer-events: none;
}

.sidebar-footer {
  border-top: 1px solid #f0f0f0;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
}

.user-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #e5e5e5;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.user-avatar-initials {
  font-size: 13px;
  font-weight: 600;
  color: #525252;
  font-family: 'Manrope', system-ui, sans-serif;
}

.user-meta {
  display: flex;
  flex-direction: column;
}

.user-name {
  font-size: 0.85rem;
  font-weight: 600;
  color: #111827;
}

.user-role-label {
  font-size: 0.72rem;
  color: #9ca3af;
}

.logout-btn {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  background: #fff0ee;
  border: none;
  color: #ef4444;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.15s;
}

.logout-btn:hover {
  background: #fee2e2;
}
</style>