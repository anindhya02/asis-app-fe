<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'

const router = useRouter()
const authStore = useAuthStore()

function getHomeRouteByRole(role?: string | null): string {
  const r = (role || '').toUpperCase()
  if (r === 'ADMIN') return '/users'
  if (r === 'PENGURUS') return '/income-transactions'
  if (r === 'KETUA YAYASAN') return '/payment-requests'
  return '/payment-requests'
}

const username = ref('')
const password = ref('')
const errors = ref<{ username?: string; password?: string }>({})
const isLoading = ref(false)

const isDisabled = computed(() => !username.value.trim() || !password.value.trim())

const usernameFilled = computed(() => username.value.trim().length > 0)
const passwordFilled = computed(() => password.value.trim().length > 0)

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
  } catch (err: any) {
    console.log('catch triggered', err)   // ← cek ini muncul ga di console
    const msg = err?.response?.data?.message || 'Username atau password salah'
    errors.value = { username: msg, password: msg }
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="page">

    <!-- LEFT — foto gedung -->
    <div class="panel-left">
      <img src="@/assets/image3.png" alt="Gedung Ash-Sholihati" class="bg-photo" />
      <div class="photo-overlay" />
    </div>

    <!-- RIGHT — form -->
    <div class="panel-right">
      <div class="form-container">

        <!-- Heading -->
        <div class="heading-group">
          <h1 class="heading">
            Selamat datang di
            <span class="brand">ASIS</span>
          </h1>
        </div>

        <!-- Card -->
        <div class="card">
          <form class="form" @submit="handleLogin" novalidate>

            <!-- Username -->
            <div class="field">
              <label
                for="username"
                :class="{ 'label-filled': usernameFilled, 'label-error': errors.username }"
              >Username</label>
              <div
                class="input-wrap"
                :class="{ 'has-error': errors.username, 'is-filled': usernameFilled }"
              >
                <svg class="input-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                <input
                  id="username"
                  v-model="username"
                  type="text"
                  placeholder="Username"
                  autocomplete="username"
                />
              </div>
              <span v-if="errors.username" class="error-msg">{{ errors.username }}</span>
            </div>

            <!-- Password -->
            <div class="field">
              <label
                for="password"
                :class="{ 'label-filled': passwordFilled, 'label-error': errors.password }"
              >Password</label>
              <div
                class="input-wrap"
                :class="{ 'has-error': errors.password, 'is-filled': passwordFilled }"
              >
                <svg class="input-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <input
                  id="password"
                  v-model="password"
                  type="password"
                  placeholder="Password"
                  autocomplete="current-password"
                />
              </div>
              <span v-if="errors.password" class="error-msg">{{ errors.password }}</span>
            </div>

            <!-- Submit -->
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

          <p class="footer-text">Ash Sholihati Information System</p>
        </div>

      </div>
    </div>

  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@600;700&family=Manrope:wght@600&display=swap');

/* ── Layout ─────────────────────────────────────────── */
.page {
  display: flex;
  width: 100vw;
  height: 100vh;
  min-height: 100vh;
  overflow: hidden;
  background: #FEFEFE;
}

/* ── Left panel ──────────────────────────────────────── */
.panel-left {
  position: relative;
  width: 49.2%;
  height: 100vh;
  flex-shrink: 0;
  overflow: hidden;
}

.bg-photo {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top left;
}

.photo-overlay {
  position: absolute;
  inset: 0;
  background: rgba(103, 103, 103, 0.35);
  mix-blend-mode: overlay;
}

/* ── Right panel ─────────────────────────────────────── */
.panel-right {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #FEFEFE;
  padding: 2rem;
}

.form-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  width: 100%;
  max-width: 420px;
}

/* ── Heading ─────────────────────────────────────────── */
.heading-group {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  width: 100%;
}

.heading {
  font-family: 'Poppins', sans-serif;
  font-weight: 600;
  font-size: clamp(1.5rem, 2.5vw, 36px);
  line-height: 1;
  color: #000000;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 0.3em;
  margin: 0;
}

