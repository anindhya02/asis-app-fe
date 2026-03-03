<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'

const router = useRouter()
const authStore = useAuthStore()

function getHomeRouteByRole(role?: string | null) {
  const r = (role || '').toUpperCase()
  if (r === 'ADMIN') return '/users'
  if (r === 'PENGURUS') return '/income-transactions'
}

const username = ref('')
const password = ref('')
const errors = ref<{ username?: string; password?: string }>({})
const isLoading = ref(false)

const isDisabled = computed(() => !username.value.trim() || !password.value.trim())

const handleLogin = async (e: Event) => {
  e.preventDefault()

  const newErrors: { username?: string; password?: string } = {}

  if (!username.value.trim())
    newErrors.username = 'Username wajib diisi'

  if (!password.value.trim())
    newErrors.password = 'Password wajib diisi'
  else if (password.value.length < 8)
    newErrors.password = 'Password minimal 8 karakter'

  if (Object.keys(newErrors).length > 0) {
    errors.value = newErrors
    return
  }

  errors.value = {}
  isLoading.value = true

  try {
    await authStore.login({ username: username.value, password: password.value })
    const role = authStore.user?.role ?? null
    router.push(getHomeRouteByRole(role))
  } catch {
    // error sudah ditangani di store
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="page">
    <div class="bg-art">
      <div class="blob blob-1" />
      <div class="blob blob-2" />
      <div class="blob blob-3" />
    </div>

    <div class="page-wrap">
      <div class="logo-card">
        <span class="logo-text">ASIS</span>
      </div>

      <div class="card">
        <div class="card-accent" />
        <div class="card-body">
          <div class="card-header">
            <h1>Selamat datang kembali</h1>
            <p>Masuk untuk mengakses sistem manajemen</p>
          </div>

          <div class="divider"><span>Autentikasi</span></div>

          <form class="form" @submit="handleLogin" novalidate>
            <!-- Username -->
            <div class="field">
              <label for="username">Username</label>
              <div class="input-wrap">
                <svg class="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                </svg>
                <input
                  id="username"
                  v-model="username"
                  type="text"
                  placeholder="Masukkan username"
                  autocomplete="username"
                  :class="{ 'error-input': errors.username }"
                />
              </div>
              <span v-if="errors.username" class="error-msg">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                {{ errors.username }}
              </span>
            </div>

            <!-- Password -->
            <div class="field">
              <label for="password">Password</label>
              <div class="input-wrap">
                <svg class="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <input
                  id="password"
                  v-model="password"
                  type="password"
                  placeholder="Masukkan password"
                  autocomplete="current-password"
                  :class="{ 'error-input': errors.password }"
                />
              </div>
              <span v-if="errors.password" class="error-msg">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                {{ errors.password }}
              </span>
            </div>

            <!-- Button -->
            <button class="btn" type="submit" :disabled="isDisabled || isLoading">
              <span class="btn-inner">
                <svg v-if="isLoading" class="spinner" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" stroke-width="3"/>
                  <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                {{ isLoading ? 'Memuat...' : 'Login' }}
              </span>
            </button>
          </form>
        </div>
      </div>

      <p class="footer-text">Ash-Sholihati Information System</p>
    </div>
  </div>
</template>

<style scoped>
.page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f0f4f3;
  font-family: 'Segoe UI', system-ui, sans-serif;
  position: relative;
  overflow: hidden;
}

.bg-art {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}
.bg-art::after {
  content: '';
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(0,198,172,0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0,198,172,0.05) 1px, transparent 1px);
  background-size: 48px 48px;
}
.blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.28;
  animation: drift 14s ease-in-out infinite alternate;
}
.blob-1 { width: 560px; height: 560px; background: radial-gradient(circle, #00C6AC 0%, transparent 70%); top: -200px; right: -150px; }
.blob-2 { width: 380px; height: 380px; background: radial-gradient(circle, #7ee8dd 0%, transparent 70%); bottom: -120px; left: -80px; animation-delay: -5s; animation-duration: 10s; }
.blob-3 { width: 260px; height: 260px; background: radial-gradient(circle, #b2f0e8 0%, transparent 70%); top: 38%; left: 28%; animation-delay: -9s; animation-duration: 18s; }

@keyframes drift {
  from { transform: translate(0, 0) scale(1); }
  to   { transform: translate(28px, 18px) scale(1.07); }
}

.page-wrap {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.75rem;
  padding: 2rem 1rem;
  animation: fadeUp 0.6s cubic-bezier(0.22, 0.61, 0.36, 1) both;
}

@keyframes fadeUp {
  from { opacity: 0; transform: translateY(22px); }
  to   { opacity: 1; transform: translateY(0); }
}

.logo-card {
  background: #fff;
  border: 1px solid rgba(0,198,172,0.2);
  border-radius: 14px;
  padding: 11px 34px;
  box-shadow: 0 4px 20px rgba(0,198,172,0.12);
}
.logo-text {
  font-size: 1.85rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  background: linear-gradient(135deg, #00C6AC 0%, #009e89 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.card {
  background: #fff;
  border-radius: 20px;
  width: min(420px, 100%);
  box-shadow: 0 8px 40px rgba(0,0,0,0.09), 0 0 0 1px rgba(0,198,172,0.1);
  overflow: hidden;
}
.card-accent {
  height: 4px;
  background: linear-gradient(90deg, #00C6AC 0%, #7ee8dd 50%, #009e89 100%);
}
.card-body {
  padding: 2rem 2.25rem 2.25rem;
}

.card-header { margin-bottom: 1.5rem; }
.card-header h1 {
  font-size: 1.4rem;
  font-weight: 700;
  color: #0d1117;
  line-height: 1.3;
}
.card-header p {
  font-size: 0.82rem;
  color: #8a9590;
  margin-top: 0.3rem;
}

.divider {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}
.divider::before, .divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: #e8eceb;
}
.divider span {
  font-size: 0.7rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #b0b8b5;
  font-weight: 600;
}

.form { display: flex; flex-direction: column; gap: 1.1rem; }
.field { display: flex; flex-direction: column; gap: 0.4rem; }

label {
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #4a5550;
}

.input-wrap { position: relative; }

.input-icon {
  position: absolute;
  left: 0.875rem;
  top: 50%;
  transform: translateY(-50%);
  color: #b0b8b5;
  pointer-events: none;
  transition: color 0.2s;
}
.input-wrap:focus-within .input-icon { color: #00C6AC; }

input {
  width: 100%;
  height: 48px;
  padding: 0 1rem 0 2.75rem;
  border-radius: 12px;
  border: 1.5px solid #e2e8e6;
  background: #fbfcfc;
  font-family: inherit;
  font-size: 0.9rem;
  color: #0d1117;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
}
input::placeholder { color: #c2cac7; }
input:focus {
  border-color: #00C6AC;
  background: #fff;
  box-shadow: 0 0 0 3.5px rgba(0,198,172,0.15);
}
input.error-input { border-color: #e63946; }
input.error-input:focus { box-shadow: 0 0 0 3.5px rgba(230,57,70,0.12); }

.error-msg {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.75rem;
  color: #e63946;
}

.btn {
  width: 100%;
  height: 50px;
  margin-top: 0.4rem;
  border: none;
  border-radius: 12px;
  font-family: inherit;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.2s;
  background: linear-gradient(135deg, #00C6AC 0%, #009e89 100%);
  color: #fff;
  box-shadow: 0 4px 16px rgba(0,198,172,0.35);
}
.btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 24px rgba(0,198,172,0.45);
}
.btn:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: 0 2px 8px rgba(0,198,172,0.3);
}
.btn:disabled {
  background: linear-gradient(135deg, #c8d5d3, #b5c4c1);
  color: #9aaaa7;
  box-shadow: none;
  cursor: not-allowed;
}
.btn-inner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.spinner {
  width: 18px;
  height: 18px;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.footer-text {
  font-size: 0.72rem;
  color: #a8b4b0;
  letter-spacing: 0.02em;
}
</style>
