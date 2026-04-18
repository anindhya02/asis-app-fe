<script setup lang="ts">
import { ref, watch } from 'vue'
import type { User } from '@/interfaces/user.interface'
import { useUserStore } from '@/stores/user.store'
import ErrorPopup from '@/components/ErrorPopup.vue'
import SuccessPopup from '@/components/SuccessPopup.vue'

interface Props {
  isOpen: boolean
  user: User | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  close: []
  saved: []
}>()

const userStore = useUserStore()

const showErrorPopup = ref(false)
const errorTitle = ref('')
const errorMessage = ref('')

const showSuccessPopup = ref(false)
const successTitle = ref('')
const successMessage = ref('')

const nama = ref('')
const username = ref('')
const role = ref('')
const password = ref('')
const confirmPassword = ref('')
const showPassword = ref(false)
const showConfirm = ref(false)
const errors = ref<Record<string, string>>({})
const isLoading = ref(false)

function normalizeRole(roleValue: string) {
  const normalized = roleValue?.toUpperCase()
  if (normalized === 'ADMIN') return 'Admin'
  if (normalized === 'KETUA YAYASAN') return 'Ketua Yayasan'
  if (normalized === 'PENGURUS') return 'Pengurus'
  if (normalized === 'DONATUR') return 'Donatur'
  return roleValue
}

watch(
  () => props.isOpen,
  (isOpen) => {
    if (isOpen && props.user) {
      nama.value = props.user.nama
      username.value = props.user.username
      role.value = normalizeRole(props.user.role)
      password.value = ''
      confirmPassword.value = ''
      showPassword.value = false
      showConfirm.value = false
      errors.value = {}
    }
  }
)

function validate() {
  const e: Record<string, string> = {}

  if (!nama.value.trim()) e.nama = 'Nama harus diisi'
  if (!username.value.trim()) e.username = 'Username harus diisi'
  if (!role.value) e.role = 'Role harus dipilih'

  if (!password.value) {
    e.password = 'Password harus diisi'
  } else if (password.value.length < 8) {
    e.password = 'Password minimal 8 karakter'
  }

  if (!confirmPassword.value) {
    e.confirmPassword = 'Konfirmasi password harus diisi'
  } else if (password.value !== confirmPassword.value) {
    e.confirmPassword = 'Password tidak sama'
  }

  return e
}

function handleClose() {
  emit('close')
}

