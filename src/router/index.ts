import { createRouter, createWebHistory } from "vue-router"
import { getCurrentUser } from "@/lib/auth"
import { isAdmin, isKetua, isPengurus, canViewFinancialReport, canViewOperationalDashboard } from "@/lib/rbac"

function getHomeRouteByRole(role?: string | null) {
  const r = (role || "").toUpperCase()

  if (r === "ADMIN") return "/users"
  if (r === "PENGURUS") return "/income-transactions"
  if (r === "KETUA YAYASAN") return "/payment-requests"
  if (r === "DONATUR") return "/activities"

  return "/payment-requests"
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      name: "landing",
      component: () => import("@/views/landing/LandingPage.vue"),
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
      meta: { requiresAuth: true, requiresPengurus: true },
    },
    {
      path: "/income-transactions",
      name: "income-transaction-list",
      component: () => import("@/views/income/IncomeTransactionList.vue"),
      meta: { requiresAuth: true, requiresIncomeAccess: true },
    },
    {
      path: "/payment-requests/create",
      name: "payment-request-create",
      component: () => import("@/views/ticket/PaymentRequestCreate.vue"),
      meta: { requiresAuth: true, requiresPengurus: true },
    },
    {
      path: "/payment-requests",
      name: "payment-request-list",
      component: () => import("@/views/ticket/PaymentRequestList.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/pengajuandana",
      name: "payment-request-list-alias",
      component: () => import("@/views/ticket/PaymentRequestList.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/payment-requests/:id/edit",
      name: "payment-request-edit",
      component: () => import("@/views/ticket/PaymentRequestCreate.vue"),
      meta: { requiresAuth: true, requiresPengurus: true },
    },
    {
      path: "/payment-requests/:id",
      name: "payment-request-detail",
      component: () => import("@/views/ticket/PaymentRequestDetail.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/payment-requests-review/:id",
      name: "payment-request-review-detail",
      component: () => import("@/views/ticket/PaymentRequestDetail.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/income-transactions/:id/edit",
      name: "income-transaction-edit",
      component: () => import("@/views/income/IncomeTransactionEdit.vue"),
      meta: { requiresAuth: true, requiresIncomeAccess: true },
    },
    {
      path: "/income-transactions/:id",
      name: "income-transaction-detail",
      component: () => import("@/views/income/IncomeTransactionDetail.vue"),
      meta: { requiresAuth: true, requiresIncomeAccess: true },
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
      path: "/expense-transactions/:id/edit",
      name: "expense-transaction-edit",
      component: () => import("@/views/expense/ExpenseTransactionEdit.vue"),
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
      component: () => import("@/views/activity/ActivityList.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/activities/create",
      name: "activity-create",
      component: () => import("@/views/activity/ActivityForm.vue"),
      meta: { requiresAuth: true, requiresActivityWrite: true },
    },
    {
      path: "/activities/:id",
      name: "activity-detail",
      component: () => import("@/views/activity/ActivityDetail.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/activities/:id/edit",
      name: "activity-edit",
      component: () => import("@/views/activity/ActivityForm.vue"),
      meta: { requiresAuth: true, requiresActivityWrite: true },
    },
    {
      path: "/financial-report",
      name: "financial-report",
      component: () => import("@/views/mis/FinancialReportPage.vue"),
      meta: { requiresAuth: true, requiresFinancialReport: true },
    },
    {
      path: "/operational-dashboard",
      name: "operational-dashboard",
      component: () => import("@/views/mis/OperationalDashboardPage.vue"),
      meta: { requiresAuth: true, requiresOperationalDashboard: true },
    },
    {
      path: "/executive-financial",
      name: "executive-financial-dashboard",
      component: () => import("@/views/eis/ExecutiveFinancialDashboardPage.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/inventory",
      name: "inventory-list",
      component: () => import("@/views/inventory/InventoryList.vue"),
      meta: { requiresAuth: true, requiresInventoryAccess: true },
    },
    {
      path: "/inventory/create",
      name: "inventory-create",
      component: () => import("@/views/inventory/InventoryCreate.vue"),
      meta: { requiresAuth: true, requiresInventoryAccess: true },
    },
    {
      path: "/inventory/:id",
      name: "inventory-detail",
      component: () => import("@/views/inventory/InventoryDetail.vue"),
      meta: { requiresAuth: true, requiresInventoryAccess: true },
    },
    {
      path: "/inventory/:id/usage",
      name: "inventory-usage",
      component: () => import("@/views/inventory/InventoryUsage.vue"),
      meta: { requiresAuth: true, requiresInventoryAccess: true },
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

  if (to.meta.requiresPengurus && !isPengurus()) {
    return getHomeRouteByRole(user?.role)
  }

  if (to.meta.requiresIncomeAccess && !(isPengurus() || isKetua())) {
    return getHomeRouteByRole(user?.role)
  }

  if (to.meta.requiresFinancialReport && !canViewFinancialReport()) {
    return getHomeRouteByRole(user?.role)
  }

  if (to.meta.requiresOperationalDashboard && !canViewOperationalDashboard()) {
    return getHomeRouteByRole(user?.role)
  }

  if (to.meta.requiresInventoryAccess && !(isPengurus() || isKetua())) {
    return getHomeRouteByRole(user?.role)
  }

  if (to.meta.requiresActivityWrite && !(isPengurus() || isAdmin())) {
    return getHomeRouteByRole(user?.role)
  }

  return true
})

export default router