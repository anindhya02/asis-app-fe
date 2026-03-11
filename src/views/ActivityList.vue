<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, computed, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useActivityStore } from '@/stores/activity.store'
import AsisSidebar from '@/components/AsisSidebar.vue'
import DeleteActivityModal from '@/components/DeleteActivityModal.vue'
import type { ActivityResponse, AttachmentResponse } from '@/interfaces/activity.interface'

const store = useActivityStore()
const router = useRouter()

const ITEMS_PER_PAGE = 6
const CAROUSEL_INTERVAL = 3000

const search = ref('')
const startDate = ref('')
const endDate = ref('')
const dateRangeError = ref('')
const currentPage = ref(1)

const deleteTarget = ref<ActivityResponse | null>(null)
const deleteModalRef = ref<InstanceType<typeof DeleteActivityModal> | null>(null)

// Attachments map: activityId -> AttachmentResponse[]
const attachmentsMap = ref<Record<string, AttachmentResponse[]>>({})
// Carousel current index per activity
const carouselIndex = ref<Record<string, number>>({})
// Carousel interval timers
const carouselTimers: Record<string, ReturnType<typeof setInterval>> = {}

const filtered = computed(() => {
  return store.items.filter((item) => {
    const matchSearch =
      !search.value ||
      item.title.toLowerCase().includes(search.value.toLowerCase()) ||
      item.description.toLowerCase().includes(search.value.toLowerCase())
    const matchStart = !startDate.value || item.createdAt >= startDate.value
    const matchEnd = !endDate.value || item.createdAt <= endDate.value
    return matchSearch && matchStart && matchEnd
  })
})

const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / ITEMS_PER_PAGE)))

const paginated = computed(() => {
  const start = (currentPage.value - 1) * ITEMS_PER_PAGE
  return filtered.value.slice(start, start + ITEMS_PER_PAGE)
})

function getImages(activityId: string): AttachmentResponse[] {
  return (attachmentsMap.value[activityId] || []).filter((a) =>
    a.type?.startsWith('image/'),
  )
}

function getCurrentIndex(activityId: string): number {
  return carouselIndex.value[activityId] ?? 0
}

function startCarousel(activityId: string) {
  stopCarousel(activityId)
  const images = getImages(activityId)
  if (images.length <= 1) return
  carouselTimers[activityId] = setInterval(() => {
    const current = carouselIndex.value[activityId] ?? 0
    carouselIndex.value[activityId] = (current + 1) % images.length
  }, CAROUSEL_INTERVAL)
}

function stopCarousel(activityId: string) {
  if (carouselTimers[activityId]) {
    clearInterval(carouselTimers[activityId])
    delete carouselTimers[activityId]
  }
}

function stopAllCarousels() {
  Object.keys(carouselTimers).forEach(stopCarousel)
}

async function loadAttachmentsForPage() {
  const ids = paginated.value.map((item) => item.id)
  await Promise.all(
    ids
      .filter((id) => !(id in attachmentsMap.value))
      .map(async (id) => {
        try {
          const atts = await store.fetchAttachments(id)
          attachmentsMap.value[id] = atts
        } catch {
          attachmentsMap.value[id] = []
        }
      }),
  )
  // Start carousels for visible items
  ids.forEach((id) => {
    carouselIndex.value[id] = carouselIndex.value[id] ?? 0
    startCarousel(id)
  })
}

// Reload attachments when paginated items change
watch(paginated, () => {
  stopAllCarousels()
  nextTick(() => loadAttachmentsForPage())
})

function formatPeriode(item: ActivityResponse) {
  if (item.endDate) return `${item.startDate} - ${item.endDate}`
  return item.startDate
}

function formatDate(dateStr: string) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

function onSearchChange() {
  currentPage.value = 1
}

function onDateChange() {
  if (startDate.value && endDate.value && endDate.value < startDate.value) {
    dateRangeError.value = 'Tanggal akhir tidak boleh lebih kecil dari tanggal mulai'
    return
  }
  dateRangeError.value = ''
  currentPage.value = 1
}