async function handleSave() {
  if (!props.user) return

  const e = validate()
  if (Object.keys(e).length > 0) {
    errors.value = e
    return
  }

  errors.value = {}
  isLoading.value = true

  try {
    await userStore.updateUser(props.user.userId, {
      nama: nama.value.trim(),
      username: username.value.trim(),
      role: role.value,
      password: password.value,
    })

    successTitle.value = 'User berhasil diperbarui!'
    successMessage.value = 'Perubahan data pengguna sudah tersimpan.'
    showSuccessPopup.value = true
    emit('saved')
    handleClose()
  } catch (err: any) {
    if (err?.response?.status === 400) {
      errorTitle.value = 'Gagal memperbarui user'
      errorMessage.value = err?.response?.data?.message ?? 'Periksa data user yang kamu masukkan.'
    } else {
      errorTitle.value = 'Gagal memperbarui user'
      errorMessage.value = 'Terjadi kesalahan pada sistem.'
    }
    showErrorPopup.value = true
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="isOpen && user" class="overlay" @mousedown.self="handleClose">
        <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <div class="modal-header">
            <h3 id="modal-title" class="modal-title">Edit Akun Pengguna</h3>
            <button class="close-btn" @click="handleClose" aria-label="Tutup">x</button>
          </div>

          <div class="modal-body">
            <div class="field">
              <label class="field-label">Name</label>
              <input v-model="nama" type="text" class="field-input" :class="{ 'field-input--error': errors.nama }" @input="delete errors.nama" />
              <span v-if="errors.nama" class="field-error">{{ errors.nama }}</span>
            </div>

            <div class="field">
              <label class="field-label">Username</label>
              <input v-model="username" type="text" class="field-input" :class="{ 'field-input--error': errors.username }" @input="delete errors.username" />
              <span v-if="errors.username" class="field-error">{{ errors.username }}</span>
            </div>

            <div class="field">
              <label class="field-label">Role</label>
              <select v-model="role" class="field-input" :class="{ 'field-input--error': errors.role }" @change="delete errors.role">
                <option value="" disabled>Masukkan role</option>
                <option value="Admin">Admin</option>
                <option value="Ketua Yayasan">Ketua Yayasan</option>
                <option value="Pengurus">Pengurus</option>
                <option value="Donatur">Donatur</option>
              </select>
              <span v-if="errors.role" class="field-error">{{ errors.role }}</span>
            </div>

            <div class="field">
              <label class="field-label">Password Baru</label>
              <div class="input-wrap">
                <input v-model="password" :type="showPassword ? 'text' : 'password'" class="field-input field-input--icon-right" :class="{ 'field-input--error': errors.password }" @input="delete errors.password" />
                <button class="eye-btn" type="button" @click="showPassword = !showPassword">
                  {{ showPassword ? 'Hide' : 'Show' }}
                </button>
              </div>
              <span v-if="errors.password" class="field-error">{{ errors.password }}</span>
            </div>

            <div class="field">
              <label class="field-label">Konfirmasi Password Baru</label>
              <div class="input-wrap">
                <input v-model="confirmPassword" :type="showConfirm ? 'text' : 'password'" class="field-input field-input--icon-right" :class="{ 'field-input--error': errors.confirmPassword }" @input="delete errors.confirmPassword" />
                <button class="eye-btn" type="button" @click="showConfirm = !showConfirm">
                  {{ showConfirm ? 'Hide' : 'Show' }}
                </button>
              </div>
              <span v-if="errors.confirmPassword" class="field-error">{{ errors.confirmPassword }}</span>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn-cancel" @click="handleClose">Batal</button>
            <button class="btn-save" :class="{ 'btn-save--disabled': isLoading }" :disabled="isLoading" @click="handleSave">
              {{ isLoading ? 'Menyimpan...' : 'Simpan' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <ErrorPopup :isOpen="showErrorPopup" :title="errorTitle" :message="errorMessage" @close="showErrorPopup = false" />
  <SuccessPopup :isOpen="showSuccessPopup" :title="successTitle" :message="successMessage" @close="showSuccessPopup = false" />
</template>

<style scoped>
.overlay { position: fixed; inset: 0; z-index: 50; background: rgba(0, 0, 0, 0.45); display: flex; align-items: center; justify-content: center; padding: 1rem; }
.modal { background: #fff; border-radius: 16px; width: 100%; max-width: 500px; max-height: 90vh; overflow-y: auto; box-shadow: 0 24px 64px rgba(0, 0, 0, 0.18); font-family: 'Segoe UI', system-ui, sans-serif; }
.modal-header { display: flex; align-items: center; justify-content: space-between; padding: 22px 24px 18px; border-bottom: 1px solid #f0f0f0; }
.modal-title { font-family: 'Poppins'; font-size: 1.4rem; font-weight: 700; color: #111827; }
.close-btn { width: 32px; height: 32px; border-radius: 8px; border: none; background: transparent; color: #9ca3af; cursor: pointer; }
.modal-body { padding: 20px 24px; display: flex; flex-direction: column; gap: 16px; }
.field { display: flex; flex-direction: column; gap: 6px; }
.field-label { font-size: 0.82rem; font-weight: 600; color: #111827; }
.field-input { box-sizing: border-box; width: 100%; height: 46px; padding: 0 14px; border-radius: 10px; border: 1.5px solid #e5e7eb; background: #fafafa; font-family: inherit; font-size: 0.875rem; color: #111827; outline: none; }
.field-input--error { border-color: #ef4444; }
.field-input--icon-right { padding-right: 44px; }
.input-wrap { position: relative; }
.eye-btn { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); border: none; background: transparent; cursor: pointer; }
.field-error { font-size: 0.74rem; color: #ef4444; }
.modal-footer { display: flex; align-items: center; justify-content: flex-end; gap: 10px; padding: 16px 24px 22px; border-top: 1px solid #f0f0f0; }
.btn-cancel { height: 42px; padding: 0 22px; border-radius: 10px; border: 1.5px solid #00C6AC; background: transparent; color: #00C6AC; font-weight: 600; cursor: pointer; }
.btn-save { height: 42px; padding: 0 22px; border-radius: 10px; border: none; background: #00C6AC; color: #fff; font-weight: 600; cursor: pointer; }
.btn-save--disabled { background: #e5e7eb; color: #9ca3af; cursor: not-allowed; }
.modal-enter-active, .modal-leave-active { transition: opacity 0.2s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
</style>
