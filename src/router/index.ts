import { createRouter, createWebHistory } from "vue-router"
import { getCurrentUser } from "@/lib/auth"
import { isAdmin } from "@/lib/rbac"

function getHomeRouteByRole(role?: string | null) {
  const r = (role || "").toUpperCase()

  if (r === "ADMIN") return "/users"
  if (r === "PENGURUS") return "/income-transactions"

  return "/income-transactions"
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      redirect: () => {
        const user = getCurrentUser()
        if (!user) return "/auth/login"
        return getHomeRouteByRole(user.role)
      },
    },
    {
      path: "/auth/login",
      name: "login",
      component: () => import("@/views/LoginPage.vue"),
      meta: { guestOnly: true },
    },
    {
      path: "/users",
      name: "list-user",
      component: () => import("@/views/ListUser.vue"),
      meta: { requiresAuth: true, requiresAdmin: true },
    },
    {
      path: "/users/create",
      name: "create-user",
      component: () => import("@/views/CreateUser.vue"),
      meta: { requiresAuth: true, requiresAdmin: true },
    },
    {
      path: "/users/:id",
      name: "view-user",
      component: () => import("@/views/ViewUser.vue"),
      meta: { requiresAuth: true, requiresAdmin: true },
    },
    {
      path: "/income-transactions/create",
      name: "income-transaction-create",
      component: () => import("@/views/IncomeTransactionCreate.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/income-transactions",
      name: "income-transaction-list",
      component: () => import("@/views/IncomeTransactionList.vue"),
      meta: { requiresAuth: true },
    },
  ],
})

router.beforeEach((to) => {
  const user = getCurrentUser()

  if (to.meta.requiresAuth && !user) {
    return "/auth/login"
  }

  if (to.meta.guestOnly && user) {
    return getHomeRouteByRole(user.role)
  }

  if (to.meta.requiresAdmin && !isAdmin()) {
    return getHomeRouteByRole(user?.role)
  }

  return true
})

export default router