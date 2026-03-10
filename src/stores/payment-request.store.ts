import { defineStore } from 'pinia'
import axios from 'axios'
import { toast } from 'vue-sonner'
import type { CommonResponseInterface } from '@/interfaces/common.response.interface'
import type {
  PaymentRequest,
  PaymentRequestListResponse,
} from '@/interfaces/payment-request.interface'
import { getAuthToken, handleAuthError } from '@/lib/auth'
import router from '@/router'

const baseUrl = import.meta.env.VITE_API_URL + '/payment-requests'

export const usePaymentRequestStore = defineStore('paymentRequest', {
  state: () => ({
    loading: false,
    error: null as string | null,
    items: [] as PaymentRequest[],
    page: 0,
    size: 10,
    totalElements: 0,
    totalPages: 0,
  }),

  actions: {
    async createPaymentRequest(formData: FormData) {
      this.loading = true
      this.error = null

      const token = getAuthToken()

      try {
        const response = await axios.post<
          CommonResponseInterface<PaymentRequest>
        >(baseUrl, formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        })

        toast.success(
          response.data.message || 'Pengajuan dana berhasil dibuat',
        )

        await router.push('/payment-requests')

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

    async fetchPaymentRequests(params: {
      startDate?: string
      endDate?: string
      status?: string
      expenseCategory?: string
      search?: string
      page?: number
      size?: number
    }) {
      this.loading = true
      this.error = null

      const token = getAuthToken()

      try {
        const response = await axios.get<
          CommonResponseInterface<PaymentRequestListResponse>
        >(baseUrl, {
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
