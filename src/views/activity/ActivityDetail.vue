<script setup lang="ts">
import { onMounted, onUnmounted, ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useActivityStore } from '@/stores/activity.store'
import { getCurrentUser } from '@/lib/auth'
import AsisSidebar from '@/components/AsisSidebar.vue'
import DeleteActivityModal from '@/components/DeleteActivityModal.vue'
import type { ActivityResponse, AttachmentResponse, ReplyResponse } from '@/interfaces/activity.interface'

const route = useRoute()
const router = useRouter()
const store = useActivityStore()

const activity = ref<ActivityResponse | null>(null)
const attachments = ref<AttachmentResponse[]>([])
const imageAttachments = computed(() => attachments.value.filter((a) => a.type?.startsWith('image/')))
const fileAttachments = computed(() => attachments.value.filter((a) => !a.type?.startsWith('image/')))
const currentCarouselImage = computed(() => imageAttachments.value[carouselIndex.value] ?? null)
const loading = ref(true)
const notFound = ref(false)
const showDelete = ref(false)

// Replies
const replies = ref<ReplyResponse[]>([])
const repliesState = ref<'loading' | 'success' | 'empty' | 'error'>('loading')
const replyErrorMessage = ref('')

const newReplyContent = ref('')
const newReplyError = ref('')
const creatingReply = ref(false)

const replyingToId = ref<string | null>(null)
const inlineReplyContent = ref('')
const inlineReplyError = ref('')
const creatingInlineReply = ref(false)

const editingReplyId = ref<string | null>(null)
const editReplyContent = ref('')
const editReplyError = ref('')
const updatingReply = ref(false)

const deletingReplyId = ref<string | null>(null)
const deletingReply = ref(false)

const currentUser = computed(() => getCurrentUser())
const canWriteReply = computed(() => {
  const role = currentUser.value?.role?.toUpperCase()
  return role === 'DONATUR' || role === 'PENGURUS'
})

const threadedReplies = computed(() => {
  const byParent = new Map<string, ReplyResponse[]>()

  const sortByTime = (list: ReplyResponse[]) =>
    [...list].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

  for (const reply of replies.value) {
    const key = reply.parentReplyId ?? '__root__'
    const bucket = byParent.get(key) ?? []
    bucket.push(reply)
    byParent.set(key, bucket)
  }

  const result: Array<{ reply: ReplyResponse; depth: number }> = []

  const walk = (parentId: string | null, depth: number) => {
    const key = parentId ?? '__root__'
    const children = sortByTime(byParent.get(key) ?? [])

    for (const child of children) {
      result.push({ reply: child, depth })
      walk(child.replyId, depth + 1)
    }
  }

  walk(null, 0)
  return result
})

// Carousel
const carouselIndex = ref(0)
const carouselTouchStartX = ref(0)
let carouselTimer: ReturnType<typeof setInterval> | null = null

function carouselPrev() {
  carouselIndex.value =
    carouselIndex.value > 0 ? carouselIndex.value - 1 : imageAttachments.value.length - 1
  resetCarouselTimer()
}

function carouselNext() {
  carouselIndex.value =
    carouselIndex.value < imageAttachments.value.length - 1 ? carouselIndex.value + 1 : 0
  resetCarouselTimer()
}

function startCarouselTimer() {
  if (imageAttachments.value.length <= 1) return
  carouselTimer = setInterval(() => {
    carouselIndex.value =
      carouselIndex.value < imageAttachments.value.length - 1 ? carouselIndex.value + 1 : 0
  }, 4000)
}

function resetCarouselTimer() {
  if (carouselTimer) clearInterval(carouselTimer)
  startCarouselTimer()
}

function handleCarouselTouchStart(e: TouchEvent) {
  const touch = e.touches[0]
  if (!touch) return
  carouselTouchStartX.value = touch.clientX
}

function handleCarouselTouchEnd(e: TouchEvent) {
  const touch = e.changedTouches[0]
  if (!touch) return
  const dx = touch.clientX - carouselTouchStartX.value
  if (dx > 50) carouselPrev()
  else if (dx < -50) carouselNext()
}


// Lightbox
const lightboxOpen = ref(false)
const lightboxIndex = ref(0)
const lightboxCurrent = computed(() => imageAttachments.value[lightboxIndex.value] ?? null)
const touchStartX = ref(0)

function openLightbox(index: number) {
  lightboxIndex.value = index
  lightboxOpen.value = true
  document.body.style.overflow = 'hidden'
}

function closeLightbox() {
  lightboxOpen.value = false
  document.body.style.overflow = ''
}

function lightboxPrev() {
  lightboxIndex.value =
    lightboxIndex.value > 0 ? lightboxIndex.value - 1 : imageAttachments.value.length - 1
}

function lightboxNext() {
  lightboxIndex.value =
    lightboxIndex.value < imageAttachments.value.length - 1 ? lightboxIndex.value + 1 : 0
}

