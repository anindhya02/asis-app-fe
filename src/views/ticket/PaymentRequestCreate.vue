<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { usePaymentRequestStore } from '@/stores/payment-request.store'
import AsisSidebar from '@/components/AsisSidebar.vue'

const store = usePaymentRequestStore()
const router = useRouter()

// ──── Form fields ────
const title = ref<string>('')
const neededDate = ref<string>('')
const expenseCategory = ref<string>('')
const subCategory = ref<string>('')
const program = ref<string>('')
const nominalDisplay = ref<string>('')
const amount = ref<string>('')
const paymentMethod = ref<string>('')
const purpose = ref<string>('')
const notes = ref<string>('')
const supportingDocument = ref<File | null>(null)

// Breakdown repeater
const breakdowns = ref<{ description: string; amountDisplay: string; amount: string }[]>([
  { description: '', amountDisplay: '', amount: '' },
])

// Drag & drop
const dragOver = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)

// Validation state
const errors = ref<Record<string, string>>({})
const touched = ref<Record<string, boolean>>({})

// ──── Options ────
const categoryOptions = [
  { label: 'Operasional', value: 'OPERASIONAL' },
  { label: 'Konsumsi', value: 'KONSUMSI' },
  { label: 'Transportasi', value: 'TRANSPORTASI' },
  { label: 'Perlengkapan', value: 'PERLENGKAPAN' },
  { label: 'Program Kegiatan', value: 'PROGRAM_KEGIATAN' },
  { label: 'Gaji & Honor', value: 'GAJI' },
  { label: 'Infrastruktur', value: 'INFRASTRUKTUR' },
  { label: 'Lain-lain', value: 'LAIN_LAIN' },
]

const subCategoryMap: Record<string, { label: string; value: string }[]> = {
  OPERASIONAL: [
    { label: 'Listrik', value: 'Listrik' },
    { label: 'Air', value: 'Air' },
    { label: 'Internet', value: 'Internet' },
    { label: 'Telepon', value: 'Telepon' },
    { label: 'Lain-lain', value: 'Lain-lain' },
  ],
  KONSUMSI: [
    { label: 'Makanan', value: 'Makanan' },
    { label: 'Minuman', value: 'Minuman' },
    { label: 'Snack', value: 'Snack' },
    { label: 'Lain-lain', value: 'Lain-lain' },
  ],
  TRANSPORTASI: [
    { label: 'BBM', value: 'BBM' },
    { label: 'Tol', value: 'Tol' },
    { label: 'Parkir', value: 'Parkir' },
    { label: 'Sewa Kendaraan', value: 'Sewa Kendaraan' },
    { label: 'Lain-lain', value: 'Lain-lain' },
  ],
  PERLENGKAPAN: [
    { label: 'ATK', value: 'ATK' },
    { label: 'Peralatan', value: 'Peralatan' },
    { label: 'Lain-lain', value: 'Lain-lain' },
  ],
  PROGRAM_KEGIATAN: [
    { label: 'Santunan', value: 'Santunan' },
    { label: 'Beasiswa', value: 'Beasiswa' },
    { label: 'Kegiatan Sosial', value: 'Kegiatan Sosial' },
    { label: 'Lain-lain', value: 'Lain-lain' },
  ],
  GAJI: [
    { label: 'Gaji Pokok', value: 'Gaji Pokok' },
    { label: 'Honor', value: 'Honor' },
    { label: 'Tunjangan', value: 'Tunjangan' },
    { label: 'Lain-lain', value: 'Lain-lain' },
  ],
  INFRASTRUKTUR: [
    { label: 'Renovasi', value: 'Renovasi' },
    { label: 'Pembangunan', value: 'Pembangunan' },
    { label: 'Perbaikan', value: 'Perbaikan' },
    { label: 'Lain-lain', value: 'Lain-lain' },
  ],
  LAIN_LAIN: [
    { label: 'Lain-lain', value: 'Lain-lain' },
  ],
}

const subCategoryOptions = computed(() => {
  if (!expenseCategory.value) return []
  return subCategoryMap[expenseCategory.value] || []
})

const paymentMethodOptions = [
  { label: 'Tunai', value: 'CASH' },
  { label: 'Transfer Bank', value: 'TRANSFER' },
]

