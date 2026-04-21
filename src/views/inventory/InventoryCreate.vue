<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import AsisSidebar from '@/components/AsisSidebar.vue'
import { useInventoryStore } from '@/stores/inventory.store'
import type {
  InventoryCategory,
  InventoryUnit,
  InventoryBreakdownRow,
} from '@/interfaces/inventory.interface'

const store = useInventoryStore()
const router = useRouter()

// Form fields
const itemName = ref('')
const donorSource = ref('')
const category = ref<InventoryCategory | ''>('')
const quantity = ref<string>('')
const unit = ref<InventoryUnit | ''>('')
const note = ref('')
const photoFile = ref<File | null>(null)

// Breakdown repeater
const breakdowns = ref<InventoryBreakdownRow[]>([
  { name: '', amount: '', amountDisplay: '' },
])

// Drag & drop
const dragOver = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)

// Validation state
const errors = ref<Record<string, string>>({})
const touched = ref<Record<string, boolean>>({})

const categoryOptions: { label: string; value: InventoryCategory }[] = [
  { label: 'Aset', value: 'ASET' },
  { label: 'Kebutuhan Pokok', value: 'KEBUTUHAN_POKOK' },
  { label: 'Perlengkapan Ibadah', value: 'PERLENGKAPAN_IBADAH' },
  { label: 'Pendidikan', value: 'PENDIDIKAN' },
]

const unitOptions: { label: string; value: InventoryUnit }[] = [
  { label: 'buah', value: 'BUAH' },
  { label: 'unit', value: 'UNIT' },
  { label: 'kardus', value: 'KARDUS' },
  { label: 'lusin', value: 'LUSIN' },
  { label: 'pcs', value: 'PCS' },
  { label: 'set', value: 'SET' },
  { label: 'lembar', value: 'LEMBAR' },
  { label: 'kg', value: 'KG' },
  { label: 'pack', value: 'PACK' },
  { label: 'rim', value: 'RIM' },
]

function clearError(field: string) {
  if (errors.value[field]) {
    const e = { ...errors.value }
    delete e[field]
    errors.value = e
  }
}

function markTouched(field: string) {
  touched.value = { ...touched.value, [field]: true }
  validateField(field)
}

function showError(field: string): string | undefined {
  return touched.value[field] ? errors.value[field] : undefined
}

function onQuantityInput(event: Event) {
  const raw = (event.target as HTMLInputElement).value
  const digits = raw.replace(/[^\d]/g, '')
  quantity.value = digits
  clearError('quantity')
  clearError('breakdownTotal')
}

function onBreakdownAmountInput(index: number, event: Event) {
  const raw = (event.target as HTMLInputElement).value
  const digits = raw.replace(/[^\d]/g, '')
  const row = breakdowns.value[index]
  if (!row) return
  row.amount = digits
  row.amountDisplay = digits ? parseInt(digits, 10).toLocaleString('id-ID') : ''
  clearError('breakdowns')
  clearError('breakdownTotal')
}

function addBreakdownRow() {
  breakdowns.value.push({ name: '', amount: '', amountDisplay: '' })
}

function removeBreakdownRow(index: number) {
  if (breakdowns.value.length <= 1) return
  breakdowns.value.splice(index, 1)
  clearError('breakdowns')
  clearError('breakdownTotal')
}

const breakdownTotal = computed(() => {
  return breakdowns.value.reduce((sum, row) => sum + (parseInt(row.amount || '0', 10) || 0), 0)
})