function handleTouchStart(e: TouchEvent) {
  const touch = e.touches[0]
  if (!touch) return
  touchStartX.value = touch.clientX
}

function handleTouchEnd(e: TouchEvent) {
  const touch = e.changedTouches[0]
  if (!touch) return
  const dx = touch.clientX - touchStartX.value
  if (dx > 50) lightboxPrev()
  else if (dx < -50) lightboxNext()
}

function handleKeydown(e: KeyboardEvent) {
  if (!lightboxOpen.value) return
  if (e.key === 'ArrowLeft') lightboxPrev()
  else if (e.key === 'ArrowRight') lightboxNext()
  else if (e.key === 'Escape') closeLightbox()
}

const id = computed(() => route.params.id as string)

const periode = computed(() => {
  if (!activity.value) return ''
  if (activity.value.endDate)
    return `${formatDate(activity.value.startDate)} – ${formatDate(activity.value.endDate)}`
  return formatDate(activity.value.startDate)
})

function formatDate(dateStr: string) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

function formatDateTime(dateStr: string) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('')
}

function isOwnReply(reply: ReplyResponse) {
  return reply.authorUsername === currentUser.value?.username
}

function isEdited(reply: ReplyResponse) {
  return !!reply.updatedAt && reply.updatedAt !== reply.createdAt
}

async function loadReplies() {
  repliesState.value = 'loading'
  replyErrorMessage.value = ''

  try {
    const data = await store.fetchReplies(id.value)
    replies.value = data
    repliesState.value = data.length > 0 ? 'success' : 'empty'
  } catch (error) {
    replyErrorMessage.value = error instanceof Error ? error.message : 'Gagal memuat reply'
    repliesState.value = 'error'
  }
}

async function submitReply(parentReplyId: string | null = null) {
  const content = parentReplyId ? inlineReplyContent.value : newReplyContent.value
  const trimmed = content.trim()

  if (!trimmed) {
    if (parentReplyId) inlineReplyError.value = 'Konten reply wajib diisi.'
    else newReplyError.value = 'Konten reply wajib diisi.'
    return
  }

  if (parentReplyId) creatingInlineReply.value = true
  else creatingReply.value = true

  try {
    const created = await store.createReply(id.value, {
      content: trimmed,
      parentReplyId,
    })

    replies.value.push(created)
    repliesState.value = 'success'

    if (parentReplyId) {
      inlineReplyContent.value = ''
      inlineReplyError.value = ''
      replyingToId.value = null
    } else {
      newReplyContent.value = ''
      newReplyError.value = ''
    }
  } catch {
    // toast handled in store
  } finally {
    if (parentReplyId) creatingInlineReply.value = false
    else creatingReply.value = false
  }
}

function openInlineReply(replyId: string) {
  replyingToId.value = replyId
  inlineReplyContent.value = ''
  inlineReplyError.value = ''
}

function cancelInlineReply() {
  replyingToId.value = null
  inlineReplyContent.value = ''
  inlineReplyError.value = ''
}

function openEdit(reply: ReplyResponse) {
  editingReplyId.value = reply.replyId
  editReplyContent.value = reply.content
  editReplyError.value = ''
  replyingToId.value = null
}

function cancelEdit() {
  editingReplyId.value = null
  editReplyContent.value = ''
  editReplyError.value = ''
}

async function saveEdit(replyId: string) {
  const trimmed = editReplyContent.value.trim()
  if (!trimmed) {
    editReplyError.value = 'Konten reply wajib diisi.'
    return
  }

  updatingReply.value = true
  try {
    const updated = await store.updateReply(replyId, { content: trimmed })
    const idx = replies.value.findIndex((r) => r.replyId === replyId)
    if (idx >= 0) replies.value[idx] = updated
    cancelEdit()
  } catch {
    // toast handled in store
  } finally {
    updatingReply.value = false
  }
}

function askDelete(replyId: string) {
  deletingReplyId.value = replyId
}

function cancelDeleteReply() {
  deletingReplyId.value = null
}

function removeReplyTree(replyId: string) {
  const children = replies.value
    .filter((r) => r.parentReplyId === replyId)
    .map((r) => r.replyId)

  for (const childId of children) {
    removeReplyTree(childId)
  }

  replies.value = replies.value.filter((r) => r.replyId !== replyId)
}

async function confirmDeleteReply() {
  if (!deletingReplyId.value) return

  deletingReply.value = true
  try {
    await store.deleteReply(deletingReplyId.value)
    removeReplyTree(deletingReplyId.value)
    deletingReplyId.value = null
    repliesState.value = replies.value.length > 0 ? 'success' : 'empty'
  } catch {
    // toast handled in store
  } finally {
    deletingReply.value = false
  }
}

const STATUS_LABEL: Record<string, string> = {
  CREATED: 'Draft',
  PUBLISHED: 'Diterbitkan',
  ARCHIVED: 'Diarsipkan',
}