async function handleDeleteConfirm() {
  if (!deleteTarget.value) return
  const targetId = deleteTarget.value.id
  try {
    await store.deleteActivity(targetId)
    delete attachmentsMap.value[targetId]
    stopCarousel(targetId)
    deleteTarget.value = null
  } catch {
    // error already handled by store
  } finally {
    deleteModalRef.value?.resetLoading()
  }
}

onMounted(async () => {
  await store.fetchActivities()
  await loadAttachmentsForPage()
})

onBeforeUnmount(() => {
  stopAllCarousels()
})
</script>

<template>
  <div class="layout">
    <AsisSidebar />
    <main class="content">
      <header class="content-header">
        <div>
          <h1 class="page-title">Kelola Postingan Kegiatan</h1>
          <p class="page-subtitle">Dokumentasikan dan publikasikan kegiatan yayasan</p>
        </div>
      </header>

      <!-- Filter Card -->
      <section class="filter-card">
        <div class="filter-dates">
          <div class="field">
            <label>Tanggal Mulai</label>
            <input v-model="startDate" :max="endDate || undefined" type="date" @change="onDateChange" />
          </div>
          <div class="field">
            <label>Tanggal Akhir</label>
            <input v-model="endDate" :min="startDate || undefined" type="date" @change="onDateChange" />
          </div>
        </div>
        <p v-if="dateRangeError" class="field-error">{{ dateRangeError }}</p>

        <div class="filter-bottom">
          <div class="search-wrap">
            <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              v-model="search"
              class="search-input"
              type="text"
              placeholder="Cari berdasarkan judul atau ringkasan kegiatan..."
              @input="onSearchChange"
            />
          </div>
          <button type="button" class="primary-btn" @click="router.push('/activities/create')">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Buat Postingan
          </button>
        </div>
      </section>

      <!-- Loading Skeleton -->
      <template v-if="store.loading">
        <div class="card-grid">
          <div v-for="n in 6" :key="'skel-' + n" class="post-card skeleton-card">
            <div class="skeleton-thumb" />
            <div class="card-body">
              <div class="skeleton-line w75" />
              <div class="skeleton-line w100" />
              <div class="skeleton-line w66" />
              <div class="skeleton-line w50" />
              <div class="skeleton-line w33" />
            </div>
          </div>
        </div>
      </template>

      <!-- Empty State -->
      <template v-else-if="filtered.length === 0">
        <div class="empty-card">
          <div class="empty-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#a1a1a1"
              stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="9" y1="15" x2="15" y2="15" />
            </svg>
          </div>
          <h2 class="empty-title">Belum ada postingan kegiatan</h2>
          <p class="empty-sub">Mulai dokumentasikan kegiatan untuk meningkatkan transparansi.</p>
          <button type="button" class="primary-btn" @click="router.push('/activities/create')">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Buat Postingan
          </button>
        </div>
      </template>

      <!-- Card Grid -->
      <template v-else>
        <div class="card-grid">
          <div
            v-for="item in paginated"
            :key="item.id"
            class="post-card"
          >
            <!-- Thumbnail / Carousel -->
            <div class="card-thumb">
              <template v-if="getImages(item.id).length > 0">
                <div class="carousel">
                  <div
                    class="carousel-track"
                    :style="{ transform: `translateX(-${getCurrentIndex(item.id) * 100}%)` }"
                  >
                    <img
                      v-for="(att, idx) in getImages(item.id)"
                      :key="att.id"
                      :src="att.url"
                      :alt="att.filename || `Photo ${idx + 1}`"
                      class="carousel-slide"
                    />
                  </div>
                  <div v-if="getImages(item.id).length > 1" class="carousel-dots">
                    <span
                      v-for="(_, idx) in getImages(item.id)"
                      :key="idx"
                      class="carousel-dot"
                      :class="{ 'carousel-dot--active': getCurrentIndex(item.id) === idx }"
                    />
                  </div>
                </div>
              </template>
              <div v-else class="thumb-placeholder">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#a1a1a1"
                  stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
              </div>
            </div>

            <!-- Body -->
            <div class="card-body">
              <h3 class="card-title">{{ item.title }}</h3>
              <p class="card-desc">{{ item.description }}</p>

              <div class="card-periode">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                <span>{{ formatPeriode(item) }}</span>
              </div>

              <p class="card-date">Dipublikasi: {{ formatDate(item.createdAt) }}</p>

              <!-- Actions -->
              <div class="card-actions">
                <button type="button" class="btn-detail" @click="router.push(`/activities/${item.id}`)">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                  Lihat Detail
                </button>
                <button type="button" class="btn-icon" title="Edit"
                  @click="router.push(`/activities/${item.id}/edit`)">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
                <button type="button" class="btn-icon btn-icon--danger" title="Hapus"
                  @click="deleteTarget = item">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    <path d="M10 11v6M14 11v6" />
                    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Pagination -->
        <div v-if="filtered.length > ITEMS_PER_PAGE" class="pagination">
          <button
            type="button"
            class="page-btn"
            :disabled="currentPage === 1"
            @click="currentPage = Math.max(1, currentPage - 1)"
          >
            Previous
          </button>
          <button
            v-for="p in totalPages"
            :key="p"
            type="button"
            class="page-num"
            :class="{ 'page-active': currentPage === p }"
            @click="currentPage = p"
          >
            {{ p }}
          </button>
          <button
            type="button"
            class="page-btn"
            :disabled="currentPage === totalPages"
            @click="currentPage = Math.min(totalPages, currentPage + 1)"
          >
            Next
          </button>
        </div>
      </template>
    </main>

    <!-- Delete Modal -->
    <DeleteActivityModal
      ref="deleteModalRef"
      :isOpen="!!deleteTarget"
      :title="deleteTarget?.title ?? ''"
      :category="deleteTarget?.category ?? ''"
      :program="deleteTarget?.program ?? ''"
      @confirm="handleDeleteConfirm"
      @cancel="deleteTarget = null"
    />
  </div>
