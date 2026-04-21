import type { User, CreateUserRequest, UpdateUserRequest } from '@/interfaces/user.interface';
import { defineStore } from 'pinia'
import axios from "axios";
import { toast } from 'vue-sonner';
import type { CommonResponseInterface } from '@/interfaces/common.response.interface';
import { handleAuthError, getAuthToken } from '@/lib/auth';
import router from '@/router';

const baseUserUrl = import.meta.env.VITE_API_URL + '/users';

export const useUserStore = defineStore('user', {
  state: () => ({
    users: [] as User[],
    loading: false,
    error: null as null | string,
    selectedUser: null as User | null,
  }),

  actions: {
    async fetchUsers() {
      this.loading = true;
      this.error = null;

      const token = getAuthToken()

      try {
        const response = await axios.get<CommonResponseInterface<User[]>>(baseUserUrl, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        this.users = response.data.data;

        if (this.users.length === 0) {
          toast.warning('Data user kosong')
        } else {
          toast.success('Data user berhasil dimuat')
        }

        return this.users;

      } catch (error) {
        if (axios.isAxiosError(error) && error.response){
          await handleAuthError(error.response.status, router);
        }

        this.error = error instanceof Error ? error.message : 'Unknown error';
        toast.error(`Error saat memuat user: ${this.error}`);
      } finally {
        this.loading = false;
      }
    },

    async fetchUserById(userId: string) {
        this.loading = true;
        this.error = null;

        const token = getAuthToken()

        try {
            const response = await axios.get<CommonResponseInterface<User>>(
            `${baseUserUrl}/${userId}`,
            {
                headers: {
                Authorization: `Bearer ${token}`
                }
            }
            );

            this.selectedUser = response.data.data;

            toast.success('Detail user berhasil dimuat');
            return this.selectedUser;

        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
            await handleAuthError(error.response.status, router);
            }

            this.error = error instanceof Error ? error.message : 'Unknown error';
            toast.error(`Error saat memuat detail user: ${this.error}`);
        } finally {
            this.loading = false;
        }
    },


    async createUser(userData: CreateUserRequest) {
      this.loading = true;
      this.error = null;

      const token = getAuthToken()

      try {
        const response = await axios.post<CommonResponseInterface<User>>(
          `${baseUserUrl}/create`,
          userData,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );

        this.users.push(response.data.data);
        toast.success('User berhasil dibuat')

        return response.data.data;

      } catch (error) {
        if (axios.isAxiosError(error) && error.response) {

            // hanya handle auth jika 401 / 403
            if (error.response.status === 401 || error.response.status === 403) {
            await handleAuthError(error.response.status, router);
            }

        }

        this.error = error instanceof Error ? error.message : 'Unknown error';

        // optional: kalau pakai popup jangan pakai toast
        // toast.error(`Error saat membuat user: ${this.error}`);

        throw error
      } finally {
        this.loading = false;
      }
    },

    async updateUser(userId: string, userData: UpdateUserRequest) {
      this.loading = true;
      this.error = null;
      const token = getAuthToken();

      try {
        const response = await axios.put<CommonResponseInterface<User>>(
          `${baseUserUrl}/${userId}`,
          userData,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );

        const updatedUser = response.data.data;
        this.users = this.users.map((user) => user.userId === userId ? updatedUser : user);
        toast.success('User berhasil diperbarui');
        return updatedUser;
      } catch (error) {
        if (axios.isAxiosError(error) && error.response) {
          if (error.response.status === 401 || error.response.status === 403) {
            await handleAuthError(error.response.status, router);
          }
        }

        this.error = error instanceof Error ? error.message : 'Unknown error';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async deactivateUser(userId: string) {
      this.loading = true;
      this.error = null;
      const token = getAuthToken();

      try {
        const response = await axios.delete<CommonResponseInterface<User | null>>(
          `${baseUserUrl}/${userId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );

        const updatedUser = response.data.data;
        if (updatedUser) {
          this.users = this.users.map((user) => user.userId === userId ? updatedUser : user);
        } else {
          this.users = this.users.map((user) =>
            user.userId === userId ? { ...user, status: 'INACTIVE' } : user
          );
        }

        toast.success(response.data.message || 'Akun berhasil dinonaktifkan');
        return updatedUser;
      } catch (error) {
        if (axios.isAxiosError(error) && error.response) {
          if (error.response.status === 401) {
            toast.error(error.response.data?.message || 'Sesi login tidak valid. Coba login ulang.');
          } else if (error.response.status === 403) {
            await handleAuthError(error.response.status, router, error.response.data?.message);
          } else if (error.response.status === 404) {
            toast.error(error.response.data?.message || 'Akun tidak ditemukan');
          } else {
            toast.error(error.response.data?.message || 'Gagal menonaktifkan akun');
          }
        } else {
          toast.error('Gagal menonaktifkan akun');
        }

        this.error = error instanceof Error ? error.message : 'Unknown error';
        throw error;
      } finally {
        this.loading = false;
      }
    }
  }
});