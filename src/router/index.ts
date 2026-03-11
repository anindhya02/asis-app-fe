import { createRouter, createWebHistory } from "vue-router"
import { getCurrentUser } from "@/lib/auth"
import { isAdmin } from "@/lib/rbac"

function getHomeRouteByRole(role?: string | null) {
  const r = (role || "").toUpperCase()

  if (r === "ADMIN") return "/users"
  if (r === "PENGURUS") return "/income-transactions"
  if (r === "KETUA YAYASAN") return "/payment-requests"

  return "/payment-requests"
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
      component: () => import("@/views/auth/LoginPage.vue"),
      meta: { guestOnly: true },
    },
    {
      path: "/users",
      name: "list-user",
      component: () => import("@/views/admin/ListUser.vue"),
      meta: { requiresAuth: true, requiresAdmin: true },
    },
    {
      path: "/users/create",
      name: "create-user",
      component: () => import("@/views/admin/CreateUser.vue"),
      meta: { requiresAuth: true, requiresAdmin: true },
    },
    {
      path: "/users/:id",
      name: "view-user",
      component: () => import("@/views/admin/ViewUser.vue"),
      meta: { requiresAuth: true, requiresAdmin: true },
    },
    {
      path: "/income-transactions/create",
      name: "income-transaction-create",
      component: () => import("@/views/income/IncomeTransactionCreate.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/income-transactions",
      name: "income-transaction-list",
      component: () => import("@/views/income/IncomeTransactionList.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/payment-requests/create",
      name: "payment-request-create",
      component: () => import("@/views/ticket/PaymentRequestCreate.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/payment-requests",
      name: "payment-request-list",
      component: () => import("@/views/ticket/PaymentRequestList.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/income-transactions/:id",
      name: "income-transaction-detail",
      component: () => import("@/views/income/IncomeTransactionDetail.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/expense-transactions/create",
      name: "expense-transaction-create",
      component: () => import("@/views/expense/ExpenseTransactionCreate.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/expense-transactions/:id",
      name: "expense-transaction-detail",
      component: () => import("@/views/expense/ExpenseTransactionDetail.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/expense-transactions",
      name: "expense-transaction-list",
      component: () => import("@/views/expense/ExpenseTransactionList.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/activities",
      name: "activity-list",
      component: () => import("@/views/ActivityList.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/activities/create",
      name: "activity-create",
      component: () => import("@/views/ActivityForm.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/activities/:id",
      name: "activity-detail",
      component: () => import("@/views/ActivityDetail.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/activities/:id/edit",
      name: "activity-edit",
      component: () => import("@/views/ActivityForm.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/activities",
      name: "activity-list",
      component: () => import("@/views/ActivityList.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/activities/create",
      name: "activity-create",
      component: () => import("@/views/ActivityForm.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/activities/:id",
      name: "activity-detail",
      component: () => import("@/views/ActivityDetail.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/activities/:id/edit",
      name: "activity-edit",
      component: () => import("@/views/ActivityForm.vue"),
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