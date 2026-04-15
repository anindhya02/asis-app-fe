<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useActivityStore } from '@/stores/activity.store'
import AsisSidebar from '@/components/AsisSidebar.vue'
import {
  KATEGORI_OPTIONS,
  PROGRAM_OPTIONS,
} from '@/interfaces/activity.interface'
import type {
  AttachmentResponse,
} from '@/interfaces/activity.interface'

const route = useRoute()
const router = useRouter()
const store = useActivityStore()

const id = computed(() => route.params.id as string | undefined)
const isEditing = computed(() => !!id.value)

const submitting = ref(false)
const serverError = ref('')
const isDirty = ref(false)
const showUnsavedModal = ref(false)
const pendingNavigation = ref<string | null>(null)
const loadingData = ref(false)
const notFound = ref(false)

// Form fields
const form = ref({
  judul: '',
  kategori: '',
  program: '',
  periodeStart: '',
  periodeEnd: '',
  konten: '',
})

const errors = ref<Record<string, string>>({})
const touched = ref<Record<string, boolean>>({})

// File upload
const fileInputRef = ref<HTMLInputElement | null>(null)
const dragOver = ref(false)
const uploadedFiles = ref<{ id: string; file: File; previewUrl: string | null; type: string }[]>([])
const existingAttachments = ref<AttachmentResponse[]>([])
const deletedAttachmentIds = ref<string[]>([])

function updateField(field: string, value: string) {
  ;(form.value as any)[field] = value
  isDirty.value = true
  if (errors.value[field]) {
    const next = { ...errors.value }
    delete next[field]
    errors.value = next
  }
  // Cross-field: tanggal selesai tidak boleh lebih kecil dari tanggal mulai
  if (field === 'periodeStart' || field === 'periodeEnd') {
    const start = field === 'periodeStart' ? value : form.value.periodeStart
    const end = field === 'periodeEnd' ? value : form.value.periodeEnd
    if (start && end && end < start) {
      errors.value = { ...errors.value, periodeEnd: 'Tanggal selesai tidak boleh lebih kecil dari tanggal mulai' }
      touched.value = { ...touched.value, periodeEnd: true }
    } else {
      const next = { ...errors.value }
      delete next.periodeEnd
      errors.value = next
    }
  }
}

function markTouched(field: string) {
  touched.value = { ...touched.value, [field]: true }
}

function validateAll(): Record<string, string> {
  const errs: Record<string, string> = {}
  if (!form.value.judul.trim()) errs.judul = 'Judul wajib diisi'
  if (!form.value.kategori) errs.kategori = 'Kategori wajib dipilih'
  if (!form.value.program) errs.program = 'Program wajib dipilih'
  if (!form.value.periodeStart) errs.periodeStart = 'Tanggal mulai wajib diisi'
  if (form.value.periodeEnd && form.value.periodeStart && form.value.periodeEnd < form.value.periodeStart)
    errs.periodeEnd = 'Tanggal selesai tidak boleh lebih kecil dari tanggal mulai'
  if (!form.value.konten.trim()) errs.konten = 'Konten wajib diisi'
  return errs
}

function handleNavigateAway(path: string) {
  if (isDirty.value) {
    pendingNavigation.value = path
    showUnsavedModal.value = true
  } else {
    router.push(path)
  }
}

// File handling
function handleFileSelect(files: FileList) {
  const allowedTypes = ['image/jpeg', 'image/png']
  const maxFiles = 10
  const currentCount = uploadedFiles.value.length + existingAttachments.value.length

  Array.from(files).forEach((file) => {
    if (currentCount + uploadedFiles.value.length >= maxFiles) return

    if (!allowedTypes.includes(file.type)) {
      serverError.value = `Format file ${file.name} tidak didukung. Hanya JPG dan PNG.`
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      serverError.value = `File ${file.name} melebihi batas 5MB.`
      return
    }

    const previewUrl = URL.createObjectURL(file)
    uploadedFiles.value.push({
      id: crypto.randomUUID(),
      file,
      previewUrl,
      type: file.type,
    })
    isDirty.value = true
  })
}

function onFileChange(event: Event) {
  const target = event.target as HTMLInputElement
  if (target.files?.length) {
    handleFileSelect(target.files)
    target.value = ''
  }
}

function onDrop(event: DragEvent) {
  event.preventDefault()
  dragOver.value = false
  if (event.dataTransfer?.files.length) {
    handleFileSelect(event.dataTransfer.files)
  }
}