function handleFileSelect(file: File) {
  const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  if (!allowed.includes(file.type)) {
    errors.value = { ...errors.value, photoFile: 'Format foto tidak didukung. Gunakan JPG, PNG, GIF, atau WebP.' }
    return
  }
  if (file.size > 5 * 1024 * 1024) {
    errors.value = { ...errors.value, photoFile: 'Ukuran foto melebihi batas 5MB.' }
    return
  }
  photoFile.value = file
  clearError('photoFile')
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
  photoFile.value = null
  if (fileInputRef.value) fileInputRef.value.value = ''
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function validateField(field: string) {
  const e = { ...errors.value }

  switch (field) {
    case 'itemName':
      if (!itemName.value.trim()) e.itemName = 'Nama barang wajib diisi'
      else delete e.itemName
      break
    case 'donorSource':
      if (!donorSource.value.trim()) e.donorSource = 'Sumber donasi wajib diisi'
      else delete e.donorSource
      break
    case 'category':
      if (!category.value) e.category = 'Kategori wajib dipilih'
      else delete e.category
      break
    case 'quantity':
      if (!quantity.value) e.quantity = 'Quantity wajib diisi'
      else if (isNaN(Number(quantity.value)) || Number(quantity.value) <= 0)
        e.quantity = 'Quantity harus berupa angka dan lebih dari 0'
      else delete e.quantity
      break
    case 'unit':
      if (!unit.value) e.unit = 'Satuan wajib dipilih'
      else delete e.unit
      break
    case 'photoFile':
      if (!photoFile.value) e.photoFile = 'Foto barang wajib diupload'
      else delete e.photoFile
      break
  }

  errors.value = e
}

function validateBreakdowns(): boolean {
  const e = { ...errors.value }

  // At least one row, and every row must be complete (name + amount > 0)
  const allValid = breakdowns.value.every((row) => {
    const nameOk = !!row.name?.trim()
    const amt = parseInt(row.amount || '0', 10) || 0
    return nameOk && amt > 0
  })

  if (!allValid) {
    e.breakdowns = 'Rincian barang wajib diisi lengkap (nama item dan jumlah per baris)'
  } else {
    delete e.breakdowns
  }

  // Total must match quantity
  if (quantity.value && parseInt(quantity.value, 10) > 0) {
    if (breakdownTotal.value !== parseInt(quantity.value, 10)) {
      e.breakdownTotal = 'Total rincian harus sama dengan Quantity'
    } else {
      delete e.breakdownTotal
    }
  }

  errors.value = e
  return !e.breakdowns && !e.breakdownTotal
}

function validateAllForSubmit(): boolean {
  const fields = ['itemName', 'donorSource', 'category', 'quantity', 'unit', 'photoFile']
  fields.forEach((f) => {
    touched.value[f] = true
    validateField(f)
  })
  const breakdownValid = validateBreakdowns()
  return Object.keys(errors.value).length === 0 && breakdownValid
}

const isSubmitting = computed(() => store.loading)

const isFormValid = computed(() => {
  const baseValid =
    !!itemName.value.trim() &&
    !!donorSource.value.trim() &&
    !!category.value &&
    !!quantity.value &&
    !isNaN(Number(quantity.value)) &&
    Number(quantity.value) > 0 &&
    !!unit.value &&
    !!photoFile.value

  if (!baseValid) return false

  // Lightweight breakdown validity (same as validateBreakdowns, but without mutating errors)
  const allValid = breakdowns.value.every((row) => {
    const nameOk = !!row.name?.trim()
    const amt = parseInt(row.amount || '0', 10) || 0
    return nameOk && amt > 0
  })
  if (!allValid) return false
  return breakdownTotal.value === parseInt(quantity.value, 10)
})

watch(
  () => quantity.value,
  () => {
    if (touched.value.quantity) validateField('quantity')
    if (touched.value.breakdowns || touched.value.breakdownTotal) {
      validateBreakdowns()
    }
  },
)

async function handleSubmit() {
  if (!validateAllForSubmit()) return

  const formData = new FormData()
  formData.append('itemName', itemName.value.trim())
  formData.append('category', String(category.value))
  formData.append('donorSource', donorSource.value.trim())
  formData.append('quantity', quantity.value)
  formData.append('unit', String(unit.value))
  if (note.value.trim()) formData.append('note', note.value.trim())
  if (photoFile.value) formData.append('photoFile', photoFile.value)

  const breakdownPayload = breakdowns.value.map((row) => ({
    name: row.name.trim(),
    amount: row.amount,
  }))
  formData.append('breakdownsList', JSON.stringify(breakdownPayload))

  try {
    await store.createInventoryItem(formData)
  } catch {
    // handled in store
  }
}
</script>

<template>
  <div class="layout">
    <AsisSidebar />

    <main class="content">
      <header class="content-header">
        <div class="breadcrumb">
          <button type="button" class="breadcrumb-link" @click="router.push('/inventory')">
            Daftar Inventory
          </button>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a1a1a1"
            stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
          <span class="breadcrumb-current">Tambah</span>
        </div>
        <h1 class="page-title">Tambah Item Inventory</h1>
      </header>

      <div v-if="store.error" class="error-banner">
        <p>{{ store.error }}</p>
      </div>

      <form class="card" @submit.prevent="handleSubmit">
        <div class="form-grid">
          <div class="col">
            <div class="field">
              <label>Nama Barang <span class="required">*</span></label>
              <input
                v-model="itemName"
                type="text"
                placeholder="Masukkan nama barang"
                :class="['form-input', { 'is-error': showError('itemName') }]"
                @blur="markTouched('itemName')"
              />
              <p v-if="showError('itemName')" class="error-text">{{ showError('itemName') }}</p>
            </div>

            <div class="field">
              <label>Sumber Donasi <span class="required">*</span></label>
              <input
                v-model="donorSource"
                type="text"
                placeholder="Masukkan sumber donasi"
                :class="['form-input', { 'is-error': showError('donorSource') }]"
                @blur="markTouched('donorSource')"
              />
              <p v-if="showError('donorSource')" class="error-text">{{ showError('donorSource') }}</p>
            </div>

            <div class="field">
              <label>Category <span class="required">*</span></label>
              <select
                v-model="category"
                :class="['form-input', 'form-select', { 'is-error': showError('category') }]"
                @blur="markTouched('category')"
                @change="markTouched('category')"
              >
                <option value="" disabled>Pilih category</option>
                <option v-for="opt in categoryOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
              <p v-if="showError('category')" class="error-text">{{ showError('category') }}</p>
            </div>

            <div class="field-row">
              <div class="field">
                <label>Quantity <span class="required">*</span></label>
                <input
                  :value="quantity"
                  type="text"
                  inputmode="numeric"
                  placeholder="0"
                  :class="['form-input', { 'is-error': showError('quantity') }]"
                  @input="onQuantityInput"
                  @blur="markTouched('quantity')"
                />
                <p v-if="showError('quantity')" class="error-text">{{ showError('quantity') }}</p>
              </div>

              <div class="field">
                <label>Satuan <span class="required">*</span></label>
                <select
                  v-model="unit"
                  :class="['form-input', 'form-select', { 'is-error': showError('unit') }]"
                  @blur="markTouched('unit')"
                  @change="markTouched('unit')"
                >
                  <option value="" disabled>Pilih satuan</option>
                  <option v-for="opt in unitOptions" :key="opt.value" :value="opt.value">
                    {{ opt.label }}
                  </option>
                </select>
                <p v-if="showError('unit')" class="error-text">{{ showError('unit') }}</p>
              </div>
            </div>
          </div>

          <div class="col">
            <div class="field">
              <label>Upload Foto <span class="required">*</span></label>

              <div
                v-if="!photoFile"
                class="upload-box"
                :class="{ 'upload-drag': dragOver, 'is-error': showError('photoFile') }"
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
                <p class="upload-text">Upload foto barang</p>
                <p class="upload-sub">Klik atau seret file — JPG, PNG, GIF, atau WebP (maks. 5MB)</p>
                <input
                  ref="fileInputRef"
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
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
                  <p class="file-name">{{ photoFile.name }}</p>
                  <p class="file-size">{{ formatFileSize(photoFile.size) }}</p>
                </div>
                <button type="button" class="file-remove" @click="removeFile">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              <p v-if="showError('photoFile')" class="error-text">{{ showError('photoFile') }}</p>
            </div>

            <div class="field">
              <label>Catatan</label>
              <textarea
                v-model="note"
                rows="6"
                placeholder="Tambahkan catatan (opsional)"
                class="form-textarea"
              />
            </div>
          </div>
        </div>

        <section class="card card--breakdown">
          <h2 class="breakdown-title">Tabel Rincian Barang <span class="required">*</span></h2>

          <div class="breakdown-header">
            <span class="breakdown-col--name">Nama Item</span>
            <span class="breakdown-col--amount">Jumlah</span>
            <span class="breakdown-col--action"></span>
          </div>

          <div v-for="(row, index) in breakdowns" :key="index" class="breakdown-row">
            <input
              v-model="row.name"
              type="text"
              placeholder="Nama item..."
              class="form-input breakdown-input--name"
              @input="clearError('breakdowns'); clearError('breakdownTotal')"
            />
            <input
              :value="row.amountDisplay"
              type="text"
              inputmode="numeric"
              placeholder="0"
              class="form-input breakdown-input--amount"
              @input="onBreakdownAmountInput(index, $event)"
            />
            <button
              v-if="breakdowns.length > 1"
              type="button"
              class="breakdown-delete"
              @click="removeBreakdownRow(index)"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
            <span v-else class="breakdown-col--action"></span>
          </div>

          <button type="button" class="btn-add-item" @click="addBreakdownRow">
            + Tambah Baris
          </button>

          <div class="breakdown-total">
            <span class="breakdown-total-label">Total Rincian</span>
            <span class="breakdown-total-value">{{ breakdownTotal.toLocaleString('id-ID') }}</span>
          </div>

          <p v-if="errors.breakdowns" class="error-text" style="margin-top: 8px;">
            {{ errors.breakdowns }}
          </p>
          <p v-if="errors.breakdownTotal" class="error-text" style="margin-top: 4px;">
            {{ errors.breakdownTotal }}
          </p>
        </section>

        <div class="form-actions">
          <button
            type="button"
            class="btn-secondary"
            :disabled="isSubmitting"
            @click="router.push('/inventory')"
          >
            Kembali
          </button>
          <button
            type="submit"
            class="btn-primary"
            :disabled="isSubmitting || !isFormValid"
            @click="touched.breakdowns = true; touched.breakdownTotal = true; validateBreakdowns()"
          >
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

.breadcrumb-link:hover {
  text-decoration: underline;
}

.breadcrumb-current {
  color: #525252;
}

.page-title {
  font-size: 32px;
  font-weight: 600;
  margin: 0;
  color: #171717;
  font-family: 'Poppins', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
}

.error-banner {
  background-color: #fff1f2;
  border: 1px solid rgba(255, 48, 62, 0.2);
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 20px;
  font-size: 14px;
  color: #ff303e;
}

.error-banner p {
  margin: 0;
}

.card {
  background-color: #ffffff;
  border-radius: 12px;
  padding: 32px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
  border: 1px solid #e5e5e5;
  margin-bottom: 24px;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px 32px;
  margin-bottom: 24px;
}

.col {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
}

label {
  font-size: 14px;
  font-weight: 600;
  color: #171717;
}

.required {
  color: #ff303e;
}

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

.error-text {
  font-size: 12px;
  color: #ff303e;
  margin: 0;
}

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

.upload-box:hover {
  border-color: #00c6ac;
  background-color: #fafafa;
}

.upload-box.upload-drag {
  border-color: #00c6ac;
  background-color: #f0fdfb;
}

.upload-box.is-error {
  border-color: #ff303e;
}

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

.file-input-hidden {
  display: none;
}

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

.file-info {
  flex: 1;
  min-width: 0;
}

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

.file-remove:hover {
  background-color: #fff1f2;
  color: #ff303e;
}

.card--breakdown {
  padding: 28px;
}

.breakdown-title {
  font-size: 20px;
  font-weight: 700;
  color: #171717;
  margin: 0 0 18px;
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

.breakdown-col--name {
  flex: 1;
}

.breakdown-col--amount {
  width: 160px;
}

.breakdown-col--action {
  width: 36px;
}

.breakdown-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.breakdown-input--name {
  flex: 1;
}

.breakdown-input--amount {
  width: 160px;
  flex-shrink: 0;
}

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

.breakdown-delete:hover {
  background-color: #fff1f2;
  color: #ff303e;
}

.btn-add-item {
  background: none;
  border: 2px solid #00c6ac;
  color: #00c6ac;
  font-size: 13px;
  font-weight: 700;
  font-family: 'Manrope', system-ui, sans-serif;
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
  margin-top: 4px;
  margin-bottom: 16px;
  transition: background-color 0.15s;
}

.btn-add-item:hover {
  background-color: #f0fdfb;
}

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

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 18px;
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
  font-weight: 700;
  font-family: 'Manrope', system-ui, sans-serif;
  cursor: pointer;
  transition: background-color 0.15s;
}

.btn-secondary:hover:not(:disabled) {
  background-color: #f0fdfb;
}

.btn-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  height: 44px;
  padding: 0 24px;
  border-radius: 8px;
  border: none;
  background-color: #00c6ac;
  color: #ffffff;
  font-size: 14px;
  font-weight: 700;
  font-family: 'Manrope', system-ui, sans-serif;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: background-color 0.15s;
}

.btn-primary:hover:not(:disabled) {
  background-color: #00b39c;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

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

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>

