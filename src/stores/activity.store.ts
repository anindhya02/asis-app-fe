import { defineStore } from 'pinia'
import axios from 'axios'
import { toast } from 'vue-sonner'
import type { CommonResponseInterface } from '@/interfaces/common.response.interface'
import type {
  ActivityResponse,
  AttachmentResponse,
  CreateActivityRequest,
  UpdateActivityRequest,
} from '@/interfaces/activity.interface'
import { getAuthToken, handleAuthError } from '@/lib/auth'
import router from '@/router'

const baseUrl = import.meta.env.VITE_API_URL + '/activities'

export const useActivityStore = defineStore('activity', {
  state: () => ({
    loading: false,
    error: null as string | null,
    items: [] as ActivityResponse[],
    current: null as ActivityResponse | null,
    attachments: [] as AttachmentResponse[],
  }),

  actions: {
    async fetchActivities() {
      this.loading = true
      this.error = null

      const token = getAuthToken()

      try {
        const response = await axios.get<
          CommonResponseInterface<ActivityResponse[]>
        >(baseUrl, {
          headers: { Authorization: `Bearer ${token}` },
        })

        this.items = response.data.data
        return this.items
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

    async fetchActivityById(id: string) {
      this.loading = true
      this.error = null

      const token = getAuthToken()

      try {
        const response = await axios.get<
          CommonResponseInterface<ActivityResponse>
        >(`${baseUrl}/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        })

        this.current = response.data.data
        return this.current
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

    async createActivity(payload: CreateActivityRequest) {
      this.loading = true
      this.error = null

      const token = getAuthToken()

      try {
        const response = await axios.post<
          CommonResponseInterface<ActivityResponse>
        >(baseUrl, payload, {
          headers: { Authorization: `Bearer ${token}` },
        })

        toast.success(
          response.data.message || 'Postingan kegiatan berhasil dibuat',
        )

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

    async updateActivity(id: string, payload: UpdateActivityRequest) {
      this.loading = true
      this.error = null

      const token = getAuthToken()

      try {
        const response = await axios.put<
          CommonResponseInterface<ActivityResponse>
        >(`${baseUrl}/${id}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        })

        toast.success(
          response.data.message || 'Postingan kegiatan berhasil diperbarui',
        )

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

    async deleteActivity(id: string) {
      this.error = null

      const token = getAuthToken()

      try {
        const response = await axios.put<CommonResponseInterface<void>>(
          `${baseUrl}/${id}/delete`,
          {},
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        )

        this.items = this.items.filter((i) => i.id !== id)
        toast.success(
          response.data.message || 'Postingan kegiatan berhasil dihapus',
        )
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
      }
    },

    async fetchAttachments(activityId: string) {
      const token = getAuthToken()

      try {
        const response = await axios.get<
          CommonResponseInterface<AttachmentResponse[]>
        >(`${baseUrl}/${activityId}/attachments`, {
          headers: { Authorization: `Bearer ${token}` },
        })

        this.attachments = response.data.data
        return this.attachments
      } catch (error) {
        if (axios.isAxiosError(error) && error.response) {
          await handleAuthError(error.response.status, router)
        }

        const message =
          (axios.isAxiosError(error) && error.response?.data?.message) ||
          (error instanceof Error ? error.message : 'Unknown error')

        toast.error(message)
        throw error
      }
    },

    async uploadAttachments(activityId: string, files: File[]) {
      const token = getAuthToken()

      const formData = new FormData()
      files.forEach((file) => formData.append('files', file))

      try {
        const response = await axios.post<
          CommonResponseInterface<AttachmentResponse[]>
        >(`${baseUrl}/${activityId}/attachments`, formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        })

        return response.data.data
      } catch (error) {
        if (axios.isAxiosError(error) && error.response) {
          await handleAuthError(error.response.status, router)
        }

        const message =
          (axios.isAxiosError(error) && error.response?.data?.message) ||
          (error instanceof Error ? error.message : 'Unknown error')

        toast.error(message)
        throw error
      }
    },

    async deleteAttachment(activityId: string, attachmentId: string) {
      const token = getAuthToken()

      try {
        await axios.delete(
          `${baseUrl}/${activityId}/attachments/${attachmentId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        )
      } catch (error) {
        if (axios.isAxiosError(error) && error.response) {
          await handleAuthError(error.response.status, router)
        }

        const message =
          (axios.isAxiosError(error) && error.response?.data?.message) ||
          (error instanceof Error ? error.message : 'Unknown error')

        toast.error(message)
        throw error
      }
    },
  },
})