// ──── Nominal input (formatted display) ────
function onNominalInput(event: Event) {
  const raw = (event.target as HTMLInputElement).value
  const digits = raw.replace(/\D/g, '')
  nominalDisplay.value = digits ? parseInt(digits).toLocaleString('id-ID') : ''
  amount.value = digits
  clearError('amount')
}

// ──── Breakdown helpers ────
function onBreakdownAmountInput(index: number, event: Event) {
  const raw = (event.target as HTMLInputElement).value
  const digits = raw.replace(/\D/g, '')
  const item = breakdowns.value[index]
  if (item) {
    item.amountDisplay = digits ? parseInt(digits).toLocaleString('id-ID') : ''
    item.amount = digits
  }
  clearError('breakdowns')
}

function addBreakdownItem() {
  breakdowns.value.push({ description: '', amountDisplay: '', amount: '' })
}

function removeBreakdownItem(index: number) {
  if (breakdowns.value.length > 1) {
    breakdowns.value.splice(index, 1)
  }
}

const breakdownTotal = computed(() => {
  return breakdowns.value.reduce((sum, item) => {
    const val = parseInt(item.amount) || 0
    return sum + val
  }, 0)
})

function formatCurrency(value: number): string {
  return 'Rp ' + value.toLocaleString('id-ID')
}

// ──── File handling ────
function handleFileSelect(file: File) {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
  if (!allowed.includes(file.type)) {
    errors.value = { ...errors.value, supportingDocument: 'Format file tidak didukung. Gunakan JPG, PNG, WEBP, atau PDF.' }
    return
  }
  if (file.size > 5 * 1024 * 1024) {
    errors.value = { ...errors.value, supportingDocument: 'Ukuran file melebihi batas 5MB.' }
    return
  }
  supportingDocument.value = file
  clearError('supportingDocument')
}

function onFileChange(event: Event) {
  const target = event.target as HTMLInputElement
  if (target.files?.[0]) handleFileSelect(target.files[0])
}

function onDrop(event: DragEvent) {
  event.preventDefault()
  dragOver.value = false
  if (event.dataTransfer?.files[0]) handleFileSelect(event.dataTransfer.files[0])
}