const STATUS_CLASS: Record<string, string> = {
  CREATED: 'badge-draft',
  PUBLISHED: 'badge-published',
  ARCHIVED: 'badge-archived',
}

async function loadData() {
  loading.value = true
  notFound.value = false
  try {
    activity.value = await store.fetchActivityById(id.value)
    try {
      attachments.value = await store.fetchAttachments(id.value)
    } catch {
      attachments.value = []
    }

    await loadReplies()
  } catch {
    notFound.value = true
  } finally {
    loading.value = false
  }
}

async function handleDeleteConfirm() {
  if (!activity.value) return
  try {
    await store.deleteActivity(activity.value.id)
    showDelete.value = false
    router.push('/activities')
  } catch {
    // handled by store
  }
}

onMounted(() => {
  loadData().then(() => startCarouselTimer())
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  document.body.style.overflow = ''
  if (carouselTimer) clearInterval(carouselTimer)
})
</script>

<template>
  <div class="layout">
    <AsisSidebar />

    <!-- Loading -->
    <main v-if="loading" class="content">
      <div class="center-state">
        <div class="spinner-ring"></div>
        <p class="state-label">Memuat postingan...</p>
      </div>
    </main>

    <!-- 404 -->
    <main v-else-if="notFound" class="content">
      <div class="center-state">
        <div class="state-icon-wrap warn-bg">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#F5A623"
            stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </div>
        <h2 class="state-title">Postingan tidak ditemukan</h2>
        <p class="state-sub">Data postingan dengan ID tersebut tidak tersedia dalam sistem.</p>
        <button class="btn-primary" @click="router.push('/activities')">Kembali ke Daftar</button>
      </div>
    </main>

    <!-- Detail -->
    <main v-else-if="activity" class="content">
      <div class="detail-wrapper">

        <!-- Breadcrumb -->
        <nav class="breadcrumb">
          <button class="bc-link" @click="router.push('/activities')">Kelola Postingan</button>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#c4c4c4" stroke-width="2" stroke-linecap="round">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
          <span class="bc-current">Detail Postingan</span>
        </nav>

        <!-- Page Header -->
        <div class="page-header">
          <h1 class="page-title">Detail Postingan</h1>
          <div class="header-actions">
            <button class="btn-edit" @click="router.push(`/activities/${id}/edit`)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              Edit
            </button>
            <button class="btn-danger" @click="showDelete = true">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                <path d="M10 11v6M14 11v6"/>
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
              </svg>
              Hapus
            </button>
          </div>
        </div>

        <!-- Hero Carousel -->
        <div
          class="hero-wrap"
          @touchstart.passive="handleCarouselTouchStart"
          @touchend.passive="handleCarouselTouchEnd"
        >
          <!-- Slides -->
          <template v-if="imageAttachments.length > 0">
            <Transition name="carousel" mode="out-in">
              <img
                :key="carouselIndex"
                :src="currentCarouselImage?.url"
                :alt="currentCarouselImage?.filename"
                class="hero-img hero-clickable"
                @click="openLightbox(carouselIndex)"
              />
            </Transition>

            <!-- Prev / Next arrows -->
            <button
              v-if="imageAttachments.length > 1"
              class="carousel-arrow carousel-prev"
              @click.stop="carouselPrev"
              aria-label="Sebelumnya"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
            <button
              v-if="imageAttachments.length > 1"
              class="carousel-arrow carousel-next"
              @click.stop="carouselNext"
              aria-label="Berikutnya"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>

            <!-- Bottom overlay: zoom hint + dots -->
            <div class="hero-overlay always-visible">
              <div class="carousel-dots" v-if="imageAttachments.length > 1">
                <button
                  v-for="(_, idx) in imageAttachments"
                  :key="idx"
                  :class="['carousel-dot', { 'carousel-dot-active': idx === carouselIndex }]"
                  @click.stop="() => { carouselIndex = idx; resetCarouselTimer() }"
                  :aria-label="`Foto ${idx + 1}`"
                />
              </div>
              <span class="hero-pill" style="cursor:zoom-in" @click.stop="openLightbox(carouselIndex)">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                Lihat Detail
              </span>
            </div>
          </template>

          <!-- No image placeholder -->
          <div v-else class="hero-placeholder">
            <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#d4d4d4" stroke-width="1.5" stroke-linecap="round">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
            <span>Belum ada gambar</span>
          </div>
        </div>

        <!-- Main Content Card -->
        <div class="card">
          <div class="tag-row">
            <span class="tag cat-tag">{{ activity.category }}</span>
            <span class="tag prog-tag">{{ activity.program }}</span>
            <span :class="['status-badge', STATUS_CLASS[activity.status] ?? 'badge-draft']">
              {{ STATUS_LABEL[activity.status] ?? activity.status }}
            </span>
          </div>

          <h2 class="act-title">{{ activity.title }}</h2>

          <div class="meta-strip">
            <div class="meta-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00c6ac" stroke-width="2" stroke-linecap="round">
                <rect x="3" y="4" width="18" height="18" rx="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              <span class="meta-bold">{{ periode }}</span>
            </div>
            <span class="meta-sep">·</span>
            <div class="meta-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00c6ac" stroke-width="2" stroke-linecap="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              <span>{{ activity.createdByUsername }}</span>
            </div>
            <span class="meta-sep">·</span>
            <div class="meta-item muted">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a1a1a1" stroke-width="2" stroke-linecap="round">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
              <span>Dibuat {{ formatDate(activity.createdAt) }}</span>
            </div>
          </div>

          <div class="card-divider"></div>

          <div class="description-block">
            <p>{{ activity.description }}</p>
          </div>
        </div>

        <section class="card replies-card">
          <div class="replies-head">
            <div>
              <h3 class="replies-title">Diskusi</h3>
              <p class="replies-sub" v-if="repliesState === 'success'">{{ replies.length }} tanggapan</p>
            </div>
            <button class="btn-edit" v-if="repliesState === 'error'" @click="loadReplies">
              Coba Lagi
            </button>
          </div>

          <div v-if="canWriteReply" class="reply-composer">
            <div class="avatar-chip" :class="currentUser?.role?.toUpperCase() === 'PENGURUS' ? 'avatar-pengurus' : 'avatar-donatur'">
              {{ getInitials(currentUser?.nama ?? 'User') }}
            </div>
            <div class="composer-body">
              <textarea
                v-model="newReplyContent"
                rows="3"
                class="reply-textarea"
                :class="{ 'reply-textarea-error': !!newReplyError }"
                placeholder="Tulis tanggapan atau pertanyaan Anda..."
                @input="newReplyError = ''"
              />
              <p v-if="newReplyError" class="reply-error">{{ newReplyError }}</p>
              <div class="composer-actions">
                <button class="btn-primary" :disabled="creatingReply" @click="submitReply()">
                  {{ creatingReply ? 'Mengirim...' : 'Kirim' }}
                </button>
              </div>
            </div>
          </div>

          <div v-if="repliesState === 'loading'" class="replies-list">
            <div v-for="n in 3" :key="n" class="reply-skeleton"></div>
          </div>

          <div v-else-if="repliesState === 'error'" class="reply-state">
            <p>Gagal memuat reply.</p>
            <p class="reply-state-sub">{{ replyErrorMessage || 'Terjadi kesalahan saat mengambil data.' }}</p>
          </div>

          <div v-else-if="repliesState === 'empty'" class="reply-state">
            <p>Belum ada reply.</p>
            <p class="reply-state-sub">Jadilah yang pertama memberikan tanggapan.</p>
          </div>

          <div v-else class="replies-list">
            <article
              v-for="item in threadedReplies"
              :key="item.reply.replyId"
              class="reply-item"
              :class="{ child: item.depth > 0 }"
              :style="{ marginLeft: `${Math.min(item.depth, 8) * 42}px` }"
            >
              <div class="reply-main">
                <div class="avatar-chip" :class="item.reply.authorRole.toUpperCase() === 'PENGURUS' ? 'avatar-pengurus' : 'avatar-donatur'">
                  {{ getInitials(item.reply.authorName) }}
                </div>
                <div class="reply-body">
                  <div class="reply-meta">
                    <strong>{{ item.reply.authorName }}</strong>
                    <span class="role-badge" :class="item.reply.authorRole.toUpperCase() === 'PENGURUS' ? 'role-pengurus' : 'role-donatur'">
                      {{ item.reply.authorRole }}
                    </span>
                    <span v-if="isEdited(item.reply)" class="edited-mark">(diedit)</span>
                  </div>
                  <p class="reply-time">{{ formatDateTime(isEdited(item.reply) ? item.reply.updatedAt : item.reply.createdAt) }}</p>

                  <div v-if="editingReplyId === item.reply.replyId" class="edit-box">
                    <textarea
                      v-model="editReplyContent"
                      rows="3"
                      class="reply-textarea"
                      :class="{ 'reply-textarea-error': !!editReplyError }"
                      @input="editReplyError = ''"
                    />
                    <p v-if="editReplyError" class="reply-error">{{ editReplyError }}</p>
                    <div class="inline-actions">
                      <button class="btn-edit" @click="cancelEdit">Batal</button>
                      <button class="btn-primary" :disabled="updatingReply" @click="saveEdit(item.reply.replyId)">
                        {{ updatingReply ? 'Menyimpan...' : 'Simpan' }}
                      </button>
                    </div>
                  </div>

                  <template v-else>
                    <p class="reply-content">{{ item.reply.content }}</p>
                    <div class="reply-actions">
                      <button v-if="canWriteReply" class="text-action" @click="openInlineReply(item.reply.replyId)">Balas</button>
                      <button v-if="isOwnReply(item.reply)" class="text-action" @click="openEdit(item.reply)">Edit</button>
                      <button v-if="isOwnReply(item.reply)" class="text-action danger" @click="askDelete(item.reply.replyId)">Hapus</button>
                    </div>
                  </template>
                </div>
              </div>

              <div v-if="replyingToId === item.reply.replyId" class="inline-reply">
                <textarea
                  v-model="inlineReplyContent"
                  rows="2"
                  class="reply-textarea"
                  :class="{ 'reply-textarea-error': !!inlineReplyError }"
                  :placeholder="`Balas komentar ${item.reply.authorName}...`"
                  @input="inlineReplyError = ''"
                />
                <p v-if="inlineReplyError" class="reply-error">{{ inlineReplyError }}</p>
                <div class="inline-actions">
                  <button class="btn-edit" @click="cancelInlineReply">Batal</button>
                  <button class="btn-primary" :disabled="creatingInlineReply" @click="submitReply(item.reply.replyId)">
                    {{ creatingInlineReply ? 'Mengirim...' : 'Kirim Balasan' }}
                  </button>
                </div>
              </div>
            </article>
          </div>
        </section>

        <!-- Footer -->
        <div class="footer-row">
          <button class="btn-back" @click="router.push('/activities')">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <line x1="19" y1="12" x2="5" y2="12"/>
              <polyline points="12 19 5 12 12 5"/>
            </svg>
            Kembali ke Daftar
          </button>
        </div>
      </div>
    </main>

    <!-- Lightbox -->
    <Teleport to="body">
      <Transition name="lb-fade">
        <div
          v-if="lightboxOpen"
          class="lightbox"
          @click.self="closeLightbox"
          @touchstart.passive="handleTouchStart"
          @touchend.passive="handleTouchEnd"
        >
          <!-- Top Bar -->
          <div class="lb-topbar">
            <span class="lb-counter">{{ lightboxIndex + 1 }} / {{ imageAttachments.length }}</span>
            <button class="lb-close" @click="closeLightbox" aria-label="Tutup">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <!-- Prev Arrow -->
          <button
            v-if="imageAttachments.length > 1"
            class="lb-arrow lb-prev"
            @click.stop="lightboxPrev"
            aria-label="Sebelumnya"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>

          <!-- Image -->
          <Transition name="lb-img" mode="out-in">
            <img
              :key="lightboxIndex"
              :src="lightboxCurrent?.url"
              :alt="lightboxCurrent?.filename"
              class="lb-img"
            />
          </Transition>

          <!-- Next Arrow -->
          <button
            v-if="imageAttachments.length > 1"
            class="lb-arrow lb-next"
            @click.stop="lightboxNext"
            aria-label="Berikutnya"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>

          <!-- Bottom: filename + dots -->
          <div class="lb-bottom">
            <p v-if="lightboxCurrent?.filename" class="lb-filename">{{ lightboxCurrent.filename }}</p>
            <div v-if="imageAttachments.length > 1" class="lb-dots">
              <button
                v-for="(_, idx) in imageAttachments"
                :key="idx"
                :class="['lb-dot', { 'lb-dot-active': idx === lightboxIndex }]"
                @click.stop="lightboxIndex = idx"
                :aria-label="`Foto ${idx + 1}`"
              />
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Delete Modal -->
    <DeleteActivityModal
      :isOpen="showDelete"
      :title="activity?.title ?? ''"
      :category="activity?.category ?? ''"
      :program="activity?.program ?? ''"
      @confirm="handleDeleteConfirm"
      @cancel="showDelete = false"
    />

    <Teleport to="body">
      <Transition name="lb-fade">
        <div v-if="deletingReplyId" class="confirm-overlay" @click.self="cancelDeleteReply">
          <div class="confirm-box">
            <h3>Hapus Reply?</h3>
            <p>Reply yang dihapus tidak dapat dikembalikan.</p>
            <div class="confirm-actions">
              <button class="btn-edit" :disabled="deletingReply" @click="cancelDeleteReply">Batal</button>
              <button class="btn-danger-solid" :disabled="deletingReply" @click="confirmDeleteReply">
                {{ deletingReply ? 'Menghapus...' : 'Hapus' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
/* ── Layout ─────────────────────────────────────────── */
.layout {
  display: flex;
  min-height: 100vh;
  background: #f4f6f8;
  font-family: 'Manrope', system-ui, -apple-system, sans-serif;
}

.content {
  flex: 1;
  overflow-y: auto;
  padding: 36px 40px;
}

.detail-wrapper {
  max-width: 860px;
  margin: 0 auto;
}

/* ── Center States ───────────────────────────────────── */
.center-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 65vh;
  gap: 12px;
}

.spinner-ring {
  width: 40px;
  height: 40px;
  border: 3px solid #e0f7f4;
  border-top-color: #00c6ac;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.state-label {
  font-size: 14px;
  color: #737373;
  margin: 0;
}

.state-icon-wrap {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;
}

.warn-bg { background: #fff8e1; }

.state-title {
  font-family: 'Poppins', sans-serif;
  font-weight: 600;
  font-size: 20px;
  color: #1a1a1a;
  margin: 0;
}

.state-sub {
  font-size: 14px;
  color: #737373;
  margin: 0 0 8px;
}

/* ── Breadcrumb ──────────────────────────────────────── */
.breadcrumb {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 20px;
}

.bc-link {
  background: none;
  border: none;
  padding: 0;
  font-size: 13px;
  color: #00c6ac;
  font-family: 'Manrope', sans-serif;
  cursor: pointer;
  font-weight: 500;
}

.bc-link:hover { text-decoration: underline; }

.bc-current {
  font-size: 13px;
  color: #a1a1a1;
}

/* ── Page Header ─────────────────────────────────────── */
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 28px;
}

.page-title {
  font-family: 'Poppins', sans-serif;
  font-weight: 700;
  font-size: 28px;
  color: #1a1a1a;
  margin: 0;
  letter-spacing: -0.3px;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.btn-edit {
  display: flex;
  align-items: center;
  gap: 7px;
  height: 38px;
  padding: 0 16px;
  border-radius: 8px;
  border: 1.5px solid #00c6ac;
  background: #fff;
  color: #00c6ac;
  font-family: 'Manrope', sans-serif;
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.15s, transform 0.1s;
}

.btn-edit:hover {
  background: #f0fdfb;
  transform: translateY(-1px);
}

.btn-danger {
  display: flex;
  align-items: center;
  gap: 7px;
  height: 38px;
  padding: 0 16px;
  border-radius: 8px;
  border: 1.5px solid #ef4444;
  background: #fff;
  color: #ef4444;
  font-family: 'Manrope', sans-serif;
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.15s, transform 0.1s;
}

.btn-danger:hover {
  background: #fff5f5;
  transform: translateY(-1px);
}

/* ── Hero Image ──────────────────────────────────────── */
.hero-wrap {
  position: relative;
  border-radius: 16px;
  overflow: hidden;
  height: 380px;
  background: #e8e8e8;
  margin-bottom: 24px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

.hero-clickable { cursor: zoom-in; }

.hero-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.hero-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #a1a1a1;
  font-size: 13px;
}

/* Carousel arrows */
.carousel-arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.18);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 4;
  backdrop-filter: blur(6px);
  transition: background 0.2s, transform 0.2s;
  opacity: 0;
  transition: opacity 0.2s, background 0.2s;
}