function removeFile(fileId: string) {
  const idx = uploadedFiles.value.findIndex((f) => f.id === fileId)
  if (idx >= 0) {
    const file = uploadedFiles.value[idx]
    if (file && file.previewUrl) URL.revokeObjectURL(file.previewUrl)
    uploadedFiles.value.splice(idx, 1)
    isDirty.value = true
  }
}

function removeExistingAttachment(attId: string) {
  existingAttachments.value = existingAttachments.value.filter((a) => a.id !== attId)
  deletedAttachmentIds.value.push(attId)
  isDirty.value = true
}

async function handleSubmit() {
  const newErrors = validateAll()
  errors.value = newErrors
  touched.value = {
    judul: true,
    kategori: true,
    program: true,
    periodeStart: true,
    periodeEnd: true,
    konten: true,
  }

  if (Object.keys(newErrors).length > 0) return

  submitting.value = true
  serverError.value = ''

  try {
    let activityId: string

    const payload = {
      title: form.value.judul.trim(),
      category: form.value.kategori,
      program: form.value.program,
      startDate: form.value.periodeStart,
      endDate: form.value.periodeEnd || null,
      description: form.value.konten.trim(),
    }

    if (isEditing.value && id.value) {
      const result = await store.updateActivity(id.value, payload)
      activityId = result.id

      // Delete removed attachments
      for (const attId of deletedAttachmentIds.value) {
        await store.deleteAttachment(activityId, attId)
      }
    } else {
      const result = await store.createActivity(payload)
      activityId = result.id
    }

    // Upload new files
    if (uploadedFiles.value.length > 0) {
      const files = uploadedFiles.value.map((uf) => uf.file)
      await store.uploadAttachments(activityId, files)
    }

    isDirty.value = false
    router.push('/activities')
  } catch (error: any) {
    serverError.value =
      error?.response?.data?.message || 'Terjadi kesalahan saat menyimpan'
  } finally {
    submitting.value = false
  }
}

function inputClass(field: string) {
  if (errors.value[field] && touched.value[field]) return 'form-input input-error'
  return 'form-input'
}

function selectClass(field: string) {
  if (errors.value[field] && touched.value[field]) return 'form-select input-error'
  return 'form-select'
}

onMounted(async () => {
  if (isEditing.value && id.value) {
    loadingData.value = true
    try {
      const activity = await store.fetchActivityById(id.value)
      form.value = {
        judul: activity.title,
        kategori: activity.category,
        program: activity.program,
        periodeStart: activity.startDate,
        periodeEnd: activity.endDate || '',
        konten: activity.description,
      }
      try {
        existingAttachments.value = await store.fetchAttachments(id.value)
      } catch {
        existingAttachments.value = []
      }
    } catch {
      notFound.value = true
    } finally {
      loadingData.value = false
    }
  }
})
</script>