function removeFile() {
  supportingDocument.value = null
  if (fileInputRef.value) fileInputRef.value.value = ''
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// ──── Validation ────
function clearError(field: string) {
  if (errors.value[field]) {
    const e = { ...errors.value }
    delete e[field]
    errors.value = e
  }
}

function validateField(field: string) {
  const e = { ...errors.value }
  switch (field) {
    case 'title':
      if (!title.value.trim()) e.title = 'Judul pengajuan wajib diisi'
      else delete e.title
      break
    case 'neededDate':
      if (!neededDate.value) {
        e.neededDate = 'Tanggal kebutuhan dana wajib diisi'
      } else {
        const today = new Date().toISOString().split('T')[0]!
        if (neededDate.value < today) {
          e.neededDate = 'Tanggal kebutuhan dana tidak boleh kurang dari hari ini'
        } else {
          delete e.neededDate
        }
      }
      break
    case 'expenseCategory':
      if (!expenseCategory.value) e.expenseCategory = 'Kategori pengeluaran wajib dipilih'
      else delete e.expenseCategory
      break
    case 'subCategory':
      if (!subCategory.value) e.subCategory = 'Sub-kategori wajib dipilih'
      else delete e.subCategory
      break
    case 'program':
      if (!program.value.trim()) e.program = 'Program terkait wajib dipilih'
      else delete e.program
      break
    case 'amount':
      if (!amount.value) e.amount = 'Nominal wajib diisi'
      else if (isNaN(Number(amount.value)) || Number(amount.value) <= 0)
        e.amount = 'Nominal harus berupa angka dan lebih dari 0'
      else delete e.amount
      break
    case 'paymentMethod':
      if (!paymentMethod.value) e.paymentMethod = 'Metode pembayaran wajib dipilih'
      else delete e.paymentMethod
      break
    case 'purpose':
      if (!purpose.value.trim()) e.purpose = 'Penerima dana wajib diisi'
      else delete e.purpose
      break
    case 'supportingDocument':
      if (!supportingDocument.value) e.supportingDocument = 'Dokumen pendukung wajib diunggah sebelum submit'
      else delete e.supportingDocument
      break
  }
  errors.value = e
}

function markTouched(field: string) {
  touched.value = { ...touched.value, [field]: true }
  validateField(field)
}

function showError(field: string): string | undefined {
  return touched.value[field] ? errors.value[field] : undefined
}

function validateBreakdowns(): boolean {
  let valid = true
  const e = { ...errors.value }

  // Check each item has description
  for (let i = 0; i < breakdowns.value.length; i++) {
    const item = breakdowns.value[i]
    if (!item || !item.description.trim() || !item.amount || parseInt(item.amount) <= 0) {
      valid = false
    }
  }
  if (!valid) {
    e.breakdowns = 'Semua deskripsi rincian harus diisi'
  } else {
    delete e.breakdowns
  }

  // Check total matches amount
  if (amount.value && parseInt(amount.value) > 0 && breakdownTotal.value > 0) {
    if (breakdownTotal.value !== parseInt(amount.value)) {
      e.breakdownTotal = 'Total rincian harus sama dengan nominal dana diajukan'
      valid = false
    } else {
      delete e.breakdownTotal
    }
  }

  errors.value = e
  return valid
}

// Submit validation
function validateAllForSubmit(): boolean {
  const fields = ['title', 'neededDate', 'expenseCategory', 'subCategory', 'program', 'amount', 'paymentMethod', 'purpose', 'supportingDocument']
  fields.forEach((f) => {
    touched.value[f] = true
    validateField(f)
  })
  const breakdownsValid = validateBreakdowns()
  return Object.keys(errors.value).length === 0 && breakdownsValid
}

// Draft validation (lighter)
function validateForDraft(): boolean {
  // Draft only: need at least category + date to be identifiable
  if (!neededDate.value || !expenseCategory.value) {
    toast.warning('Minimal isi tanggal dan kategori untuk menyimpan draft.')
    return false
  }
  // Validate date not in the past
  const today = new Date().toISOString().split('T')[0]!
  if (neededDate.value < today) {
    toast.warning('Tanggal kebutuhan dana tidak boleh kurang dari hari ini.')
    return false
  }
  // Validate breakdowns if any have data
  const hasBreakdownData = breakdowns.value.some(b => b.description.trim() || b.amount)
  if (hasBreakdownData) {
    return validateBreakdowns()
  }
  return true
}

const isSubmitting = computed(() => store.loading)

// ──── Build form data & submit ────
function buildFormData(isSubmit: boolean): FormData {
  const formData = new FormData()
  if (title.value.trim()) formData.append('title', title.value.trim())
  if (neededDate.value) formData.append('neededDate', neededDate.value)
  if (expenseCategory.value) formData.append('expenseCategory', expenseCategory.value)
  if (subCategory.value) formData.append('subCategory', subCategory.value)
  if (program.value.trim()) formData.append('program', program.value.trim())
  if (amount.value) formData.append('amount', amount.value)
  if (paymentMethod.value) formData.append('paymentMethod', paymentMethod.value)
  if (purpose.value.trim()) formData.append('purpose', purpose.value.trim())
  if (notes.value.trim()) formData.append('notes', notes.value.trim())
  formData.append('submit', String(isSubmit))

  // Breakdown list as JSON
  const breakdownData = breakdowns.value
    .filter(b => b.description.trim() || b.amount)
    .map(b => ({ description: b.description.trim(), amount: b.amount }))
  if (breakdownData.length > 0) {
    formData.append('breakdownList', JSON.stringify(breakdownData))
  }

  if (supportingDocument.value) {
    formData.append('supportingDocument', supportingDocument.value)
  }

  return formData
}

async function handleSubmit() {
  if (!validateAllForSubmit()) return
  const formData = buildFormData(true)
  try {
    await store.createPaymentRequest(formData)
  } catch {
    // error handled in store
  }
}

async function handleSaveDraft() {
  if (!validateForDraft()) return
  const formData = buildFormData(false)
  try {
    await store.createPaymentRequest(formData)
  } catch {
    // error handled in store
  }
}

function onCategoryChange() {
  subCategory.value = ''
  markTouched('expenseCategory')
}
</script>

<template>
  <div class="layout">
    <AsisSidebar />

    <main class="content">
      <!-- Header -->
      <header class="content-header">
        <div class="breadcrumb">
          <button type="button" class="breadcrumb-link" @click="router.push('/payment-requests')">
            Pengajuan Dana
          </button>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a1a1a1"
            stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
          <span class="breadcrumb-current">Ajukan Permintaan Dana</span>
        </div>
        <h1 class="page-title">Ajukan Permintaan Dana</h1>
      </header>

      <!-- Server error banner -->
      <div v-if="store.error" class="error-banner">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FF303E"
          stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <p>{{ store.error }}</p>
      </div>

      <!-- Form Card -->
      <form class="card" @submit.prevent="handleSubmit">
        <!-- Judul Pengajuan -->
        <div class="field">
          <label>Judul Pengajuan <span class="required">*</span></label>
          <input
            v-model="title"
            type="text"
            placeholder="Masukkan Judul Pengajuan"
            :class="['form-input', { 'is-error': showError('title') }]"
            @blur="markTouched('title')"
          />
          <p v-if="showError('title')" class="error-text">{{ showError('title') }}</p>
        </div>

        <!-- Tanggal Kebutuhan Dana -->
        <div class="field">
          <label>Tanggal Kebutuhan Dana <span class="required">*</span></label>
          <input
            v-model="neededDate"
            type="date"
            :class="['form-input form-input--date', { 'is-error': showError('neededDate') }]"
            @blur="markTouched('neededDate')"
          />
          <p v-if="showError('neededDate')" class="error-text">{{ showError('neededDate') }}</p>
        </div>

        <!-- Kategori + Sub-Kategori row -->
        <div class="field-row">
          <div class="field">
            <label>Kategori Pengeluaran <span class="required">*</span></label>
            <select
              v-model="expenseCategory"
              :class="['form-input', 'form-select', { 'is-error': showError('expenseCategory') }]"
              @change="onCategoryChange"
              @blur="markTouched('expenseCategory')"
            >
              <option value="" disabled>Masukkan Kategori Pengeluaran</option>
              <option v-for="opt in categoryOptions" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>
            <p v-if="showError('expenseCategory')" class="error-text">{{ showError('expenseCategory') }}</p>
          </div>
          <div class="field">
            <label>Sub-Kategori <span class="required">*</span></label>
            <select
              v-model="subCategory"
              :class="['form-input', 'form-select', { 'is-error': showError('subCategory') }]"
              :disabled="!expenseCategory"
              @blur="markTouched('subCategory')"
              @change="markTouched('subCategory')"
            >
              <option value="" disabled>Pilih Sub-Kategori</option>
              <option v-for="opt in subCategoryOptions" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>
            <p v-if="showError('subCategory')" class="error-text">{{ showError('subCategory') }}</p>
          </div>
        </div>

        <!-- Program Terkait -->
        <div class="field">
          <label>Program Terkait <span class="required">*</span></label>
          <input
            v-model="program"
            type="text"
            placeholder="Masukkan Program Terkait"
            :class="['form-input', { 'is-error': showError('program') }]"
            @blur="markTouched('program')"
          />
          <p v-if="showError('program')" class="error-text">{{ showError('program') }}</p>
        </div>

        <!-- Nominal + Metode Pembayaran row -->
        <div class="field-row">
          <div class="field">
            <label>Nominal Dana Diajukan <span class="required">*</span></label>
            <div class="amount-wrap" :class="{ 'is-error': showError('amount') }">
              <span class="prefix">Rp</span>
              <input
                :value="nominalDisplay"
                type="text"
                inputmode="numeric"
                placeholder="0"
                class="amount-input"
                @input="onNominalInput"
                @blur="markTouched('amount')"
              />
            </div>
            <p v-if="showError('amount')" class="error-text">{{ showError('amount') }}</p>
          </div>
          <div class="field">
            <label>Metode Pembayaran <span class="required">*</span></label>
            <select
              v-model="paymentMethod"
              :class="['form-input', 'form-select', { 'is-error': showError('paymentMethod') }]"
              @blur="markTouched('paymentMethod')"
              @change="markTouched('paymentMethod')"
            >
              <option value="" disabled>Masukkan Metode Pembayaran</option>
              <option v-for="opt in paymentMethodOptions" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>
            <p v-if="showError('paymentMethod')" class="error-text">{{ showError('paymentMethod') }}</p>
          </div>
        </div>

        <!-- Tujuan Penerima Dana -->
        <div class="field">
          <label>Tujuan Penerima Dana <span class="required">*</span></label>
          <input
            v-model="purpose"
            type="text"
            placeholder="Masukkan Tujuan Penerima Dana"
            :class="['form-input', { 'is-error': showError('purpose') }]"
            @blur="markTouched('purpose')"
          />
          <p v-if="showError('purpose')" class="error-text">{{ showError('purpose') }}</p>
        </div>

        <!-- Upload Dokumen Pendukung -->
        <div class="field">
          <label>Upload Dokumen Pendukung <span class="required">*</span></label>

          <div
            v-if="!supportingDocument"
            class="upload-box"
            :class="{ 'upload-drag': dragOver, 'is-error': showError('supportingDocument') }"
            @dragover.prevent="dragOver = true"
            @dragleave="dragOver = false"
            @drop="onDrop"
            @click="fileInputRef?.click()"
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
              :stroke="showError('supportingDocument') ? '#ff303e' : '#a1a1a1'" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"
              style="margin-bottom:10px">
              <polyline points="16 16 12 12 8 16" />
              <line x1="12" y1="12" x2="12" y2="21" />
              <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
            </svg>
            <p class="upload-text">Upload dokumen pendukung (wajib untuk submit)</p>
            <p class="upload-sub">Klik atau seret file — PDF, JPG, PNG (maks. 5MB)</p>
            <input
              ref="fileInputRef"
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              class="file-input-hidden"
              @change="onFileChange"
            />
          </div>

          <div v-else class="file-preview">
            <div class="file-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                stroke="#525252" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
            <div class="file-info">
              <p class="file-name">{{ supportingDocument.name }}</p>
              <p class="file-size">{{ formatFileSize(supportingDocument.size) }}</p>
            </div>
            <button type="button" class="file-remove" @click="removeFile">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <p v-if="showError('supportingDocument')" class="error-text">{{ showError('supportingDocument') }}</p>
        </div>

        <!-- Catatan Tambahan -->
        <div class="field">
          <label>Catatan Tambahan</label>
          <textarea
            v-model="notes"
            rows="4"
            placeholder="Masukkan Catatan..."
            class="form-textarea"
          />
        </div>
      </form>

      <!-- Rincian Penggunaan Dana Card -->
      <section class="card card--breakdown">
        <h2 class="breakdown-title">Rincian Penggunaan Dana</h2>

        <!-- Header row -->
        <div class="breakdown-header">
          <span class="breakdown-col--desc">Deskripsi Penggunaan</span>
          <span class="breakdown-col--amount">Nominal</span>
          <span class="breakdown-col--action"></span>
        </div>

        <!-- Items -->
        <div v-for="(item, index) in breakdowns" :key="index" class="breakdown-row">
          <input
            v-model="item.description"
            type="text"
            placeholder="Deskripsi penggunaan..."
            class="form-input breakdown-input--desc"
          />
          <div class="amount-wrap breakdown-input--amount">
            <span class="prefix">Rp</span>
            <input
              :value="item.amountDisplay"
              type="text"
              inputmode="numeric"
              placeholder="0"
              class="amount-input"
              @input="onBreakdownAmountInput(index, $event)"
            />
          </div>
          <button
            v-if="breakdowns.length > 1"
            type="button"
            class="breakdown-delete"
            @click="removeBreakdownItem(index)"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
          <span v-else class="breakdown-col--action"></span>
        </div>

        <!-- + Tambah Item -->
        <button type="button" class="btn-add-item" @click="addBreakdownItem">
          + Tambah Item
        </button>

        <!-- Total Rincian -->
        <div class="breakdown-total">
          <span class="breakdown-total-label">Total Rincian</span>
          <span class="breakdown-total-value">{{ formatCurrency(breakdownTotal) }}</span>
        </div>

        <p v-if="errors.breakdowns" class="error-text" style="margin-top: 4px;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:4px;">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {{ errors.breakdowns }}
        </p>
        <p v-if="errors.breakdownTotal" class="error-text" style="margin-top: 4px;">
          {{ errors.breakdownTotal }}
        </p>
      </section>

      <!-- Action bar -->
      <div class="action-bar">
        <button
          type="button"
          class="btn-cancel"
          :disabled="isSubmitting"
          @click="router.push('/payment-requests')"
        >
          Batal
        </button>
        <button
          type="button"
          class="btn-draft"
          :disabled="isSubmitting"
          @click="handleSaveDraft"
        >
          <span v-if="isSubmitting" class="spinner" />
          Simpan Draft
        </button>
        <button
          type="button"
          class="btn-submit"
          :disabled="isSubmitting"
          @click="handleSubmit"
        >
          <span v-if="isSubmitting" class="spinner" />
          Submit Pengajuan
        </button>
      </div>
    </main>
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
  padding: 40px 32px;
}

