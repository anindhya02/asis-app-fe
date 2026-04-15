<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AsisSidebar from '@/components/AsisSidebar.vue'
import { useExpenseTransactionStore } from '@/stores/expense-transaction.store'
import {
  EXPENSE_CATEGORY_FILTER_OPTIONS,
  expenseSubOptionsForMain,
} from '@/lib/expense-categories'

const route = useRoute()
const router = useRouter()
const store = useExpenseTransactionStore()
const id = computed(() => route.params.id as string)

const initialLoading = ref(true)
const loadFailed = ref(false)

const transactionDate = ref('')
const amountDisplay = ref('')
const paymentMethodDisplay = ref('')
const proofFileName = ref('')
const category = ref('')
const subCategory = ref('')
const program = ref('')
const penerimaDana = ref('')
const note = ref('')

const errors = ref<Record<string, string>>({})
const touched = ref<Record<string, boolean>>({})

const subCategoryOptions = computed(() => expenseSubOptionsForMain(category.value))
const requiresSubCategory = computed(() => subCategoryOptions.value.length > 0)

const programOptions = [
  { label: 'Rumah Yatim', value: 'Rumah Yatim' },
  { label: 'Beasiswa Pendidikan', value: 'Beasiswa Pendidikan' },
  { label: 'Pemberdayaan Ekonomi', value: 'Pemberdayaan Ekonomi' },
  { label: 'Kesehatan', value: 'Kesehatan' },
  { label: 'Dakwah', value: 'Dakwah' },
  { label: 'Operasional Kantor', value: 'Operasional Kantor' },
  { label: 'Lain-lain', value: 'Lain-lain' },
]

function applyInitialData() {
  const item = store.currentItem
  if (!item) return
  transactionDate.value = item.transactionDate
  amountDisplay.value = Number(item.amount).toLocaleString('id-ID')
  paymentMethodDisplay.value = item.paymentMethod === 'CASH' ? 'Tunai' : 'Transfer Bank'
  proofFileName.value = item.proofFilePath?.split('/').pop()?.split('?')[0] ?? 'Bukti transaksi tersimpan'
  category.value = item.category
  subCategory.value = item.subCategory ?? ''
  program.value = item.program
  penerimaDana.value = item.penerimaDana
  note.value = item.note ?? ''
}

function onCategoryChange() {
  if (subCategoryOptions.value.length === 0) {
    subCategory.value = ''
  }
  markTouched('category')
}

function validateField(field: string) {
  const e = { ...errors.value }
  switch (field) {
    case 'category':
      if (!category.value) e.category = 'Kategori pengeluaran wajib dipilih'
      else delete e.category
      break
    case 'subCategory':
      if (requiresSubCategory.value && !subCategory.value) e.subCategory = 'Sub-kategori wajib dipilih'
      else delete e.subCategory
      break
    case 'program':
      if (!program.value) e.program = 'Program terkait wajib dipilih'
      else delete e.program
      break
    case 'penerimaDana':
      if (!penerimaDana.value.trim()) e.penerimaDana = 'Penerima dana wajib diisi'
      else delete e.penerimaDana
      break
  }
  errors.value = e
}

function markTouched(field: string) {
  touched.value = { ...touched.value, [field]: true }
  validateField(field)
}

function showError(field: string) {
  return touched.value[field] ? errors.value[field] : undefined
}

function validateAll() {
  const fields = ['category', 'subCategory', 'program', 'penerimaDana']
  fields.forEach((f) => {
    touched.value[f] = true
    validateField(f)
  })
  return Object.keys(errors.value).length === 0
}

const isFormValid = computed(() =>
  !!category.value &&
  !!program.value &&
  !!penerimaDana.value.trim() &&
  (!requiresSubCategory.value || !!subCategory.value),
)

const isSubmitting = computed(() => store.loading)

async function handleSubmit() {
  if (!validateAll()) return
  const formData = new FormData()
  formData.append('category', category.value)
  if (subCategory.value) {
    formData.append('subCategory', subCategory.value)
  }
  formData.append('program', program.value)
  formData.append('penerimaDana', penerimaDana.value)
  if (note.value) formData.append('note', note.value)

  try {
    await store.updateExpenseTransaction(id.value, formData)
    await router.push(`/expense-transactions/${id.value}`)
  } catch {
    // Handled by store toast + error state.
  }
}

onMounted(async () => {
  initialLoading.value = true
  loadFailed.value = false
  try {
    await store.fetchExpenseTransactionById(id.value)
    if (!store.currentItem) {
      loadFailed.value = true
      return
    }
    applyInitialData()
  } catch {
    loadFailed.value = true
  } finally {
    initialLoading.value = false
  }
})
</script>

