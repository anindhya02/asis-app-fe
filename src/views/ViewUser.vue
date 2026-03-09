<script setup lang="ts">
import type { User } from '@/interfaces/user.interface'

interface Props {
  isOpen: boolean
  user: User | null
}

defineProps<Props>()
const emit = defineEmits<{ close: [] }>()

function roleBadgeClass(role: string) {
  const map: Record<string, string> = {
    'Ketua Yayasan': 'badge-ketua',
    'Pengurus': 'badge-pengurus',
    'Donatur': 'badge-donatur',
    'Admin': 'badge-admin',
  }
  return map[role] ?? 'badge-default'
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="isOpen && user" class="overlay" @mousedown.self="emit('close')">
        <div class="modal" role="dialog" aria-modal="true" aria-labelledby="view-modal-title">

          <!-- Header -->
          <div class="modal-header">
            <h3 id="view-modal-title" class="modal-title">Detail Pengguna</h3>
            <button class="close-btn" @click="emit('close')" aria-label="Tutup">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <!-- Body -->
          <div class="modal-body">

            <div class="detail-row">
              <span class="detail-label">NAME</span>
              <span class="detail-value">{{ user.nama }}</span>
            </div>

            <div class="divider" />

            <div class="detail-row">
              <span class="detail-label">USERNAME</span>
              <span class="detail-value">{{ user.username }}</span>
            </div>

            <div class="divider" />

            <div class="detail-row">
              <span class="detail-label">ROLE</span>
              <span class="badge" :class="roleBadgeClass(user.role)">{{ user.role }}</span>
            </div>

            <div class="divider" />

            <div class="detail-row">
              <span class="detail-label">STATUS</span>
              <span class="status-pill" :class="user.status === 'ACTIVE' ? 'status-active' : 'status-inactive'">
                {{ user.status }}
              </span>
            </div>

            <div class="divider" />

            <div class="detail-row">
              <span class="detail-label">CREATED AT</span>
              <span class="detail-value">{{ user.createdDate?.slice(0, 10) }}</span>
            </div>

          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  backdrop-filter: blur(2px);
}

.modal {
  background: #fff;
  border-radius: 16px;
  width: 100%;
  max-width: 480px;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.16);
  font-family: 'Segoe UI', system-ui, sans-serif;
  overflow: hidden;
}

/* Header */
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

/* Body */
.modal-body {
  padding: 8px 0 16px;
}

.detail-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 16px 24px;
}

.divider {
  height: 1px;
  background: #f5f5f5;
  margin: 0 24px;
}

.detail-label {
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: #9ca3af;
}

.detail-value {
  font-size: 0.95rem;
  color: #111827;
  font-weight: 400;
}

/* Badges */
.badge {
  display: inline-block;
  padding: 4px 14px;
  border-radius: 8px;
  font-size: 0.82rem;
  font-weight: 500;
  border: 1px solid transparent;
  width: fit-content;
}
.badge-ketua    { background: #d0f0ea; color: #006B5A; border-color: #a3ddd4; }
.badge-pengurus { background: #d0f0ea; color: #006B5A; border-color: #a3ddd4; }
.badge-donatur  { background: #d0f0ea; color: #006B5A; border-color: #a3ddd4; }
.badge-admin    { background: #d0f0ea; color: #006B5A; border-color: #a3ddd4; }
.badge-default  { background: #d0f0ea; color: #006B5A; border-color: #a3ddd4; }

.status-pill {
  display: inline-block;
  padding: 4px 14px;
  border-radius: 8px;
  font-size: 0.82rem;
  font-weight: 500;
  border: 1px solid transparent;
  width: fit-content;
}
.status-active   { background: #d0f0ea; color: #006B5A; border-color: #a3ddd4; }
.status-inactive { background: #f3f4f6; color: #6b7280; border-color: #e5e7eb; }

/* Transition */
.modal-enter-active,
.modal-leave-active { transition: opacity 0.2s ease; }
.modal-enter-active .modal,
.modal-leave-active .modal { transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.2s ease; }
.modal-enter-from { opacity: 0; }
.modal-enter-from .modal { transform: scale(0.94) translateY(12px); opacity: 0; }
.modal-leave-to { opacity: 0; }
.modal-leave-to .modal { transform: scale(0.96) translateY(8px); opacity: 0; }
</style>