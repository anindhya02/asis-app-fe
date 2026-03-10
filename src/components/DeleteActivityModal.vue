<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  isOpen: boolean
  title: string
  category: string
  program: string
}>()

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

const loading = ref(false)

async function handleDelete() {
  loading.value = true
  emit('confirm')
}

function handleCancel() {
  if (!loading.value) emit('cancel')
}

function resetLoading() {
  loading.value = false
}

defineExpose({ resetLoading })
</script>

<template>
  <Teleport to="body">
    <div v-if="isOpen" class="modal-overlay" @click.self="handleCancel">
      <div class="modal-content">
        <div class="modal-body">
          <div class="modal-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FF303E" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <h3 class="modal-title">Yakin menghapus postingan ini?</h3>
          <p class="modal-desc">Postingan akan dihapus dari sistem.</p>
          <div class="modal-info">
            <p class="info-title">{{ title }}</p>
            <p class="info-meta">{{ category }} &mdash; {{ program }}</p>
          </div>
        </div>

        <div class="modal-actions">
          <button type="button" class="btn-cancel" :disabled="loading" @click="handleCancel">
            Batal
          </button>
          <button type="button" class="btn-delete" :disabled="loading" @click="handleDelete">
            <template v-if="loading">
              <svg class="spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
              Menghapus...
            </template>
            <template v-else>Hapus</template>
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.5);
}

.modal-content {
  position: relative;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
  width: 460px;
  padding: 32px;
}

.modal-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.modal-icon {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: #fff1f2;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
}

.modal-title {
  font-family: 'Poppins', sans-serif;
  font-weight: 600;
  font-size: 20px;
  color: #171717;
  margin: 0 0 8px;
}

.modal-desc {
  font-family: 'Manrope', sans-serif;
  font-size: 14px;
  color: #525252;
  margin: 0 0 12px;
}

.modal-info {
  background: #f5f5f5;
  border-radius: 8px;
  padding: 12px 16px;
  width: 100%;
  margin-bottom: 24px;
  border: 1px solid #e5e5e5;
}

.info-title {
  font-family: 'Manrope', sans-serif;
  font-weight: 600;
  font-size: 14px;
  color: #171717;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.info-meta {
  font-family: 'Manrope', sans-serif;
  font-size: 12px;
  color: #a1a1a1;
  margin: 4px 0 0;
}

.modal-actions {
  display: flex;
  gap: 12px;
}

.btn-cancel {
  flex: 1;
  height: 44px;
  border-radius: 8px;
  border: 2px solid #d4d4d4;
  background: #fff;
  color: #404040;
  font-family: 'Manrope', sans-serif;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.15s;
}

.btn-cancel:hover:not(:disabled) {
  background-color: #f5f5f5;
}

.btn-cancel:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-delete {
  flex: 1;
  height: 44px;
  border-radius: 8px;
  border: none;
  background: #ff303e;
  color: #fff;
  font-family: 'Manrope', sans-serif;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.btn-delete:hover:not(:disabled) {
  background-color: #e0202e;
}

.btn-delete:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.spin {
  animation: spinner 1s linear infinite;
}

@keyframes spinner {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
