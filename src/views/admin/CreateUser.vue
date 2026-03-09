<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useUserStore } from '@/stores/user.store'
import ErrorPopup from '@/components/ErrorPopup.vue'
import SuccessPopup from '@/components/SuccessPopup.vue'

const showErrorPopup = ref(false)
const errorTitle = ref('')
const errorMessage = ref('')

const showSuccessPopup = ref(false)
const successTitle = ref('')
const successMessage = ref('')

interface Props {
  isOpen: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  close: []
  saved: []
}>()

const userStore = useUserStore()

const nama = ref('')
const username = ref('')
const role = ref('')
const password = ref('')
const confirmPassword = ref('')
const showPassword = ref(false)
const showConfirm = ref(false)
const errors = ref<Record<string, string>>({})
const isLoading = ref(false)

// Reset form when modal opens
watch(() => props.isOpen, (val) => {
  if (val) resetForm()
})

const isValid = computed(() =>
  nama.value.trim() &&
  username.value.trim() &&
  role.value &&
  password.value.length >= 8 &&
  password.value === confirmPassword.value
)

function validate() {
  const e: Record<string, string> = {}

  if (!nama.value.trim()) {
    e.nama = 'Nama harus diisi'
  }

  if (!username.value.trim()) {
    e.username = 'Username harus diisi'
  }

  if (!password.value) {
    e.password = 'Password harus diisi'
    } else if (password.value.length < 8) {
    e.password = 'Password minimal 8 karakter'
    }

    if (!confirmPassword.value) {
    e.confirmPassword = 'Konfirmasi password harus diisi'
    }

    if (password.value && confirmPassword.value && password.value !== confirmPassword.value) {
    e.confirmPassword = 'Password tidak sama'
    }

  if (!role.value) {
    e.role = 'Role harus dipilih'
  }

  return e
}

function resetForm() {
  nama.value = ''
  username.value = ''
  role.value = ''
  password.value = ''
  confirmPassword.value = ''
  showPassword.value = false
  showConfirm.value = false
  errors.value = {}
}

function handleClose() {
  resetForm()
  emit('close')
}

async function handleSave() {
  const e = validate()
  if (Object.keys(e).length > 0) {
    errors.value = e
    return
  }

  errors.value = {}
  isLoading.value = true

  try {
    await userStore.createUser({
      nama: nama.value.trim(),
      username: username.value.trim(),
      role: role.value,
      password: password.value,
    })

    successTitle.value = "User berhasil dibuat!"
    successMessage.value = "Akun pengguna berhasil ditambahkan."
    showSuccessPopup.value = true
    emit('saved')
    handleClose()
  } catch (err: any) {

  if (err?.response?.status === 400) {

    console.log("ERROR MASUK COMPONENT:", err)

    errorTitle.value = 'User sudah terdaftar!'
    errorMessage.value = 'Silakan daftarkan user dengan username yang lain.'
    showErrorPopup.value = true

  } else {

    errorTitle.value = 'Gagal membuat user'
    errorMessage.value = 'Terjadi kesalahan pada sistem.'
    showErrorPopup.value = true

  }
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="isOpen" class="overlay" @mousedown.self="handleClose">
        <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">

          <!-- Header -->
          <div class="modal-header">
            <h3 id="modal-title" class="modal-title">Tambah Akun Pengguna</h3>
            <button class="close-btn" @click="handleClose" aria-label="Tutup">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <!-- Body -->
          <div class="modal-body">

            <!-- Nama -->
            <div class="field">
              <label class="field-label">Name</label>
              <input
                v-model="nama"
                type="text"
                placeholder="Masukkan nama lengkap"
                class="field-input"
                :class="{ 'field-input--error': errors.nama }"
                @input="delete errors.nama"
              />
              <span v-if="errors.nama" class="field-error">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                {{ errors.nama }}
              </span>
            </div>

            <!-- Username -->
            <div class="field">
              <label class="field-label">Username</label>
              <input
                v-model="username"
                type="text"
                placeholder="Masukkan username"
                class="field-input"
                :class="{ 'field-input--error': errors.username }"
                @input="delete errors.username"
              />
              <span v-if="errors.username" class="field-error">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                {{ errors.username }}
              </span>
            </div>

            <!-- Role -->
            <div class="field">
              <label class="field-label">Role</label>
              <div class="select-wrap">
                <select
                  v-model="role"
                  class="field-input field-select"
                  :class="{ 'field-input--error': errors.role }"
                  @change="delete errors.role"
                >
                  <option value="" disabled>Masukkan role</option>
                  <option value="Admin">Admin</option>
                  <option value="Ketua Yayasan">Ketua Yayasan</option>
                  <option value="Pengurus">Pengurus</option>
                  <option value="Donatur">Donatur</option>
                </select>
                <svg class="select-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
              </div>
              <span v-if="errors.role" class="field-error">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                {{ errors.role }}
              </span>
            </div>

            <!-- Password -->
            <div class="field">
              <label class="field-label">Password</label>
              <div class="input-wrap">
                <input
                  v-model="password"
                  :type="showPassword ? 'text' : 'password'"
                  placeholder="Minimal 8 karakter"
                  class="field-input field-input--icon-right"
                  :class="{ 'field-input--error': errors.password }"
                  @input="delete errors.password"
                />
                <button class="eye-btn" type="button" @click="showPassword = !showPassword">
                  <svg v-if="!showPassword" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                  </svg>
                  <svg v-else width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                </button>
              </div>
              <span v-if="errors.password" class="field-error">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                {{ errors.password }}
              </span>
            </div>

            <!-- Konfirmasi Password -->
            <div class="field">
              <label class="field-label">Konfirmasi Password</label>
              <div class="input-wrap">
                <input
                  v-model="confirmPassword"
                  :type="showConfirm ? 'text' : 'password'"
                  placeholder="Ulangi password"
                  class="field-input field-input--icon-right"
                  :class="{ 'field-input--error': errors.confirmPassword }"
                  @input="delete errors.confirmPassword"
                />
                <button class="eye-btn" type="button" @click="showConfirm = !showConfirm">
                  <svg v-if="!showConfirm" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                  </svg>
                  <svg v-else width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                </button>
              </div>
              <span v-if="errors.confirmPassword" class="field-error">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                {{ errors.confirmPassword }}
              </span>
            </div>

          </div>

          <!-- Footer -->
          <div class="modal-footer">
            <button class="btn-cancel" @click="handleClose">Batal</button>
            <button
            class="btn-save"
            :class="{ 'btn-save--disabled': isLoading }"
            :disabled="isLoading"
            @click="handleSave"
            >
            <svg v-if="isLoading" class="spinner" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" stroke-width="3"/>
                <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            {{ isLoading ? 'Menyimpan...' : 'Simpan' }}
            </button>
          </div>

        </div>
      </div>
    </Transition>
  </Teleport>

  <ErrorPopup
  :isOpen="showErrorPopup"
  :title="errorTitle"
  :message="errorMessage"
  @close="showErrorPopup = false"
/>

<SuccessPopup
  :isOpen="showSuccessPopup"
  :title="successTitle"
  :message="successMessage"
  @close="showSuccessPopup = false"
/>
</template>

<style scoped>
/* ── Overlay ── */
.overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  backdrop-filter: blur(2px);
}

/* ── Modal ── */
.modal {
  background: #fff;
  border-radius: 16px;
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.18);
  font-family: 'Segoe UI', system-ui, sans-serif;
}

