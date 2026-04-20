<script setup lang="ts">
import { computed, ref, watch } from 'vue'

type ReviewActionType = 'approve' | 'reject' | 'revision'

const props = defineProps<{
  isOpen: boolean
  type: ReviewActionType
  loading?: boolean
}>()

const emit = defineEmits<{
  (e: 'confirm', value: string): void
  (e: 'cancel'): void
}>()

const reviewNote = ref('')
const showValidationError = ref(false)

const config = computed(() => {
  if (props.type === 'approve') {
    return {
      title: 'Setujui Permintaan Dana?',
      subtitle: 'Tindakan ini tidak dapat dibatalkan.',
      fieldLabel: 'Catatan Persetujuan',
      placeholder: 'Tuliskan alasan persetujuan (opsional)...',
      confirmLabel: 'Setujui',
      confirmLoadingLabel: 'Menyetujui...',
      iconBg: '#CCFBF1',
      iconFg: '#00A88F',
      modalBg: '#F7FFFD',
      cancelBorder: '#5EEAD4',
      cancelColor: '#0F766E',
      confirmBg: 'linear-gradient(180deg, #2DD4BF 0%, #00B39C 100%)',
      confirmColor: '#ffffff',
      noteRequired: false,
    }
  }

  if (props.type === 'reject') {
    return {
      title: 'Tolak Permintaan Dana?',
      subtitle: 'Tindakan ini tidak dapat dibatalkan.',
      fieldLabel: 'Catatan Penolakan *',
      placeholder: 'Tuliskan alasan penolakan...',
      confirmLabel: 'Tolak',
      confirmLoadingLabel: 'Menolak...',
      iconBg: '#FEE2E2',
      iconFg: '#DC2626',
      modalBg: '#FFF7F7',
      cancelBorder: '#FCA5A5',
      cancelColor: '#B91C1C',
      confirmBg: 'linear-gradient(180deg, #F87171 0%, #DC2626 100%)',
      confirmColor: '#ffffff',
      noteRequired: true,
    }
  }

  return {
    title: 'Minta Revisi Permintaan Dana?',
    subtitle: 'Berikan catatan revisi agar pengurus dapat memperbaiki informasi yang diperlukan.',
    fieldLabel: 'Catatan Revisi *',
    placeholder: 'Tuliskan alasan revisi...',
    confirmLabel: 'Kirim Permintaan Revisi',
    confirmLoadingLabel: 'Mengirim...',
    iconBg: '#FEF3C7',
    iconFg: '#D97706',
    modalBg: '#FFFEF7',
    cancelBorder: '#FCD34D',
    cancelColor: '#B45309',
    confirmBg: 'linear-gradient(180deg, #FDE047 0%, #FACC15 100%)',
    confirmColor: '#854D0E',
    noteRequired: true,
  }
})

const errorMessage = computed(() => {
  if (!showValidationError.value) return ''
  if (props.type === 'reject') return 'Alasan penolakan wajib diisi.'
  return 'Catatan revisi wajib diisi.'
})

function closeModal() {
  if (props.loading) return
  emit('cancel')
}

function submit() {
  const value = reviewNote.value.trim()
  if (config.value.noteRequired && !value) {
    showValidationError.value = true
    return
  }
  showValidationError.value = false
  emit('confirm', value)
}

watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      reviewNote.value = ''
      showValidationError.value = false
    }
  },
)
</script>