.hero-wrap:hover .carousel-arrow { opacity: 1; }

.carousel-arrow:hover {
  background: rgba(255, 255, 255, 0.32);
}

.carousel-prev { left: 14px; }
.carousel-next { right: 14px; }

/* Bottom overlay */
.hero-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 20px 20px 18px;
  background: linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 100%);
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  z-index: 3;
  pointer-events: none;
}

.hero-overlay > * { pointer-events: auto; }

.hero-overlay.always-visible { opacity: 1; }

/* Dot indicators */
.carousel-dots {
  display: flex;
  gap: 5px;
  align-items: center;
}

.carousel-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.45);
  cursor: pointer;
  padding: 0;
  transition: background 0.2s, transform 0.2s;
}

.carousel-dot-active {
  background: #fff;
  transform: scale(1.3);
}

.hero-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 12px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.18);
  backdrop-filter: blur(6px);
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  border: 1px solid rgba(255,255,255,0.28);
  transition: background 0.2s;
}

.hero-pill:hover {
  background: rgba(255, 255, 255, 0.3);
}

/* Carousel slide transition */
.carousel-enter-active,
.carousel-leave-active {
  transition: opacity 0.45s ease, transform 0.45s ease;
  position: absolute;
  inset: 0;
}

.carousel-enter-from {
  opacity: 0;
  transform: scale(1.04);
}