<template>
  <div class="layout">
    <AsisSidebar />
    <main class="content">
      <template v-if="initialLoading">
        <div class="skeleton-wrap">
          <div class="skel skel-title" />
          <div class="skel skel-card" />
        </div>
      </template>

      <template v-else-if="loadFailed">
        <div class="not-found">
          <h1 class="page-title">Transaksi tidak ditemukan</h1>
          <p class="not-found-text">Data tidak tersedia atau Anda tidak memiliki akses.</p>
          <button type="button" class="btn-outline" @click="router.push('/expense-transactions')">Kembali</button>
        </div>
      </template>

      <template v-else>
        <header class="content-header">
          <h1 class="page-title">Ubah Transaksi Pengeluaran</h1>
          <p class="page-subtitle">Anda hanya dapat mengubah kategori, program, penerima dana, dan catatan.</p>
        </header>

        <form class="card" @submit.prevent="handleSubmit">
          <div class="grid">
            <div class="field">
              <label>Tanggal Transaksi</label>
              <input :value="transactionDate" type="text" class="input-disabled" disabled />
            </div>
            <div class="field">
              <label>Nominal</label>
              <input :value="`Rp ${amountDisplay}`" type="text" class="input-disabled" disabled />
            </div>
            <div class="field">
              <label>Metode Pembayaran</label>
              <input :value="paymentMethodDisplay" type="text" class="input-disabled" disabled />
            </div>
            <div class="field">
              <label>Bukti Transaksi</label>
              <input :value="proofFileName" type="text" class="input-disabled" disabled />
            </div>

            <div class="field">
              <label>Kategori <span class="required">*</span></label>
              <select
                v-model="category"
                :class="['input', { 'is-error': showError('category') }]"
                @change="onCategoryChange"
                @blur="markTouched('category')"
              >
                <option value="" disabled>Pilih Kategori</option>
                <option v-for="opt in EXPENSE_CATEGORY_FILTER_OPTIONS" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
              <p v-if="showError('category')" class="error">{{ showError('category') }}</p>
            </div>

            <div class="field">
              <label>Sub-kategori <span v-if="requiresSubCategory" class="required">*</span></label>
              <select
                v-model="subCategory"
                :class="['input', { 'is-error': showError('subCategory') }]"
                :disabled="!requiresSubCategory"
                @blur="markTouched('subCategory')"
                @change="markTouched('subCategory')"
              >
                <option value="" :disabled="requiresSubCategory">Pilih Sub-kategori</option>
                <option v-for="opt in subCategoryOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
              <p v-if="showError('subCategory')" class="error">{{ showError('subCategory') }}</p>
            </div>

            <div class="field">
              <label>Program <span class="required">*</span></label>
              <select
                v-model="program"
                :class="['input', { 'is-error': showError('program') }]"
                @blur="markTouched('program')"
                @change="markTouched('program')"
              >
                <option value="" disabled>Pilih Program</option>
                <option v-for="opt in programOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
              <p v-if="showError('program')" class="error">{{ showError('program') }}</p>
            </div>

            <div class="field">
              <label>Penerima Dana <span class="required">*</span></label>
              <input
                v-model="penerimaDana"
                type="text"
                placeholder="Masukkan penerima dana"
                :class="['input', { 'is-error': showError('penerimaDana') }]"
                @blur="markTouched('penerimaDana')"
              />
              <p v-if="showError('penerimaDana')" class="error">{{ showError('penerimaDana') }}</p>
            </div>
          </div>

          <div class="field field-note">
            <label>Catatan Tambahan</label>
            <textarea v-model="note" rows="4" class="input textarea" placeholder="Tambahkan catatan (opsional)" />
          </div>

          <p v-if="store.error" class="error-banner">{{ store.error }}</p>

          <div class="actions">
            <button type="button" class="btn-outline" :disabled="isSubmitting" @click="router.push(`/expense-transactions/${id}`)">
              Batal
            </button>
            <button type="submit" class="btn-primary" :disabled="isSubmitting || !isFormValid">
              {{ isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan' }}
            </button>
          </div>
        </form>
      </template>
    </main>
  </div>
</template>

<style scoped>
.layout { display: flex; min-height: 100vh; background: #f5f5f5; }
.content { flex: 1; padding: 40px 32px; overflow-y: auto; }
.content-header { max-width: 1100px; margin: 0 auto 20px; }
.page-title { margin: 0 0 4px; font-size: 32px; font-weight: 600; color: #171717; font-family: 'Poppins', sans-serif; }
.page-subtitle { margin: 0; color: #525252; font-size: 14px; }
.card { max-width: 1100px; margin: 0 auto; padding: 24px; border-radius: 12px; border: 1px solid #e5e5e5; background: #fff; }
.grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.field { display: flex; flex-direction: column; gap: 6px; }
label { font-size: 13px; font-weight: 600; color: #404040; }
.required { color: #ff303e; }
.input, .input-disabled {
  height: 42px;
  border-radius: 8px;
  border: 1px solid #d4d4d4;
  padding: 0 12px;
  font-size: 14px;
  color: #171717;
}
.input:focus { outline: none; border-color: #00c6ac; box-shadow: 0 0 0 1px #00c6ac; }
.input.is-error { border-color: #ff303e; }
.input-disabled { background: #f5f5f5; color: #737373; }
.textarea { height: auto; padding: 10px 12px; resize: vertical; }
.field-note { margin-top: 16px; }
.error { margin: 0; font-size: 12px; color: #ff303e; }
.error-banner { margin: 12px 0 0; color: #ff303e; font-size: 13px; }
.actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 20px; }
.btn-outline, .btn-primary {
  height: 42px; border-radius: 8px; padding: 0 18px; font-size: 14px; font-weight: 600; cursor: pointer;
}
.btn-outline { border: 1px solid #d4d4d4; background: #fff; color: #404040; }
.btn-primary { border: none; background: #00c6ac; color: #fff; }
.btn-primary:disabled, .btn-outline:disabled { opacity: .55; cursor: not-allowed; }
.not-found { max-width: 700px; margin: 80px auto; text-align: center; }
.not-found-text { color: #6b7280; margin: 8px 0 20px; }
.skeleton-wrap { max-width: 1100px; margin: 0 auto; }
.skel { border-radius: 8px; background: linear-gradient(90deg, #ececec 25%, #f5f5f5 50%, #ececec 75%); background-size: 200% 100%; animation: shimmer 1.4s infinite; }
.skel-title { height: 36px; width: 50%; margin-bottom: 16px; }
.skel-card { height: 360px; }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
</style>
