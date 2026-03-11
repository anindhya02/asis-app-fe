<template>
  <div
    class="unauthorized-overlay"
    :class="{
      'unauthorized-overlay--global': props.mode === 'global',
      'unauthorized-overlay--content': props.mode === 'content',
    }"
    @click.self="$emit('close')"
  >
    <div class="unauthorized-modal">
      <button class="close-btn" @click="$emit('close')" aria-label="Tutup">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
          stroke="#666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      <div class="icon-circle">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
          stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </div>

      <h2 class="modal-title">{{ title }}</h2>
      <p class="modal-sub">{{ message }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  title?: string
  message?: string
  mode?: 'global' | 'content'
}>(), {
  title: 'Anda Tidak Memiliki Akses!',
  message: 'Silakan login dengan akses yang tepat.',
  mode: 'global',
})

defineEmits<{
  close: []
}>()
</script>

<style scoped>
.unauthorized-overlay {
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  background: rgba(255, 255, 255, 0.15);
}

.unauthorized-overlay--global {
  position: fixed;
  inset: 0;
}

.unauthorized-overlay--content {
  position: absolute;
  inset: 0;
}

.unauthorized-modal {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px;
  width: 392px;
  max-width: 90%;
  background: #FFF6F6;
  box-shadow:
    0px 100px 126px rgba(0, 0, 0, 0.15),
    0px 41.7776px 52.6398px rgba(0, 0, 0, 0.107828),
    0px 22.3363px 28.1437px rgba(0, 0, 0, 0.0894161),
    0px 12.5216px 15.7772px rgba(0, 0, 0, 0.075),
    0px 6.6501px 8.37913px rgba(0, 0, 0, 0.0605839),
    0px 2.76726px 3.48674px rgba(0, 0, 0, 0.0421718);
  border-radius: 24px;
  text-align: center;
}

.close-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.close-btn:hover {
  background: rgba(0, 0, 0, 0.06);
}

.icon-circle {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background-color: #ef4444;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 0 20px;
}

.modal-title {
  font-family: 'Poppins', system-ui, sans-serif;
  font-size: 22px;
  font-weight: 700;
  color: #171717;
  margin: 0 0 8px;
  line-height: 1.3;
}

.modal-sub {
  font-family: 'Manrope', system-ui, sans-serif;
  font-size: 14px;
  color: #525252;
  margin: 0;
  line-height: 1.5;
}
</style>
