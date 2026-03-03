import { createRouter, createWebHistory } from "vue-router"
import { getCurrentUser } from "@/lib/auth"
import { isAdmin } from "@/lib/rbac"

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      name: "home",
      component: () => import("@/views/HomeView.vue"),
      meta: { requiresAuth: true },
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
  ],
})

router.beforeEach((to) => {
  const user = getCurrentUser()

  if (to.meta.requiresAuth && !user) {
    return "/auth/login"
  }

  if (to.meta.guestOnly && user) {
    return "/"
  }

  if (to.meta.requiresAdmin && !isAdmin()) {
    return "/"
  }

  return true
})

export default router