</template>

<style scoped>
.layout {
  display: flex;
  min-height: 100vh;
  background-color: #f5f5f5;
  font-family: 'Manrope', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
}

.content {
  flex: 1;
  overflow-y: auto;
  padding: 32px;
}

.content > * {
  max-width: 1200px;
  margin-left: auto;
  margin-right: auto;
}

.content-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 24px;
}

.page-title {
  font-size: 32px;
  font-weight: 600;
  margin: 0 0 4px;
  font-family: 'Poppins', system-ui, sans-serif;
  color: #171717;
}

.page-subtitle {
  margin: 0;
  color: #525252;
  font-size: 14px;
}

/* Filter Card */
.filter-card {
  background: #fff;
  border-radius: 10px;
  border: 1px solid #e5e5e5;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
  padding: 20px;
  margin-bottom: 32px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.filter-dates {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

label {
  font-size: 12px;
  font-weight: 600;
  color: #525252;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

input[type='text'],
input[type='date'] {
  height: 42px;
  border-radius: 8px;
  border: 1px solid #d4d4d4;
  padding: 8px 12px;
  font-size: 14px;
  color: #171717;
  font-family: 'Manrope', system-ui, sans-serif;
  background-color: #fff;
  transition: border-color 0.15s, box-shadow 0.15s;
  outline: none;
}

input[type='text']:focus,
input[type='date']:focus {
  border-color: #00c6ac;
  box-shadow: 0 0 0 1px #00c6ac;
}

.filter-bottom {
  display: flex;
  gap: 12px;
  align-items: center;
}

.search-wrap {
  position: relative;
  flex: 1;
}

.search-icon {
  position: absolute;
  left: 13px;
  top: 50%;
  transform: translateY(-50%);
  color: #a1a1a1;
  pointer-events: none;
}

.search-input {
  width: 100%;
  height: 42px;
  padding-left: 36px !important;
  box-sizing: border-box;
}

.primary-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  border-radius: 8px;
  padding: 0 24px;
  height: 42px;
  border: none;
  background-color: #00c6ac;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  font-family: 'Manrope', system-ui, sans-serif;
  cursor: pointer;
  transition: background-color 0.15s;
  white-space: nowrap;
}

.primary-btn:hover {
  background-color: #00b39c;
}

/* Card Grid */
.card-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
  margin-bottom: 32px;
}

.post-card {
  background: #fff;
  border-radius: 10px;
  border: 1px solid #e5e5e5;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: box-shadow 0.2s;
}

.post-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.card-thumb {
  height: 176px;
  background: #f0f0f0;
  overflow: hidden;
  position: relative;
}

.carousel {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
}

.carousel-track {
  display: flex;
  height: 100%;
  transition: transform 0.5s ease;
}

.carousel-slide {
  min-width: 100%;
  height: 100%;
  object-fit: cover;
}

.carousel-dots {
  position: absolute;
  bottom: 8px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 6px;
}

.carousel-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.5);
  transition: background 0.2s;
}

