<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useIncomeTransactionStore } from '@/stores/income-transaction.store'
import AsisSidebar from '@/components/AsisSidebar.vue'

const store = useIncomeTransactionStore()
const router = useRouter()

const today = new Date().toISOString().slice(0, 10)

// Form fields                       
const transactionDate = ref<string>(today)
const category = ref<string>('')
const sourceType = ref<string>('')
const paymentMethod = ref<string>('')
const nominalDisplay = ref<string>('')
const amount = ref<string>('')
const donorName = ref<string>('')
const note = ref<string>('')
const proofFile = ref<File | null>(null)

// Drag & drop     
const dragOver = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)

// Validation state                    
const errors = ref<Record<string, string>>({})
const touched = ref<Record<string, boolean>>({})

// Options  
const categoryOptions = [
  { label: 'Donasi', value: 'DONASI' },
  { label: 'Zakat', value: 'ZAKAT' },
  { label: 'Infaq', value: 'INFAQ' },
  { label: 'Lain-lain', value: 'LAIN_LAIN' },
]

const sourceTypeOptions = [
  { label: 'Individu', value: 'INDIVIDU' },
  { label: 'Komunitas', value: 'KOMUNITAS' },
  { label: 'Perusahaan', value: 'PERUSAHAAN' },
]

const paymentMethodOptions = [
  { label: 'Tunai', value: 'CASH' },
  { label: 'Transfer Bank', value: 'TRANSFER' },
]

// Nominal input (formatted display)           
function onNominalInput(event: Event) {
  const raw = (event.target as HTMLInputElement).value
  const digits = raw.replace(/\D/g, '')
  nominalDisplay.value = digits ? parseInt(digits).toLocaleString('id-ID') : ''
  amount.value = digits
  if (errors.value.amount) {
    const e = { ...errors.value }
    delete e.amount
    errors.value = e
  }
}