/* ── Header ── */
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 22px 24px 18px;
  border-bottom: 1px solid #f0f0f0;
}

.modal-title {
  font-family: 'Poppins';
  font-size: 1.4rem;
  font-weight: 700;
  color: #111827;
  letter-spacing: -0.01em;
}

.close-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: #9ca3af;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.close-btn:hover { background: #f3f4f6; color: #111827; }

/* ── Body ── */
.modal-body {
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* ── Field ── */
.field { display: flex; flex-direction: column; gap: 6px; }

.field-label {
  font-size: 0.82rem;
  font-weight: 600;
  color: #111827;
}

.field-input {
  box-sizing: border-box;
  width: 100%;
  height: 46px;
  padding: 0 14px;
  border-radius: 10px;
  border: 1.5px solid #e5e7eb;
  background: #fafafa;
  font-family: inherit;
  font-size: 0.875rem;
  color: #111827;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
}
.field-input::placeholder { color: #c2c8ce; }
.field-input:focus {
  border-color: #00C6AC;
  background: #fff;
  box-shadow: 0 0 0 3px rgba(0, 198, 172, 0.12);
}
.field-input--error { border-color: #ef4444; }
.field-input--error:focus { box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1); }
.field-input--icon-right { padding-right: 44px; }

/* Select */
.select-wrap { position: relative; width: 100%; }
.field-select { appearance: none; cursor: pointer; }
.select-chevron {
  position: absolute; right: 12px; top: 50%;
  transform: translateY(-50%);
  color: #9ca3af; pointer-events: none;
}

/* Eye toggle */
.input-wrap { position: relative; }
.eye-btn {
  position: absolute; right: 12px; top: 50%;
  transform: translateY(-50%);
  border: none; background: transparent;
  color: #9ca3af; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  padding: 2px;
  transition: color 0.15s;
}
.eye-btn:hover { color: #00C6AC; }

/* Error */
.field-error {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.74rem;
  color: #ef4444;
}

/* ── Footer ── */
.modal-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  padding: 16px 24px 22px;
  border-top: 1px solid #f0f0f0;
}

.btn-cancel {
  height: 42px;
  padding: 0 22px;
  border-radius: 10px;
  border: 1.5px solid #00C6AC;
  background: transparent;
  color: #00C6AC;
  font-family: inherit;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}
.btn-cancel:hover { background: #f0fdfb; }

.btn-save {
  height: 42px;
  padding: 0 22px;
  border-radius: 10px;
  border: none;
  background: #00C6AC;
  color: #fff;
  font-family: inherit;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  box-shadow: 0 4px 12px rgba(0, 198, 172, 0.3);
  transition: background 0.2s, transform 0.1s, box-shadow 0.2s;
}
.btn-save:hover:not(.btn-save--disabled) {
  background: #00b39c;
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(0, 198, 172, 0.4);
}
.btn-save--disabled {
  background: #e5e7eb;
  color: #9ca3af;
  box-shadow: none;
  cursor: not-allowed;
}

/* Spinner */
.spinner {
  width: 15px; height: 15px;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ── Transition ── */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}
.modal-enter-active .modal,
.modal-leave-active .modal {
  transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.2s ease;
}
.modal-enter-from { opacity: 0; }
.modal-enter-from .modal { transform: scale(0.94) translateY(12px); opacity: 0; }
.modal-leave-to { opacity: 0; }
.modal-leave-to .modal { transform: scale(0.96) translateY(8px); opacity: 0; }
</style>