<template>
  <div class="layout">
    <AsisSidebar />

    <!-- 404 for edit -->
    <main v-if="notFound" class="content">
      <div class="not-found-center">
        <div class="not-found-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#F5A623"
            stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h2 class="not-found-title">Postingan tidak ditemukan</h2>
        <button type="button" class="primary-btn mt-16" @click="router.push('/activities')">
          Kembali ke Daftar
        </button>
      </div>
    </main>

    <!-- Loading -->
    <main v-else-if="loadingData" class="content">
      <div class="loading-center">
        <svg class="spin" width="32" height="32" viewBox="0 0 24 24" fill="none"
          stroke="#00c6ac" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
        <p class="loading-text">Memuat data...</p>
      </div>
    </main>

    <!-- Form -->
    <main v-else class="content">
      <div class="form-wrapper">
        <!-- Breadcrumb & Header -->
        <div class="breadcrumb-area">
          <div class="breadcrumb">
            <button type="button" class="breadcrumb-link" @click="handleNavigateAway('/activities')">
              Kelola Postingan
            </button>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a1a1a1"
              stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
            <span class="breadcrumb-current">{{ isEditing ? 'Edit' : 'Buat' }}</span>
          </div>
          <h1 class="page-title">
            {{ isEditing ? 'Edit Postingan Kegiatan' : 'Buat Postingan Kegiatan' }}
          </h1>
        </div>

        <!-- Server Error -->
        <div v-if="serverError" class="error-banner">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FF303E"
            stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <p>{{ serverError }}</p>
        </div>

        <!-- Form Card -->
        <div class="form-card">
          <!-- Section: Informasi Kegiatan -->
          <div class="form-section">
            <div class="section-header">
              <h3>Informasi Kegiatan</h3>
            </div>

            <!-- Judul -->
            <div class="form-field">
              <label>Judul Kegiatan <span class="required">*</span></label>
              <input
                type="text"
                :value="form.judul"
                @input="updateField('judul', ($event.target as HTMLInputElement).value)"
                @blur="markTouched('judul')"
                placeholder="Contoh: Pemberian Sembako"
                :class="inputClass('judul')"
              />
              <p v-if="errors.judul && touched.judul" class="field-error">{{ errors.judul }}</p>
            </div>

            <!-- Kategori + Program -->
            <div class="form-row">
              <div class="form-field">
                <label>Kategori Kegiatan <span class="required">*</span></label>
                <select
                  :value="form.kategori"
                  @change="updateField('kategori', ($event.target as HTMLSelectElement).value)"
                  @blur="markTouched('kategori')"
                  :class="selectClass('kategori')"
                >
                  <option value="">Pilih Kategori</option>
                  <option v-for="k in KATEGORI_OPTIONS" :key="k" :value="k">{{ k }}</option>
                </select>
                <p v-if="errors.kategori && touched.kategori" class="field-error">{{ errors.kategori }}</p>
              </div>
              <div class="form-field">
                <label>Program Kegiatan <span class="required">*</span></label>
                <select
                  :value="form.program"
                  @change="updateField('program', ($event.target as HTMLSelectElement).value)"
                  @blur="markTouched('program')"
                  :class="selectClass('program')"
                >
                  <option value="">Pilih Program</option>
                  <option v-for="p in PROGRAM_OPTIONS" :key="p" :value="p">{{ p }}</option>
                </select>
                <p v-if="errors.program && touched.program" class="field-error">{{ errors.program }}</p>
              </div>
            </div>

            <!-- Periode -->
            <div class="form-field">
              <label>Periode / Tanggal Kegiatan <span class="required">*</span></label>
              <div class="form-row">
                <input
                  type="date"
                  :value="form.periodeStart"
                  :max="form.periodeEnd || undefined"
                  @input="updateField('periodeStart', ($event.target as HTMLInputElement).value)"
                  @blur="markTouched('periodeStart')"
                  :class="inputClass('periodeStart')"
                />
                <input
                  type="date"
                  :value="form.periodeEnd"
                  :min="form.periodeStart || undefined"
                  @input="updateField('periodeEnd', ($event.target as HTMLInputElement).value)"
                  @blur="markTouched('periodeEnd')"
                  :class="inputClass('periodeEnd')"
                />
              </div>
              <p v-if="errors.periodeStart && touched.periodeStart" class="field-error">{{ errors.periodeStart }}</p>
              <p v-if="errors.periodeEnd && touched.periodeEnd" class="field-error">{{ errors.periodeEnd }}</p>
              <p class="field-hint">Jika hanya 1 hari, isi tanggal mulai saja</p>
            </div>
          </div>

          <!-- Section: Konten Kegiatan -->
          <div class="form-section">
            <div class="section-header">
              <h3>Konten Kegiatan</h3>
            </div>

            <div class="form-field">
              <label>Deskripsi / Konten Kegiatan <span class="required">*</span></label>
              <textarea
                :value="form.konten"
                @input="updateField('konten', ($event.target as HTMLTextAreaElement).value)"
                @blur="markTouched('konten')"
                placeholder="Tulis deskripsi lengkap kegiatan..."
                rows="8"
                :class="[
                  'form-textarea',
                  errors.konten && touched.konten ? 'input-error' : '',
                ]"
              />
              <p v-if="errors.konten && touched.konten" class="field-error">{{ errors.konten }}</p>
            </div>
          </div>

          <!-- Section: Dokumentasi Kegiatan -->
          <div class="form-section">
            <div class="section-header">
              <h3>Dokumentasi Kegiatan</h3>
            </div>

            <div class="form-field">
              <label>Upload Foto</label>
              <p class="field-hint mb-12">Format: JPG, PNG (Max. 5MB per file). Maksimal 10 file.</p>

              <!-- Drop zone -->
              <div
                class="drop-zone"
                :class="{ 'drop-zone--active': dragOver }"
                @dragover.prevent="dragOver = true"
                @dragleave="dragOver = false"
                @drop="onDrop"
                @click="fileInputRef?.click()"
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#a1a1a1"
                  stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <p class="drop-text">Upload foto atau dokumen pendukung</p>
                <p class="drop-hint">Klik atau seret file ke area ini</p>
                <input
                  ref="fileInputRef"
                  type="file"
                  accept=".jpg,.jpeg,.png"
                  multiple
                  style="display: none"
                  @change="onFileChange"
                />
              </div>

              <!-- Existing attachments (edit mode) -->
              <div v-if="existingAttachments.length > 0" class="file-tags">
                <div v-for="att in existingAttachments" :key="att.id" class="file-tag">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00c6ac"
                    stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                  <span class="file-name">{{ att.filename }}</span>
                  <button type="button" class="file-remove" @click="removeExistingAttachment(att.id)">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              </div>

              <!-- New uploaded files -->
              <div v-if="uploadedFiles.length > 0" class="file-previews">
                <div v-for="uf in uploadedFiles" :key="uf.id" class="preview-item">
                  <template v-if="uf.previewUrl">
                    <div class="preview-img-wrap">
                      <img :src="uf.previewUrl" :alt="uf.file.name" class="preview-img" />
                      <button type="button" class="preview-remove" @click="removeFile(uf.id)">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                          stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </div>
                  </template>
                  <template v-else>
                    <div class="file-tag">
                      <span class="file-name">{{ uf.file.name }}</span>
                      <button type="button" class="file-remove" @click="removeFile(uf.id)">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                          stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </div>
                  </template>
                </div>
              </div>
            </div>
          </div>

          <!-- Buttons -->
          <div class="form-actions">
            <button type="button" class="btn-cancel" :disabled="submitting" @click="handleNavigateAway('/activities')">
              Batal
            </button>
            <button type="button" class="btn-submit" :disabled="submitting" @click="handleSubmit">
              <template v-if="submitting">
                <svg class="spin" width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
                {{ isEditing ? 'Menyimpan...' : 'Mempublikasikan...' }}
              </template>
              <template v-else>
                {{ isEditing ? 'Simpan Perubahan' : 'Publikasikan' }}
              </template>
            </button>
          </div>
        </div>
      </div>
    </main>

    <!-- Unsaved Changes Modal -->
    <Teleport to="body">
      <div v-if="showUnsavedModal" class="modal-overlay" @click.self="showUnsavedModal = false">
        <div class="modal-content modal-sm">
          <div class="modal-body-center">
            <h3 class="modal-title">Perubahan belum disimpan</h3>
            <p class="modal-desc">Yakin keluar? Perubahan yang belum disimpan akan hilang.</p>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn-cancel" @click="showUnsavedModal = false">Batal</button>
            <button type="button" class="btn-danger-solid" @click="() => { showUnsavedModal = false; if (pendingNavigation) router.push(pendingNavigation) }">
              Tetap Keluar
            </button>
          </div>
        </div>
      </div>
    </Teleport>
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

