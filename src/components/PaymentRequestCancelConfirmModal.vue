<script setup lang="ts">
defineProps<{
  isOpen: boolean
  loading?: boolean
}>()

defineEmits<{ (e: 'confirm'): void; (e: 'cancel'): void }>()
</script>

<template>
  <Teleport to="body">
    <Transition name="backdrop">
      <div v-if="isOpen" class="backdrop" @click.self="$emit('cancel')">
        <Transition name="modal">
          <div v-if="isOpen" class="modal" role="dialog" aria-modal="true" aria-labelledby="cancel-pr-title">
            <div class="icon-wrap" aria-hidden="true">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#b91c1c" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <h2 id="cancel-pr-title" class="title">Yakin membatalkan ticket ini?</h2>
            <p class="sub">Status ticket akan diubah menjadi Dibatalkan.</p>
            <div class="buttons">
              <button type="button" class="btn-cancel" :disabled="loading" @click="$emit('cancel')">Tidak</button>
              <button type="button" class="btn-confirm" :disabled="loading" @click="$emit('confirm')">
                {{ loading ? 'Memproses…' : 'Ya, batalkan' }}
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
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.modal {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 36px 40px 40px;
  gap: 12px;
  width: min(392px, calc(100vw - 32px));
  background: #fff5f5;
  box-shadow:
    0px 100px 126px rgba(0, 0, 0, 0.12),
    0px 22px 28px rgba(0, 0, 0, 0.08);
  border-radius: 24px;
}

.icon-wrap {
  width: 72px;
  height: 72px;
  background: #fee2e2;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.title {
  font-family: 'Poppins', sans-serif;
  font-weight: 600;
  font-size: 18px;
  line-height: 1.35;
  text-align: center;
  color: #171717;
  margin: 8px 0 0;
}

.sub {
  font-family: 'Manrope', sans-serif;
  font-size: 14px;
  line-height: 1.45;
  text-align: center;
  color: #525252;
  margin: 0 0 8px;
}

.buttons {
  display: flex;
  gap: 8px;
  width: 100%;
  justify-content: center;
}

.btn-cancel,
.btn-confirm {
  width: 152px;
  height: 48px;
  border-radius: 12px;
  border: none;
  font-family: 'Manrope', sans-serif;
  font-weight: 600;
  font-size: 16px;
  cursor: pointer;
  transition: transform 0.12s, box-shadow 0.12s;
}

.btn-cancel:disabled,
.btn-confirm:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.btn-cancel {
  background: #ffffff;
  color: #070708;
  border: 1.5px solid #e5e7eb;
}
.btn-cancel:hover {
  background: #f5f5f5;
}

.btn-confirm {
  background: linear-gradient(180deg, #f87171 0%, #dc2626 100%);
  color: #ffffff;
  box-shadow: 0 4px 14px rgba(220, 38, 38, 0.4);
}
.btn-confirm:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(185, 28, 28, 0.5);
}
.btn-confirm:active {
  transform: translateY(0);
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
  transition: opacity 0.2s ease, transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.modal-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.modal-enter-from {
  opacity: 0;
  transform: scale(0.88) translateY(12px);
}
.modal-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>