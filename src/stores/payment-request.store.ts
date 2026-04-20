import { defineStore } from 'pinia'
import axios from 'axios'
import { toast } from 'vue-sonner'
import type { CommonResponseInterface } from '@/interfaces/common.response.interface'
import type {
  PaymentRequest,
  PaymentRequestDetail,
  PaymentRequestListResponse,
} from '@/interfaces/payment-request.interface'
import { getAuthToken, handleAuthError } from '@/lib/auth'
import router from '@/router'

const baseUrl = import.meta.env.VITE_API_URL + '/payment-requests'
const reviewBaseUrl = import.meta.env.VITE_API_URL + '/payment-requests-review'

export type PaymentRequestDetailLoadError = 'not_found' | 'forbidden' | null

export const usePaymentRequestStore = defineStore('paymentRequest', {
  state: () => ({
    loading: false,
    error: null as string | null,
    items: [] as PaymentRequest[],
    page: 0,
    size: 10,
    totalElements: 0,
    totalPages: 0,
    currentDetail: null as PaymentRequestDetail | null,
    detailLoadError: null as PaymentRequestDetailLoadError,
  }),

  actions: {
    async approvePaymentRequest(id: string, reviewNote?: string): Promise<boolean> {
      return this.submitReviewAction(id, 'approve', reviewNote)
    },

    async rejectPaymentRequest(id: string, reviewNote: string): Promise<boolean> {
      return this.submitReviewAction(id, 'reject', reviewNote)
    },

    async requestPaymentRequestRevision(id: string, reviewNote: string): Promise<boolean> {
      return this.submitReviewAction(id, 'request-revision', reviewNote)
    },

    async submitReviewAction(
      id: string,
      action: 'approve' | 'reject' | 'request-revision',
      reviewNote?: string,
    ): Promise<boolean> {
      this.error = null
      const token = getAuthToken()

      try {
        const payload: { reviewNote?: string } = {}
        if (typeof reviewNote === 'string') payload.reviewNote = reviewNote

        const response = await axios.patch<
          CommonResponseInterface<PaymentRequestDetail>
        >(`${reviewBaseUrl}/${id}/${action}`, payload, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        this.currentDetail = response.data.data
        return true
      } catch (error) {
        if (axios.isAxiosError(error) && error.response) {
          const status = error.response.status
          const msg =
            (error.response.data as CommonResponseInterface<PaymentRequestDetail>)?.message ||
            (error instanceof Error ? error.message : '')

          if (status === 401) {
            await handleAuthError(status, router)
          } else if (status === 404) {
            this.detailLoadError = 'not_found'
            toast.error(msg || 'Ticket tidak ditemukan')
          } else if (status === 403) {
            this.detailLoadError = 'forbidden'
            toast.error(msg || 'Anda tidak memiliki akses')
          } else if (status === 409) {
            toast.error(msg || 'Ticket sudah diproses / status tidak valid')
          } else if (status === 400) {
            toast.error(msg || 'Data review tidak valid')
          } else {
            toast.error(msg || 'Gagal memproses review ticket')
          }
        } else {
          toast.error('Gagal memproses review ticket')
        }

        return false
      }
    },

    async updatePaymentRequest(id: string, formData: FormData) {
      this.loading = true
      this.error = null

      const token = getAuthToken()

      try {
        const response = await axios.patch<
          CommonResponseInterface<PaymentRequest>
        >(`${baseUrl}/${id}`, formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        })

        toast.success(
          response.data.message || 'Ticket berhasil diperbarui',
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

    async fetchPaymentRequestById(id: string) {
      this.loading = true
      this.error = null
      this.currentDetail = null
      this.detailLoadError = null

      const token = getAuthToken()

      try {
        const response = await axios.get<
          CommonResponseInterface<PaymentRequestDetail>
        >(`${baseUrl}/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        this.currentDetail = response.data.data
        return response.data.data
      } catch (error) {
        if (axios.isAxiosError(error) && error.response) {
          const status = error.response.status
          if (status === 401) {
            await handleAuthError(status, router)
          } else if (status === 403) {
            this.detailLoadError = 'forbidden'
          } else if (status === 404) {
            this.detailLoadError = 'not_found'
          } else {
            this.detailLoadError = 'not_found'
          }
        } else {
          this.detailLoadError = 'not_found'
        }

        throw error
      } finally {
        this.loading = false
      }
    },

    async fetchPaymentRequestReviewById(id: string) {
      this.loading = true
      this.error = null
      this.currentDetail = null
      this.detailLoadError = null

      const token = getAuthToken()

      try {
        const response = await axios.get<
          CommonResponseInterface<PaymentRequestDetail>
        >(`${reviewBaseUrl}/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        this.currentDetail = response.data.data
        return response.data.data
      } catch (error) {
        if (axios.isAxiosError(error) && error.response) {
          const status = error.response.status
          if (status === 401) {
            await handleAuthError(status, router)
          } else if (status === 403) {
            this.detailLoadError = 'forbidden'
          } else if (status === 404) {
            this.detailLoadError = 'not_found'
          } else {
            this.detailLoadError = 'not_found'
          }
        } else {
          this.detailLoadError = 'not_found'
        }

        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * Owner-only cancel (DRAFT / PENDING_REVIEW). Returns true on success (caller handles navigation / refresh).
     */
    async cancelPaymentRequest(id: string): Promise<boolean> {
      this.error = null
      const token = getAuthToken()

      try {
        const response = await axios.delete<CommonResponseInterface<null>>(
          `${baseUrl}/${id}`,
          { headers: { Authorization: `Bearer ${token}` } },
        )

        toast.success(response.data.message || 'Ticket berhasil dibatalkan')
        return true
      } catch (error) {
        if (axios.isAxiosError(error) && error.response) {
          const status = error.response.status
          const msg =
            (error.response.data as CommonResponseInterface<null>)?.message ||
            (error instanceof Error ? error.message : '')

          if (status === 401) {
            await handleAuthError(status, router)
          } else if (status === 403) {
            toast.error(msg || 'Anda tidak memiliki akses untuk membatalkan ticket ini.')
          } else if (status === 404) {
            toast.error(msg || 'Ticket tidak ditemukan.')
          } else if (status === 409) {
            toast.error(msg || 'Ticket tidak dapat dibatalkan karena sudah diproses')
          } else {
            toast.error(msg || 'Gagal membatalkan ticket.')
          }
        } else {
          toast.error('Gagal membatalkan ticket.')
        }

        return false
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