.brand {
  font-family: 'Poppins';
  font-weight: 700;
  font-size: clamp(2.8rem, 5vw, 72px);
  font-style: normal;
  line-height: 54px;
  background: linear-gradient(138.29deg, #EFEFEF 8.4%, #77DACD 39.72%, #146E61 81.36%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* ── Card ────────────────────────────────────────────── */
.card {
  width: 100%;
  max-width: 420px;
  background: #F6FFFD;
  box-shadow: 0px 4px 4px rgba(0, 0, 0, 0.25);
  border-radius: 16px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* ── Form ────────────────────────────────────────────── */
.form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

/* ── Label — abu2 default, hitam saat terisi, merah saat error ── */
label {
  font-family: 'Poppins', sans-serif;
  font-weight: 600;
  font-size: 16px;
  line-height: 16px;
  color: #070708;
  transition: color 0.2s;
}
label.label-filled { color: #070708; }
label.label-error  { color: #e63946; }

/* ── Input — abu2 default, teal saat terisi, merah saat error ── */
.input-wrap {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 12px 32px;
  border: 2px solid #D5D5D5;
  border-radius: 12px;
  background: #ffffff;
  transition: border-color 0.2s, box-shadow 0.2s;
  height: 48px;
  box-sizing: border-box;
}
.input-wrap.is-filled               { border-color: #00C6AC; }
.input-wrap.has-error               { border-color: #e63946; }
.input-wrap:focus-within            { border-color: #00C6AC; box-shadow: 0 0 0 3px rgba(0,198,172,0.18); }
.input-wrap.has-error:focus-within  { border-color: #e63946; box-shadow: 0 0 0 3px rgba(230,57,70,0.12); }

.input-icon {
  color: #D5D5D5;
  flex-shrink: 0;
  pointer-events: none;
  transition: color 0.2s;
}
.input-wrap.is-filled .input-icon  { color: #00C6AC; }
.input-wrap.has-error .input-icon  { color: #e63946; }
.input-wrap:focus-within .input-icon { color: #00C6AC; }

input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-family: 'Poppins', sans-serif;
  font-weight: 600;
  font-size: 16px;
  line-height: 16px;
  color: #070708;
  min-width: 0;
}
input::placeholder { color: #D5D5D5; font-weight: 600; }

/* ── Error message ───────────────────────────────────── */
.error-msg {
  display: flex;
  align-items: center;
  gap: 4px;
  font-family: 'Manrope', sans-serif;
  font-size: 12px;
  font-weight: 600;
  color: #e63946;
}

/* ── Button — abu2 saat disabled, teal saat aktif ───── */
.btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px 24px;
  width: 100%;
  height: 48px;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  font-family: 'Manrope', sans-serif;
  font-weight: 600;
  font-size: 16px;
  color: #FEFEFE;
  background: linear-gradient(180deg, #77DACD 0%, #00C6AC 100%);
  transition: transform 0.15s, box-shadow 0.2s;
  box-shadow: 0 4px 16px rgba(0, 198, 172, 0.35);
}
.btn:hover:not(:disabled)  { transform: translateY(-1px); box-shadow: 0 6px 24px rgba(0,198,172,0.45); }
.btn:active:not(:disabled) { transform: translateY(0); }
.btn:disabled {
  background: linear-gradient(180deg, #D5D5D5 0%, #C0C0C0 100%);
  color: #F0F0F0;
  box-shadow: none;
  cursor: not-allowed;
}

.btn-inner {
  display: flex;
  align-items: center;
  gap: 8px;
}

.spinner {
  width: 18px;
  height: 18px;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ── Footer ──────────────────────────────────────────── */
.footer-text {
  font-family: 'Manrope', sans-serif;
  font-weight: 600;
  font-size: 12px;
  line-height: 12px;
  color: #99999A;
  text-align: center;
  margin: 0;
}

/* ── Responsive ──────────────────────────────────────── */
@media (max-width: 768px) {
  .page { flex-direction: column; }
  .panel-left { width: 100%; height: 220px; }
  .panel-right { padding: 1.5rem 1rem; align-items: flex-start; }
  .heading { font-size: 1.6rem; white-space: normal; flex-wrap: wrap; }
  .brand { font-size: 2rem; }
}
</style>