.carousel-leave-to {
  opacity: 0;
  transform: scale(0.97);
}

/* ── Card ────────────────────────────────────────────── */
.card {
  background: #fff;
  border-radius: 16px;
  border: 1px solid #ebebeb;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
  padding: 28px 32px;
  margin-bottom: 20px;
}

/* ── Tags & Status ───────────────────────────────────── */
.tag-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}

.tag {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}

.cat-tag {
  background: #e0f7f4;
  color: #00a896;
}

.prog-tag {
  background: #ede9fe;
  color: #7c3aed;
}

.status-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.2px;
}

.badge-draft    { background: #fef9c3; color: #a16207; }
.badge-published{ background: #dcfce7; color: #15803d; }
.badge-archived { background: #f3f4f6; color: #6b7280; }

/* ── Title & Meta ────────────────────────────────────── */
.act-title {
  font-family: 'Poppins', sans-serif;
  font-weight: 700;
  font-size: 26px;
  color: #1a1a1a;
  margin: 0 0 20px;
  line-height: 1.35;
  letter-spacing: -0.2px;
}

.meta-strip {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 24px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #525252;
}

.meta-item.muted { color: #a1a1a1; }

.meta-bold { font-weight: 600; color: #1a1a1a; }

.meta-sep { color: #d4d4d4; font-size: 16px; }

.card-divider {
  height: 1px;
  background: #f0f0f0;
  margin-bottom: 24px;
}

.description-block p {
  font-size: 15px;
  color: #404040;
  line-height: 1.85;
  white-space: pre-wrap;
  margin: 0;
}

/* ── Gallery ─────────────────────────────────────────── */
.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.section-title {
  font-family: 'Poppins', sans-serif;
  font-weight: 600;
  font-size: 15px;
  color: #1a1a1a;
  margin: 0;
}

.section-count {
  font-size: 12px;
  color: #a1a1a1;
  font-weight: 500;
}

.gallery-grid {
  display: grid;
  gap: 8px;
}

.gallery-1 { grid-template-columns: 1fr; }
.gallery-2 { grid-template-columns: repeat(2, 1fr); }
.gallery-3plus { grid-template-columns: repeat(3, 1fr); }

.gallery-cell {
  position: relative;
  border-radius: 10px;
  overflow: hidden;
  cursor: zoom-in;
  background: #f0f0f0;
  aspect-ratio: 1 / 1;
}

.gallery-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.35s ease;
  display: block;
}

.gallery-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.25s;
}

.gallery-cell:hover .gallery-img { transform: scale(1.06); }
.gallery-cell:hover .gallery-overlay { opacity: 1; }

/* ── File Attachments ────────────────────────────────── */
.files-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.file-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 10px;
  background: #f8f9fb;
  border: 1px solid #eee;
  text-decoration: none;
  color: #1a1a1a;
  transition: background 0.15s;
}

.file-row:hover { background: #f0f9ff; }

.file-icon {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  background: #e0f7f4;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.file-name {
  flex: 1;
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-ext-icon { flex-shrink: 0; }

/* ── Footer ──────────────────────────────────────────── */
.footer-row {
  display: flex;
  margin-top: 4px;
  margin-bottom: 40px;
}

.btn-back {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 42px;
  padding: 0 20px;
  border-radius: 10px;
  border: 1.5px solid #d4d4d4;
  background: #fff;
  color: #525252;
  font-family: 'Manrope', sans-serif;
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}

.btn-back:hover {
  background: #f5f5f5;
  border-color: #b5b5b5;
}

.btn-primary {
  height: 42px;
  padding: 0 24px;
  border-radius: 10px;
  border: none;
  background: #00c6ac;
  color: #fff;
  font-family: 'Manrope', sans-serif;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.15s;
}

.btn-primary:hover { background: #00b39c; }

/* ── Lightbox ────────────────────────────────────────── */
.lightbox {
  position: fixed;
  inset: 0;
  z-index: 9000;
  background: rgba(10, 10, 10, 0.93);
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(10px);
}

/* Top bar */
.lb-topbar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  background: linear-gradient(to bottom, rgba(0,0,0,0.6), transparent);
}

.lb-counter {
  font-size: 14px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.85);
  font-family: 'Manrope', sans-serif;
  letter-spacing: 0.5px;
}

.lb-close {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.2s;
}

.lb-close:hover { background: rgba(255, 255, 255, 0.25); }

/* Arrows */
.lb-arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.2s, transform 0.2s;
  z-index: 10;
  backdrop-filter: blur(4px);
}

.lb-arrow:hover {
  background: rgba(255, 255, 255, 0.25);
  transform: translateY(-50%) scale(1.05);
}

.lb-prev { left: 20px; }
.lb-next { right: 20px; }

/* Image */
.lb-img {
  max-width: calc(100vw - 140px);
  max-height: calc(100vh - 160px);
  object-fit: contain;
  border-radius: 10px;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.5);
  user-select: none;
  -webkit-user-drag: none;
}

/* Bottom */
.lb-bottom {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 16px 20px 24px;
  background: linear-gradient(to top, rgba(0,0,0,0.6), transparent);
}

.lb-filename {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  font-family: 'Manrope', sans-serif;
  margin: 0;
  max-width: 400px;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.lb-dots {
  display: flex;
  gap: 6px;
  align-items: center;
}

.lb-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.35);
  cursor: pointer;
  padding: 0;
  transition: background 0.2s, transform 0.2s;
}

.lb-dot-active {
  background: #fff;
  transform: scale(1.3);
}

/* ── Lightbox Transitions ────────────────────────────── */
.lb-fade-enter-active,
.lb-fade-leave-active {
  transition: opacity 0.25s ease;
}

.lb-fade-enter-from,
.lb-fade-leave-to {
  opacity: 0;
}

.lb-img-enter-active,
.lb-img-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.lb-img-enter-from {
  opacity: 0;
  transform: scale(0.96);
}

.lb-img-leave-to {
  opacity: 0;
  transform: scale(1.04);
}

/* ── Replies ─────────────────────────────────────────── */
.replies-card {
  padding-top: 22px;
}

.replies-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.replies-title {
  margin: 0;
  font-family: 'Poppins', sans-serif;
  font-size: 21px;
  font-weight: 700;
  color: #1a1a1a;
}

.replies-sub {
  margin: 4px 0 0;
  font-size: 12px;
  color: #8a8a8a;
}

.reply-composer {
  display: flex;
  gap: 12px;
  border: 1px solid #e9f7f5;
  background: #fbfffe;
  border-radius: 12px;
  padding: 14px;
  margin-bottom: 16px;
}

.composer-body {
  flex: 1;
}

.reply-textarea {
  width: 100%;
  border: 1px solid #d9e2e8;
  border-radius: 10px;
  padding: 10px 12px;
  resize: vertical;
  font-family: 'Manrope', sans-serif;
  font-size: 14px;
  color: #1f2937;
  outline: none;
  box-sizing: border-box;
}

.reply-textarea:focus {
  border-color: #00c6ac;
  box-shadow: 0 0 0 3px rgba(0, 198, 172, 0.14);
}

.reply-textarea-error {
  border-color: #ef4444;
}

.reply-error {
  margin: 6px 0 0;
  color: #dc2626;
  font-size: 12px;
  font-weight: 600;
}

.composer-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
}

