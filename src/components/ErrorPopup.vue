<script setup lang="ts">
interface Props {
  isOpen: boolean
  title?: string
  message?: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
}>()

function close() {
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="isOpen" class="popup-overlay">
        <div class="popup">

          <div class="popup-close">
            <button @click="close">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="#070708" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </button>
          </div>

          <div class="popup-content">

            <div class="icon">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <path d="M6 6L26 26M6 26L26 6" stroke="#B31F20" stroke-width="3" stroke-linecap="round"/>
              </svg>
            </div>

            <div class="text">
              <h3>{{ title || "User sudah terdaftar!" }}</h3>
              <p>{{ message || "Silakan daftarkan user dengan username yang lain." }}</p>
            </div>

          </div>

        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@600&family=Manrope:wght@400;600&display=swap');

.popup-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.popup {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 28px;
  width: 320px;
  background: #FFF6F6;
  border-radius: 24px;
  box-shadow:
    0px 100px 126px rgba(0, 0, 0, 0.15),
    0px 41.78px 52.64px rgba(0, 0, 0, 0.108),
    0px 22.34px 28.14px rgba(0, 0, 0, 0.089),
    0px 12.52px 15.78px rgba(0, 0, 0, 0.075),
    0px 6.65px 8.38px rgba(0, 0, 0, 0.061),
    0px 2.77px 3.49px rgba(0, 0, 0, 0.042);
}

.popup-close {
  width: 100%;
  display: flex;
  justify-content: flex-end;
  margin-bottom: 10px;
}

.popup-close button {
  border: none;
  background: none;
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.popup-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 32px;
  width: 312px;
}

.icon {
  width: 72px;
  height: 72px;
  background: #ED3D3E;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.text {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  text-align: center;
}

.text h3 {
  font-family: 'Poppins', sans-serif;
  font-size: 32px;
  font-weight: 600;
  line-height: 1;
  color: #070708;
  margin: 0;
}

.text p {
  font-family: 'Poppins', sans-serif;
  font-size: 16px;
  font-weight: 600;
  line-height: 1;
  color: #6F6F70;
  margin: 0;
  max-width: 218px;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>