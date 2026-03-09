import { defineStore } from 'pinia'
import axios from 'axios'
import { toast } from 'vue-sonner'
import type { CommonResponseInterface } from '@/interfaces/common.response.interface'
import type {
  IncomeTransaction,
  IncomeTransactionListResponse,
} from '@/interfaces/income-transaction.interface'
import { getAuthToken, handleAuthError } from '@/lib/auth'
import router from '@/router'

const baseIncomeUrl = import.meta.env.VITE_API_URL + '/income-transactions'

export const useIncomeTransactionStore = defineStore('incomeTransaction', {
  state: () => ({
    loading: false,
    error: null as string | null,
    items: [] as IncomeTransaction[],
    currentItem: null as IncomeTransaction | null,
    page: 0,
    size: 10,
    totalElements: 0,
    totalPages: 0,
  }),

  actions: {
    async createIncomeTransaction(formData: FormData) {
      this.loading = true
      this.error = null

      const token = getAuthToken()

      try {
        const response = await axios.post<
          CommonResponseInterface<IncomeTransaction>
        >(baseIncomeUrl, formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        })

        toast.success(
          response.data.message || 'Transaksi pemasukan berhasil dibuat',
        )

        await router.push('/income-transactions')

        return response.data.data
      } catch (error) {
        if (axios.isAxiosError(error) && error.response) {
          await handleAuthError(error.response.status, router)
        }

        const message =
          (axios.isAxiosError(error) && error.response?.data?.message) ||
          (error instanceof Error ? error.message : 'Unknown error')

        this.error = message
        toast.error(message)

        throw error
      } finally {
        this.loading = false
      }
    },

    async fetchIncomeTransactions(params: {
      startDate?: string
      endDate?: string
      category?: string
      paymentMethod?: string
      sourceType?: string
      page?: number
      size?: number
      search?: string
    }) {
      this.loading = true
      this.error = null

      const token = getAuthToken()

      try {
        const response = await axios.get<
          CommonResponseInterface<IncomeTransactionListResponse>
        >(baseIncomeUrl, {
          params,
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        const data = response.data.data
        this.items = data.content
        this.page = data.page
        this.size = data.size
        this.totalElements = data.totalElements
        this.totalPages = data.totalPages

        return data
      } catch (error) {
        if (axios.isAxiosError(error) && error.response) {
          await handleAuthError(error.response.status, router)
        }

        const message =
          (axios.isAxiosError(error) && error.response?.data?.message) ||
          (error instanceof Error ? error.message : 'Unknown error')

        this.error = message
        toast.error(message)

        throw error
      } finally {
        this.loading = false
      }
    },

    async fetchIncomeTransactionById(id: string) {
      this.loading = true
      this.error = null
      this.currentItem = null

      const token = getAuthToken()

      try {
        const response = await axios.get<CommonResponseInterface<IncomeTransaction>>(
          `${baseIncomeUrl}/${id}`,
          { headers: { Authorization: `Bearer ${token}` } },
        )
        this.currentItem = response.data.data
        return response.data.data
      } catch (error) {
        if (axios.isAxiosError(error) && error.response) {
          await handleAuthError(error.response.status, router)
        }

        const message =
          (axios.isAxiosError(error) && error.response?.data?.message) ||
          (error instanceof Error ? error.message : 'Unknown error')

        this.error = message
        throw error
      } finally {
        this.loading = false
      }
    },

    async deleteIncomeTransaction(id: string) {
      this.loading = true
      this.error = null

      const token = getAuthToken()

      try {
        const response = await axios.delete<CommonResponseInterface<null>>(
          `${baseIncomeUrl}/${id}`,
          { headers: { Authorization: `Bearer ${token}` } },
        )
        toast.success(response.data.message || 'Transaksi berhasil dihapus')
        return true
      } catch (error) {
        if (axios.isAxiosError(error) && error.response) {
          await handleAuthError(error.response.status, router)
        }

        const message =
          (axios.isAxiosError(error) && error.response?.data?.message) ||
          (error instanceof Error ? error.message : 'Unknown error')

        this.error = message
        toast.error(message)
        throw error
      } finally {
        this.loading = false
      }
    },
  },
})

