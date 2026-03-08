<script setup lang="ts">
defineProps<{ isOpen: boolean }>()
defineEmits<{ (e: 'confirm'): void; (e: 'cancel'): void }>()
</script>

<template>
  <Teleport to="body">
    <Transition name="backdrop">
      <div v-if="isOpen" class="backdrop" @click.self="$emit('cancel')">
        <Transition name="modal">
          <div v-if="isOpen" class="modal" role="dialog" aria-modal="true">

            <!-- Icon -->
            <div class="icon-wrap">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="#FFCE1C" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="12"/>
                <text x="12" y="17" text-anchor="middle" font-size="14" font-weight="700" fill="#fff" font-family="sans-serif">?</text>
              </svg>
            </div>

            <!-- Text -->
            <p class="message">Apakah Anda yakin<br />ingin logout?</p>

            <!-- Buttons -->
            <div class="buttons">
              <button class="btn-cancel" @click="$emit('cancel')">Tidak</button>
              <button class="btn-confirm" @click="$emit('confirm')">Ya</button>
            </div>

          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* ── Backdrop ────────────────────────────────────────── */
.backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

/* ── Modal ───────────────────────────────────────────── */
.modal {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px;
  gap: 16px;
  width: 392px;
  background: #FFFBEE;
  box-shadow:
    0px 100px 126px rgba(0,0,0,0.15),
    0px 41.78px 52.64px rgba(0,0,0,0.108),
    0px 22.34px 28.14px rgba(0,0,0,0.089),
    0px 12.52px 15.78px rgba(0,0,0,0.075),
    0px 6.65px 8.38px rgba(0,0,0,0.061),
    0px 2.77px 3.49px rgba(0,0,0,0.042);
  border-radius: 24px;
}

/* ── Icon ────────────────────────────────────────────── */
.icon-wrap {
  width: 88px;
  height: 88px;
  background: #FFCE1C;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-wrap svg {
  width: 44px;
  height: 44px;
}

/* ── Message ─────────────────────────────────────────── */
.message {
  font-family: 'Poppins', sans-serif;
  font-weight: 600;
  font-size: 20px;
  line-height: 1.4;
  text-align: center;
  color: #070708;
  margin: 0;
}

/* ── Buttons ─────────────────────────────────────────── */
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

.btn-cancel {
  background: #ffffff;
  color: #070708;
  border: 1.5px solid #e5e7eb;
}
.btn-cancel:hover {
  background: #f5f5f5;
}

.btn-confirm {
  background: linear-gradient(180deg, #FFE37B 0%, #FFCE1C 100%);
  color: #070708;
  box-shadow: 0 4px 14px rgba(255, 206, 28, 0.4);
}
.btn-confirm:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(255, 206, 28, 0.5);
}
.btn-confirm:active {
  transform: translateY(0);
}

/* ── Transitions ─────────────────────────────────────── */
.backdrop-enter-active,
.backdrop-leave-active { transition: opacity 0.2s ease; }
.backdrop-enter-from,
.backdrop-leave-to { opacity: 0; }

.modal-enter-active { transition: opacity 0.2s ease, transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1); }
.modal-leave-active { transition: opacity 0.15s ease, transform 0.15s ease; }
.modal-enter-from  { opacity: 0; transform: scale(0.88) translateY(12px); }
.modal-leave-to    { opacity: 0; transform: scale(0.95); }
</style>