<template>
  <Teleport to="body">
    <Transition name="backdrop">
      <div v-if="isOpen" class="backdrop" @click.self="closeModal">
        <Transition name="modal">
          <div
            v-if="isOpen"
            class="modal"
            role="dialog"
            aria-modal="true"
            :style="{ backgroundColor: config.modalBg }"
          >
            <div class="icon-wrap" :style="{ background: config.iconBg }" aria-hidden="true">
              <svg
                v-if="type === 'approve'"
                width="26"
                height="26"
                viewBox="0 0 24 24"
                fill="none"
                :stroke="config.iconFg"
                stroke-width="2.4"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <svg
                v-else-if="type === 'reject'"
                width="26"
                height="26"
                viewBox="0 0 24 24"
                fill="none"
                :stroke="config.iconFg"
                stroke-width="2.4"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              <svg
                v-else
                width="26"
                height="26"
                viewBox="0 0 24 24"
                fill="none"
                :stroke="config.iconFg"
                stroke-width="2.4"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M9.09 9a3 3 0 1 1 5.82 1c0 2-3 3-3 3" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>

            <h2 class="title">{{ config.title }}</h2>
            <p class="sub">{{ config.subtitle }}</p>

            <div class="field">
              <label class="label">{{ config.fieldLabel }}</label>
              <textarea
                v-model="reviewNote"
                class="textarea"
                :class="{ 'textarea--error': !!errorMessage }"
                :placeholder="config.placeholder"
                :disabled="loading"
                rows="4"
              />
              <p v-if="errorMessage" class="error-text">{{ errorMessage }}</p>
            </div>

            <div class="buttons">
              <button
                type="button"
                class="btn-cancel"
                :style="{ borderColor: config.cancelBorder, color: config.cancelColor }"
                :disabled="loading"
                @click="closeModal"
              >
                Batal
              </button>
              <button
                type="button"
                class="btn-confirm"
                :style="{ background: config.confirmBg, color: config.confirmColor }"
                :disabled="loading"
                @click="submit"
              >
                {{ loading ? config.confirmLoadingLabel : config.confirmLabel }}
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.46);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 20px;
}

.modal {
  width: 430px;
  max-width: calc(100vw - 28px);
  min-width: 0;
  border-radius: 18px;
  box-shadow:
    0 28px 56px rgba(0, 0, 0, 0.22),
    0 8px 20px rgba(0, 0, 0, 0.14);
  padding: 20px 20px 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.icon-wrap {
  width: 52px;
  height: 52px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.title {
  margin: 12px 0 0;
  font-family: 'Poppins', sans-serif;
  font-size: 19px;
  font-weight: 600;
  line-height: 1.3;
  color: #171717;
  text-align: center;
}

.sub {
  margin: 4px 0 12px;
  font-family: 'Manrope', sans-serif;
  font-size: 13px;
  line-height: 1.4;
  color: #525252;
  text-align: center;
}

.field {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 10px;
}

.label {
  font-family: 'Manrope', sans-serif;
  font-size: 14px;
  font-weight: 700;
  color: #262626;
}

.textarea {
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  display: block;
  border: 1px solid #d4d4d4;
  border-radius: 10px;
  padding: 10px 12px;
  font-family: 'Manrope', sans-serif;
  font-size: 14px;
  line-height: 1.45;
  color: #171717;
  resize: none;
  min-height: 92px;
  background: #ffffff;
}

.textarea:focus {
  outline: none;
  border-color: #00c6ac;
  box-shadow: 0 0 0 3px rgba(0, 198, 172, 0.15);
}

.textarea--error {
  border-color: #ef4444;
}

.error-text {
  margin: 0;
  color: #dc2626;
  font-size: 13px;
  font-family: 'Manrope', sans-serif;
}

.buttons {
  width: 100%;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 0;
}

.btn-cancel,
.btn-confirm {
  height: 36px;
  border-radius: 9px;
  border: 1px solid transparent;
  font-family: 'Manrope', sans-serif;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
}

.btn-cancel {
  background: #ffffff;
}

.btn-cancel:hover {
  filter: brightness(0.98);
}

.btn-confirm {
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.12);
}

.btn-confirm:hover {
  filter: brightness(0.98);
}

.btn-cancel:disabled,
.btn-confirm:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.backdrop-enter-active,
.backdrop-leave-active {
  transition: opacity 0.2s ease;
}

.backdrop-enter-from,
.backdrop-leave-to {
  opacity: 0;
}

.modal-enter-active {
  transition: opacity 0.2s ease, transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.modal-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.modal-enter-from {
  opacity: 0;
  transform: scale(0.9) translateY(10px);
}

.modal-leave-to {
  opacity: 0;
  transform: scale(0.97);
}

@media (max-width: 640px) {
  .modal {
    width: calc(100vw - 20px);
    max-width: 430px;
    padding: 16px;
  }

  .buttons {
    grid-template-columns: 1fr;
  }
}
</style>