.carousel-dot--active {
  background: #fff;
}

.thumb-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-body {
  padding: 20px;
  display: flex;
  flex-direction: column;
  flex: 1;
}

.card-title {
  font-family: 'Manrope', sans-serif;
  font-weight: 600;
  font-size: 15px;
  color: #171717;
  margin: 0 0 8px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.4;
}

.card-desc {
  font-size: 13px;
  color: #525252;
  margin: 0 0 12px;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.6;
  flex: 1;
}

.card-periode {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
  color: #525252;
}

.card-periode span {
  font-weight: 600;
  font-size: 12px;
}

.card-date {
  font-size: 12px;
  color: #a1a1a1;
  margin: 0 0 16px;
}

.card-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-top: 12px;
  border-top: 1px solid #f0f0f0;
}

.btn-detail {
  flex: 1;
  height: 34px;
  border-radius: 6px;
  border: 1px solid #d4d4d4;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: #404040;
  font-family: 'Manrope', sans-serif;
  font-weight: 600;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-detail:hover {
  border-color: #00c6ac;
  color: #00c6ac;
  background-color: #f0fdfb;
}

.btn-icon {
  width: 34px;
  height: 34px;
  border-radius: 6px;
  border: 1px solid #d4d4d4;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #404040;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-icon:hover {
  border-color: #00c6ac;
  color: #00c6ac;
  background-color: #f0fdfb;
}

.btn-icon--danger:hover {
  border-color: #ff303e;
  color: #ff303e;
  background-color: #fff1f2;
}

/* Empty State */
.empty-card {
  background: #fff;
  border-radius: 10px;
  border: 1px solid #e5e5e5;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
  padding: 64px 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.empty-icon {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
}

.empty-title {
  font-family: 'Poppins', sans-serif;
  font-weight: 600;
  font-size: 20px;
  color: #171717;
  margin: 0 0 8px;
}

.empty-sub {
  font-size: 14px;
  color: #525252;
  margin: 0 0 24px;
  text-align: center;
  max-width: 400px;
}

/* Skeleton */
.skeleton-card {
  pointer-events: none;
}

.skeleton-thumb {
  height: 176px;
  background: #e5e5e5;
  animation: shimmer 1.4s infinite;
  background-size: 200% 100%;
  background-image: linear-gradient(90deg, #e5e5e5 25%, #f0f0f0 50%, #e5e5e5 75%);
}

.skeleton-line {
  height: 14px;
  border-radius: 6px;
  margin-bottom: 8px;
  background: linear-gradient(90deg, #e5e5e5 25%, #f0f0f0 50%, #e5e5e5 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
}

.w100 { width: 100%; }
.w75 { width: 75%; }
.w66 { width: 66%; }
.w50 { width: 50%; }
.w33 { width: 33%; }

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* Pagination */
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.page-btn {
  height: 36px;
  padding: 0 16px;
  border-radius: 8px;
  border: 1px solid #d4d4d4;
  background: #fff;
  font-family: 'Manrope', sans-serif;
  font-weight: 600;
  font-size: 13px;
  color: #404040;
  cursor: pointer;
  transition: background-color 0.15s;
}

.page-btn:hover:not(:disabled) {
  background-color: #f5f5f5;
}

.page-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.page-num {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: 1px solid #d4d4d4;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Manrope', sans-serif;
  font-weight: 600;
  font-size: 13px;
  color: #404040;
  cursor: pointer;
  transition: all 0.15s;
}

.page-num:hover {
  background-color: #f5f5f5;
}

.page-active {
  background-color: #00c6ac;
  color: #fff;
  border-color: #00c6ac;
}

.page-active:hover {
  background-color: #00b39c;
}
</style>