.replies-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.reply-item {
  background: #fbfbfb;
  border: 1px solid #ececec;
  border-radius: 12px;
  padding: 12px;
  transition: background 0.2s;
}

.reply-item:hover {
  background: #f6fffd;
}

.reply-item.child {
  margin-top: 8px;
  margin-left: 42px;
}

.reply-main {
  display: flex;
  gap: 10px;
}

.avatar-chip {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
  flex-shrink: 0;
}

.avatar-donatur {
  background: #e6faf7;
  color: #00b39c;
}

.avatar-pengurus {
  background: #00c6ac;
  color: #ffffff;
}

.reply-body {
  flex: 1;
  min-width: 0;
}

.reply-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.role-badge {
  padding: 2px 9px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
}

.role-donatur {
  background: #e6faf7;
  color: #00b39c;
  border: 1px solid rgba(0, 179, 156, 0.25);
}

.role-pengurus {
  background: #00c6ac;
  color: #ffffff;
}

.edited-mark {
  font-size: 12px;
  color: #9ca3af;
}

.reply-time {
  margin: 4px 0 8px;
  color: #9ca3af;
  font-size: 12px;
}

.reply-content {
  margin: 0;
  color: #444;
  line-height: 1.6;
}

.reply-actions {
  margin-top: 8px;
  display: flex;
  gap: 8px;
}

