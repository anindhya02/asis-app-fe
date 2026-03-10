import { defineStore } from 'pinia'
import axios from 'axios'
import { toast } from 'vue-sonner'
import type { CommonResponseInterface } from '@/interfaces/common.response.interface'
import type {
  ExpenseTransaction,
  ExpenseTransactionListResponse,
} from '@/interfaces/expense-transaction.interface'
import { getAuthToken, handleAuthError } from '@/lib/auth'
import router from '@/router'

const baseExpenseUrl = import.meta.env.VITE_API_URL + '/expense-transactions'

export const useExpenseTransactionStore = defineStore('expenseTransaction', {
  state: () => ({
    loading: false,
    error: null as string | null,
    currentItem: null as ExpenseTransaction | null,
    items: [] as ExpenseTransaction[],
    page: 0,
    size: 10,
    totalElements: 0,
    totalPages: 0,
  }),

  actions: {
    async createExpenseTransaction(formData: FormData) {
      this.loading = true
      this.error = null

      const token = getAuthToken()

      try {
        const response = await axios.post<
          CommonResponseInterface<ExpenseTransaction>
        >(baseExpenseUrl, formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        })

        toast.success(
          response.data.message || 'Transaksi pengeluaran berhasil dibuat',
        )

        await router.push('/expense-transactions')

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

    async fetchExpenseTransactionById(id: string) {
      this.loading = true
      this.error = null
      this.currentItem = null

      const token = getAuthToken()

      try {
        const response = await axios.get<
          CommonResponseInterface<ExpenseTransaction>
        >(`${baseExpenseUrl}/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

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

    async fetchExpenseTransactions(params: {
      startDate?: string
      endDate?: string
      category?: string
      program?: string
      paymentMethod?: string
      search?: string
      page?: number
      size?: number
    }) {
      this.loading = true
      this.error = null

      const token = getAuthToken()

      try {
        const response = await axios.get<
          CommonResponseInterface<ExpenseTransactionListResponse>
        >(baseExpenseUrl, {
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
  },
})