/* ── Header ── */
.content-header {
  margin-bottom: 24px;
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  margin-bottom: 10px;
}

.breadcrumb-link {
  background: none;
  border: none;
  padding: 0;
  color: #00c6ac;
  font-size: 13px;
  font-family: 'Manrope', system-ui, sans-serif;
  cursor: pointer;
}

.breadcrumb-link:hover { text-decoration: underline; }

.breadcrumb-current { color: #525252; }

.page-title {
  font-size: 32px;
  font-weight: 600;
  margin: 0;
  color: #171717;
  font-family: 'Poppins', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
}

/* ── Error banner ── */
.error-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  background-color: #fff1f2;
  border: 1px solid rgba(255, 48, 62, 0.2);
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 20px;
  font-size: 14px;
  color: #ff303e;
}

.error-banner p { margin: 0; }

/* ── Card ── */
.card {
  background-color: #ffffff;
  border-radius: 12px;
  padding: 32px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
  border: 1px solid #e5e5e5;
  margin-bottom: 24px;
}

/* ── Field ── */
.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 20px;
}

.field:last-child {
  margin-bottom: 0;
}

.field-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  margin-bottom: 20px;
}

label {
  font-size: 14px;
  font-weight: 600;
  color: #171717;
}

.required { color: #ff303e; }

/* ── Input ── */
.form-input {
  height: 44px;
  border-radius: 8px;
  border: 1px solid #d4d4d4;
  padding: 0 14px;
  font-size: 14px;
  color: #171717;
  font-family: 'Manrope', system-ui, sans-serif;
  background-color: #fff;
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.form-input:focus {
  border-color: #00c6ac;
  box-shadow: 0 0 0 1px #00c6ac;
}

.form-input.is-error {
  border-color: #ff303e;
}

.form-input.is-error:focus {
  box-shadow: 0 0 0 1px #ff303e;
}

.form-input:disabled {
  background-color: #f5f5f5;
  color: #a1a1a1;
  cursor: not-allowed;
}

.form-input--date {
  max-width: 280px;
}

.form-select {
  appearance: none;
  -webkit-appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23a1a1a1' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  cursor: pointer;
}

.form-textarea {
  border-radius: 8px;
  border: 1px solid #d4d4d4;
  padding: 12px 14px;
  font-size: 14px;
  color: #171717;
  font-family: 'Manrope', system-ui, sans-serif;
  outline: none;
  resize: none;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.form-textarea:focus {
  border-color: #00c6ac;
  box-shadow: 0 0 0 1px #00c6ac;
}

.form-textarea::placeholder,
.form-input::placeholder { color: #a1a1a1; }

/* ── Amount ── */
.amount-wrap {
  display: flex;
  align-items: center;
  height: 44px;
  border-radius: 8px;
  border: 1px solid #d4d4d4;
  padding: 0 14px;
  gap: 8px;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.amount-wrap:focus-within {
  border-color: #00c6ac;
  box-shadow: 0 0 0 1px #00c6ac;
}

.amount-wrap.is-error { border-color: #ff303e; }
.amount-wrap.is-error:focus-within { box-shadow: 0 0 0 1px #ff303e; }

.prefix {
  font-size: 14px;
  font-weight: 600;
  color: #525252;
  flex-shrink: 0;
}

.amount-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 14px;
  color: #171717;
  font-family: 'Manrope', system-ui, sans-serif;
  background: transparent;
  padding: 0;
}

.amount-input::placeholder { color: #a1a1a1; }

/* ── Error text ── */
.error-text {
  font-size: 12px;
  color: #ff303e;
  margin: 0;
}

/* ── Upload ── */
.upload-box {
  border: 2px dashed #d4d4d4;
  border-radius: 10px;
  padding: 32px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.15s, background-color 0.15s;
}

.upload-box:hover { border-color: #00c6ac; background-color: #fafafa; }
.upload-box.upload-drag { border-color: #00c6ac; background-color: #f0fdfb; }
.upload-box.is-error { border-color: #ff303e; }

.upload-text {
  font-weight: 600;
  font-size: 14px;
  color: #525252;
  margin: 0 0 4px;
}

.upload-sub {
  font-size: 12px;
  color: #a1a1a1;
  margin: 0;
}

.file-input-hidden { display: none; }

/* ── File preview ── */
.file-preview {
  display: flex;
  align-items: center;
  gap: 12px;
  border: 1px solid #d4d4d4;
  border-radius: 10px;
  padding: 12px 14px;
}

.file-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background-color: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.file-info { flex: 1; min-width: 0; }

.file-name {
  font-size: 13px;
  font-weight: 600;
  color: #171717;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-size {
  font-size: 12px;
  color: #a1a1a1;
  margin: 2px 0 0;
}

.file-remove {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: none;
  background: none;
  cursor: pointer;
  color: #a1a1a1;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.15s, color 0.15s;
}

.file-remove:hover { background-color: #fff1f2; color: #ff303e; }

/* ── Breakdown section ── */
.card--breakdown {
  padding: 32px;
}

.breakdown-title {
  font-size: 20px;
  font-weight: 700;
  color: #171717;
  margin: 0 0 20px;
  font-family: 'Poppins', system-ui, sans-serif;
}

.breakdown-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid #e5e5e5;
  margin-bottom: 12px;
  font-size: 13px;
  font-weight: 600;
  color: #525252;
}

.breakdown-col--desc { flex: 1; }
.breakdown-col--amount { width: 180px; }
.breakdown-col--action { width: 36px; }

.breakdown-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.breakdown-input--desc { flex: 1; }
.breakdown-input--amount { width: 180px; flex-shrink: 0; }

.breakdown-delete {
  width: 36px;
  height: 36px;
  border-radius: 6px;
  border: none;
  background: none;
  cursor: pointer;
  color: #a1a1a1;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.15s, color 0.15s;
}

.breakdown-delete:hover { background-color: #fff1f2; color: #ff303e; }

.btn-add-item {
  background: none;
  border: 2px solid #00c6ac;
  color: #00c6ac;
  font-size: 13px;
  font-weight: 600;
  font-family: 'Manrope', system-ui, sans-serif;
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
  margin-top: 4px;
  margin-bottom: 16px;
  transition: background-color 0.15s;
}

.btn-add-item:hover { background-color: #f0fdfb; }

.breakdown-total {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #f5f5f5;
  border-radius: 8px;
  padding: 14px 16px;
}

.breakdown-total-label {
  font-size: 14px;
  font-weight: 700;
  color: #171717;
}

.breakdown-total-value {
  font-size: 14px;
  font-weight: 700;
  color: #00c6ac;
}

/* ── Action bar ── */
.action-bar {
  display: flex;
  justify-content: center;
  gap: 16px;
  background-color: #ffffff;
  border-radius: 12px;
  padding: 20px 32px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
  border: 1px solid #e5e5e5;
}

.btn-cancel {
  height: 44px;
  padding: 0 24px;
  border-radius: 8px;
  border: 2px solid #ff303e;
  background-color: #ffffff;
  color: #ff303e;
  font-size: 14px;
  font-weight: 600;
  font-family: 'Manrope', system-ui, sans-serif;
  cursor: pointer;
  transition: background-color 0.15s;
}

.btn-cancel:hover:not(:disabled) { background-color: #fff1f2; }
.btn-cancel:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-draft {
  height: 44px;
  padding: 0 24px;
  border-radius: 8px;
  border: 2px solid #00c6ac;
  background-color: #ffffff;
  color: #00c6ac;
  font-size: 14px;
  font-weight: 600;
  font-family: 'Manrope', system-ui, sans-serif;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: background-color 0.15s;
}

.btn-draft:hover:not(:disabled) { background-color: #f0fdfb; }
.btn-draft:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-submit {
  height: 44px;
  padding: 0 24px;
  border-radius: 8px;
  border: none;
  background-color: #00c6ac;
  color: #ffffff;
  font-size: 14px;
  font-weight: 600;
  font-family: 'Manrope', system-ui, sans-serif;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: background-color 0.15s;
}

.btn-submit:hover:not(:disabled) { background-color: #00b39c; }
.btn-submit:disabled { opacity: 0.5; cursor: not-allowed; }

/* ── Spinner ── */
.spinner {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: currentColor;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  flex-shrink: 0;
}

@keyframes spin { to { transform: rotate(360deg); } }
</style>