.text-action {
  background: none;
  border: none;
  padding: 0;
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.text-action:hover {
  color: #00b39c;
}

.text-action.danger:hover {
  color: #dc2626;
}

.inline-reply {
  margin: 8px 0 0 52px;
  border: 1px solid #d6f6f1;
  border-radius: 10px;
  background: #ffffff;
  padding: 10px;
}

.inline-actions {
  margin-top: 8px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.reply-children {
  margin-top: 6px;
}

.reply-state {
  border: 1px dashed #dcdcdc;
  border-radius: 12px;
  padding: 20px;
  text-align: center;
  color: #525252;
}

.reply-state-sub {
  margin: 6px 0 0;
  color: #9ca3af;
  font-size: 13px;
}

.reply-skeleton {
  height: 78px;
  border-radius: 10px;
  background: linear-gradient(90deg, #f3f4f6, #eceff1, #f3f4f6);
  background-size: 180% 100%;
  animation: shimmer 1.2s infinite;
}

@keyframes shimmer {
  from { background-position: 180% 0; }
  to { background-position: -180% 0; }
}

/* ── Reply Delete Modal ─────────────────────────────── */
.confirm-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9200;
}

.confirm-box {
  width: 420px;
  max-width: calc(100vw - 32px);
  background: #fff;
  border-radius: 14px;
  border: 1px solid #ececec;
  padding: 22px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
  font-family: 'Manrope', system-ui, -apple-system, sans-serif;
}

.confirm-box h3 {
  margin: 0;
  font-family: 'Poppins', sans-serif;
  font-size: 20px;
}

.confirm-box p {
  margin: 8px 0 0;
  font-family: 'Manrope', system-ui, -apple-system, sans-serif;
  color: #525252;
  font-size: 14px;
}

.confirm-actions {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.btn-danger-solid {
  height: 38px;
  padding: 0 16px;
  border-radius: 8px;
  border: none;
  background: #ef4444;
  color: #fff;
  font-weight: 700;
  cursor: pointer;
}

.btn-danger-solid:hover {
  background: #dc2626;
}

.btn-danger-solid:disabled,
.btn-primary:disabled,
.btn-edit:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}
</style>