// File handling           
function handleFileSelect(file: File) {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
  if (!allowed.includes(file.type)) {
    errors.value = { ...errors.value, proofFile: 'Format file tidak didukung. Gunakan JPG, PNG, WEBP, atau PDF.' }
    return
  }
  if (file.size > 5 * 1024 * 1024) {
    errors.value = { ...errors.value, proofFile: 'Ukuran file melebihi batas 5MB.' }
    return
  }
  proofFile.value = file
  const e = { ...errors.value }
  delete e.proofFile
  errors.value = e
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
  proofFile.value = null
  if (fileInputRef.value) fileInputRef.value.value = ''
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// Per field validation                  
function validateField(field: string) {
  const e = { ...errors.value }
  switch (field) {
    case 'transactionDate':
      if (!transactionDate.value) e.transactionDate = 'Tanggal transaksi wajib diisi'
      else delete e.transactionDate
      break
    case 'category':
      if (!category.value) e.category = 'Kategori pemasukan wajib dipilih'
      else delete e.category
      break
    case 'sourceType':
      if (!sourceType.value) e.sourceType = 'Sumber donasi wajib dipilih'
      else delete e.sourceType
      break
    case 'paymentMethod':
      if (!paymentMethod.value) e.paymentMethod = 'Metode pembayaran wajib dipilih'
      else delete e.paymentMethod
      break
    case 'amount':
      if (!amount.value) e.amount = 'Nominal wajib diisi'
      else if (isNaN(Number(amount.value)) || Number(amount.value) <= 0)
        e.amount = 'Nominal harus berupa angka dan lebih dari 0'
      else delete e.amount
      break
    case 'donorName':
      if (!donorName.value.trim()) e.donorName = 'Nama donatur wajib diisi'
      else delete e.donorName
      break
    case 'proofFile':
      if (!proofFile.value) e.proofFile = 'Bukti transaksi wajib diupload'
      else delete e.proofFile
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

// Full validation  
function validateAll(): boolean {
  const fields = ['transactionDate', 'category', 'sourceType', 'paymentMethod', 'amount', 'donorName', 'proofFile']
  fields.forEach((f) => {
    touched.value[f] = true
    validateField(f)
  })
  return Object.keys(errors.value).length === 0
}

// Form validity  
const isFormValid = computed(() =>
  !!transactionDate.value &&
  !!category.value &&
  !!sourceType.value &&
  !!paymentMethod.value &&
  !!amount.value &&
  !isNaN(Number(amount.value)) &&
  Number(amount.value) > 0 &&
  !!donorName.value.trim() &&
  !!proofFile.value
)

const isSubmitting = computed(() => store.loading)

// Submit                         
async function handleSubmit() {
  if (!validateAll()) return

  const formData = new FormData()
  formData.append('transactionDate', transactionDate.value)
  formData.append('category', category.value)
  formData.append('sourceType', sourceType.value)
  formData.append('paymentMethod', paymentMethod.value)
  formData.append('amount', amount.value)
  if (donorName.value) formData.append('donorName', donorName.value)
  if (note.value) formData.append('note', note.value)
  if (proofFile.value) formData.append('proofFile', proofFile.value)

  try {
    await store.createIncomeTransaction(formData)
  } catch {
    // error sudah di-handle di store (toast + store.error)
  }
}
</script>

<template>
  <div class="layout">
    <AsisSidebar />

    <main class="content">
      <!-- Header -->
      <header class="content-header">
        <div class="breadcrumb">
          <button type="button" class="breadcrumb-link" @click="router.push('/income-transactions')">
            Daftar Pemasukan
          </button>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a1a1a1"
            stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
          <span class="breadcrumb-current">Tambah</span>
        </div>
        <h1 class="page-title">Tambah Transaksi Pemasukan</h1>
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
        <div class="form-grid">
          <!--   LEFT COLUMN   -->
          <div class="col">
            <!-- Tanggal Transaksi -->
            <div class="field">
              <label>Tanggal Transaksi <span class="required">*</span></label>
              <input
                v-model="transactionDate"
                type="date"
                :class="['form-input', { 'is-error': showError('transactionDate') }]"
                @blur="markTouched('transactionDate')"
              />
              <p v-if="showError('transactionDate')" class="error-text">
                {{ showError('transactionDate') }}
              </p>
            </div>

            <!-- Kategori -->
            <div class="field">
              <label>Kategori Pemasukan <span class="required">*</span></label>
              <select
                v-model="category"
                :class="['form-input', 'form-select', { 'is-error': showError('category') }]"
                @blur="markTouched('category')"
                @change="markTouched('category')"
              >
                <option value="" disabled>Pilih Kategori</option>
                <option v-for="opt in categoryOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
              <p v-if="showError('category')" class="error-text">{{ showError('category') }}</p>
            </div>

            <!-- Sumber Donasi -->
            <div class="field">
              <label>Sumber Donasi <span class="required">*</span></label>
              <select
                v-model="sourceType"
                :class="['form-input', 'form-select', { 'is-error': showError('sourceType') }]"
                @blur="markTouched('sourceType')"
                @change="markTouched('sourceType')"
              >
                <option value="" disabled>Pilih Sumber</option>
                <option v-for="opt in sourceTypeOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
              <p v-if="showError('sourceType')" class="error-text">{{ showError('sourceType') }}</p>
            </div>

            <!-- Metode Pembayaran -->
            <div class="field">
              <label>Metode Pembayaran <span class="required">*</span></label>
              <select
                v-model="paymentMethod"
                :class="['form-input', 'form-select', { 'is-error': showError('paymentMethod') }]"
                @blur="markTouched('paymentMethod')"
                @change="markTouched('paymentMethod')"
              >
                <option value="" disabled>Pilih Metode</option>
                <option v-for="opt in paymentMethodOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
              <p v-if="showError('paymentMethod')" class="error-text">{{ showError('paymentMethod') }}</p>
            </div>

            <!-- Nominal -->
            <div class="field">
              <label>Nominal <span class="required">*</span></label>
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

            <!-- Nama Donatur -->
            <div class="field">
              <label>Nama Donatur <span class="required">*</span></label>
              <input
                v-model="donorName"
                type="text"
                placeholder="Masukkan nama donatur"
                :class="['form-input', { 'is-error': showError('donorName') }]"
                @blur="markTouched('donorName')"
              />
              <p v-if="showError('donorName')" class="error-text">{{ showError('donorName') }}</p>
            </div>
          </div>

          <!--   RIGHT COLUMN   -->
          <div class="col">
            <!-- Catatan Tambahan -->
            <div class="field">
              <label>Catatan Tambahan</label>
              <textarea
                v-model="note"
                rows="5"
                placeholder="Tambahkan catatan (opsional)"
                class="form-textarea"
              />
            </div>

            <!-- Upload Bukti Transaksi -->
            <div class="field">
              <label>Upload Bukti Transaksi <span class="required">*</span></label>

              <!-- Drop zone -->
              <div
                v-if="!proofFile"
                class="upload-box"
                :class="{ 'upload-drag': dragOver, 'is-error': showError('proofFile') }"
                @dragover.prevent="dragOver = true"
                @dragleave="dragOver = false"
                @drop="onDrop"
                @click="fileInputRef?.click()"
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
                  stroke="#a1a1a1" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"
                  style="margin-bottom:10px">
                  <polyline points="16 16 12 12 8 16" />
                  <line x1="12" y1="12" x2="12" y2="21" />
                  <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
                </svg>
                <p class="upload-text">Klik atau seret file ke sini</p>
                <p class="upload-sub">JPG, PNG, WEBP, atau PDF (maks. 5MB)</p>
                <input
                  ref="fileInputRef"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  class="file-input-hidden"
                  @change="onFileChange"
                />
              </div>

              <!-- File preview -->
              <div v-else class="file-preview">
                <div class="file-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                    stroke="#525252" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                </div>
                <div class="file-info">
                  <p class="file-name">{{ proofFile.name }}</p>
                  <p class="file-size">{{ formatFileSize(proofFile.size) }}</p>
                </div>
                <button type="button" class="file-remove" @click="removeFile">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              <p v-if="showError('proofFile')" class="error-text">{{ showError('proofFile') }}</p>
            </div>
          </div>
        </div>

        <!-- Action buttons -->
        <div class="form-actions">
          <button
            type="button"
            class="btn-secondary"
            :disabled="isSubmitting"
            @click="router.push('/income-transactions')"
          >
            Kembali
          </button>
          <button type="submit" class="btn-primary" :disabled="isSubmitting || !isFormValid">
            <span v-if="isSubmitting" class="spinner" />
            {{ isSubmitting ? 'Menyimpan...' : 'Simpan' }}
          </button>
        </div>
      </form>
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

/*   Header  */
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

/*   Error banner  */
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

/*   Card   */
.card {
  background-color: #ffffff;
  border-radius: 12px;
  padding: 32px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
  border: 1px solid #e5e5e5;
}

/*   Grid  */
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px 32px;
  margin-bottom: 32px;
}

.col {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/*   Field  */
.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

label {
  font-size: 14px;
  font-weight: 600;
  color: #171717;
}

.required { color: #ff303e; }

/*   Shared input base  */
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

/*   Amount                         */
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

/*   Error text  */
.error-text {
  font-size: 12px;
  color: #ff303e;
  margin: 0;
}

/*   Upload  */
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

/*   File preview  */
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

/*   Actions */
.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 24px;
  border-top: 1px solid #e5e5e5;
}

.btn-secondary {
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
  transition: background-color 0.15s;
}

.btn-secondary:hover:not(:disabled) { background-color: #f0fdfb; }
.btn-secondary:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-primary {
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

.btn-primary:hover:not(:disabled) { background-color: #00b39c; }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

/*  Spinner  */
.spinner {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #ffffff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  flex-shrink: 0;
}

@keyframes spin { to { transform: rotate(360deg); } }
</style>