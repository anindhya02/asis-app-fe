import { defineStore } from 'pinia'
import axios from 'axios'
import { toast } from 'vue-sonner'
import type { CommonResponseInterface } from '@/interfaces/common.response.interface'
import type {
  InventoryItem,
  InventoryItemListResponse,
} from '@/interfaces/inventory.interface'
import { getAuthToken, handleAuthError } from '@/lib/auth'
import router from '@/router'

const baseInventoryUrl = import.meta.env.VITE_API_URL + '/inventory'

export const useInventoryStore = defineStore('inventory', {
  state: () => ({
    loading: false,
    error: null as string | null,
    items: [] as InventoryItemListResponse['content'],
    page: 0,
    limit: 10,
    totalElements: 0,
    totalPages: 0,
    currentItem: null as InventoryItem | null,
  }),

  actions: {
    async createInventoryItem(formData: FormData) {
      this.loading = true
      this.error = null

      const token = getAuthToken()

      try {
        const response = await axios.post<
          CommonResponseInterface<InventoryItem>
        >(baseInventoryUrl, formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        })

        toast.success('Item inventory berhasil ditambahkan')
        await router.push('/inventory')

        return response.data.data
      } catch (error) {
        if (axios.isAxiosError(error) && error.response) {
          await handleAuthError(error.response.status, router, error.response.data?.message)
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

    async fetchInventoryItems(params: {
      search?: string
      page?: number
      limit?: number
    }) {
      this.loading = true
      this.error = null

      const token = getAuthToken()

      try {
        const response = await axios.get<
          CommonResponseInterface<InventoryItemListResponse>
        >(baseInventoryUrl, {
          params,
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        const data = response.data.data
        this.items = data.content
        this.page = data.page
        this.limit = data.limit
        this.totalElements = data.totalElements
        this.totalPages = data.totalPages

        return data
      } catch (error) {
        if (axios.isAxiosError(error) && error.response) {
          await handleAuthError(error.response.status, router, error.response.data?.message)
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

    async fetchInventoryItemById(id: string) {
      this.loading = true
      this.error = null
      this.currentItem = null

      const token = getAuthToken()

      try {
        const response = await axios.get<
          CommonResponseInterface<InventoryItem>
        >(`${baseInventoryUrl}/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        this.currentItem = response.data.data
        return response.data.data
      } catch (error) {
        if (axios.isAxiosError(error) && error.response) {
          await handleAuthError(error.response.status, router, error.response.data?.message)
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