.form-wrapper {
  max-width: 900px;
  margin: 0 auto;
}

/* Loading & 404 */
.loading-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 60vh;
  gap: 16px;
}

.loading-text { font-size: 14px; color: #525252; }

.spin {
  animation: spinner 1s linear infinite;
}

@keyframes spinner {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.not-found-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 60vh;
}

.not-found-icon {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: #fff8e1;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
}

.not-found-title {
  font-family: 'Poppins', sans-serif;
  font-weight: 600;
  font-size: 22px;
  color: #171717;
  margin: 0;
}

/* Breadcrumb */
.breadcrumb-area { margin-bottom: 32px; }

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.breadcrumb-link {
  background: none;
  border: none;
  padding: 0;
  font-family: 'Manrope', sans-serif;
  font-size: 13px;
  color: #00c6ac;
  cursor: pointer;
}

.breadcrumb-link:hover { text-decoration: underline; }

.breadcrumb-current { font-size: 13px; color: #525252; }

.page-title {
  font-family: 'Poppins', sans-serif;
  font-weight: 600;
  font-size: 32px;
  color: #171717;
  margin: 0;
}

/* Error Banner */
.error-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #fff1f2;
  border: 1px solid rgba(255, 48, 62, 0.2);
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 24px;
}

.error-banner p {
  font-size: 14px;
  color: #ff303e;
  margin: 0;
}

/* Form Card */
.form-card {
  background: #fff;
  border-radius: 12px;
  border: 1px solid #e5e5e5;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
  padding: 32px;
}

.form-section {
  margin-bottom: 32px;
}

.section-header {
  border-bottom: 1px solid #e5e5e5;
  padding-bottom: 8px;
  margin-bottom: 24px;
}

.section-header h3 {
  font-family: 'Manrope', sans-serif;
  font-weight: 600;
  font-size: 15px;
  color: #171717;
  margin: 0;
}

.form-field {
  margin-bottom: 20px;
}

.form-field label {
  display: block;
  font-family: 'Manrope', sans-serif;
  font-weight: 600;
  font-size: 14px;
  color: #171717;
  margin-bottom: 6px;
}

.required { color: #ff303e; }

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.form-input {
  width: 100%;
  height: 42px;
  padding: 0 16px;
  border: 1px solid #d4d4d4;
  border-radius: 8px;
  font-family: 'Manrope', sans-serif;
  font-size: 14px;
  color: #171717;
  background: #fff;
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
  box-sizing: border-box;
}

.form-input::placeholder { color: #a1a1a1; }

.form-input:focus {
  border-color: #00c6ac;
  box-shadow: 0 0 0 1px #00c6ac;
}

.form-select {
  width: 100%;
  height: 42px;
  padding: 0 16px;
  border: 1px solid #d4d4d4;
  border-radius: 8px;
  font-family: 'Manrope', sans-serif;
  font-size: 14px;
  color: #171717;
  background: #fff;
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
  cursor: pointer;
  box-sizing: border-box;
}

.form-select:focus {
  border-color: #00c6ac;
  box-shadow: 0 0 0 1px #00c6ac;
}

.form-textarea {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid #d4d4d4;
  border-radius: 8px;
  font-family: 'Manrope', sans-serif;
  font-size: 14px;
  color: #171717;
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
  resize: none;
  box-sizing: border-box;
}

.form-textarea::placeholder { color: #a1a1a1; }

.form-textarea:focus {
  border-color: #00c6ac;
  box-shadow: 0 0 0 1px #00c6ac;
}

.input-error {
  border-color: #ff303e !important;
}

.input-error:focus {
  border-color: #ff303e !important;
  box-shadow: 0 0 0 1px #ff303e !important;
}

.field-error {
  font-size: 12px;
  color: #ff303e;
  margin: 4px 0 0;
}

.field-hint {
  font-size: 12px;
  color: #525252;
  margin: 6px 0 0;
}

.mb-12 { margin-bottom: 12px; }

/* Drop Zone */
.drop-zone {
  border: 2px dashed #d4d4d4;
  border-radius: 10px;
  padding: 32px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s;
  margin-bottom: 16px;
}

.drop-zone:hover {
  border-color: #00c6ac;
  background-color: #fafafa;
}

.drop-zone--active {
  border-color: #00c6ac;
  background-color: #f0fdfb;
}

.drop-text {
  font-weight: 600;
  font-size: 14px;
  color: #525252;
  margin: 12px 0 4px;
}

.drop-hint {
  font-size: 12px;
  color: #a1a1a1;
  margin: 0;
}

/* File Tags */
.file-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 12px;
}

.file-tag {
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  padding: 8px 12px;
  background: #fafafa;
}

.file-name {
  font-size: 13px;
  color: #171717;
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-remove {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: none;
  background: none;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #a1a1a1;
  cursor: pointer;
  transition: all 0.15s;
}

.file-remove:hover {
  color: #ff303e;
  background-color: #fff1f2;
}

/* File Previews */
.file-previews {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.preview-img-wrap {
  width: 100px;
  height: 100px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #e5e5e5;
  position: relative;
}

.preview-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.preview-remove {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ff303e;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.15s;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.preview-img-wrap:hover .preview-remove {
  opacity: 1;
}

/* Form Actions */
.form-actions {
  border-top: 1px solid #e5e5e5;
  padding-top: 24px;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.btn-cancel {
  height: 44px;
  padding: 0 20px;
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

.btn-cancel:hover:not(:disabled) { background-color: #f5f5f5; }
.btn-cancel:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-submit {
  height: 44px;
  padding: 0 20px;
  border-radius: 8px;
  border: none;
  background: #00c6ac;
  color: #fff;
  font-family: 'Manrope', sans-serif;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.15s;
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-submit:hover:not(:disabled) { background-color: #00b39c; }
.btn-submit:disabled { opacity: 0.5; cursor: not-allowed; }

.primary-btn {
  height: 44px;
  padding: 0 24px;
  border-radius: 8px;
  border: none;
  background-color: #00c6ac;
  color: #fff;
  font-family: 'Manrope', sans-serif;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.15s;
}

.primary-btn:hover { background-color: #00b39c; }

.mt-16 { margin-top: 16px; }

/* Modal */
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
  padding: 32px;
}

.modal-sm { width: 420px; }

.modal-body-center {
  text-align: center;
  margin-bottom: 24px;
}

.modal-title {
  font-family: 'Poppins', sans-serif;
  font-weight: 600;
  font-size: 18px;
  color: #171717;
  margin: 0 0 8px;
}

.modal-desc {
  font-size: 14px;
  color: #525252;
  margin: 0;
}

.modal-actions {
  display: flex;
  gap: 12px;
}

.modal-actions .btn-cancel { flex: 1; }

.btn-danger-solid {
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
}

.btn-danger-solid:hover { background-color: #e0202e; }
</style>
