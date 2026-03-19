import { createRouter, createWebHashHistory } from 'vue-router'
import { useConnectionStore } from '../stores/connection'
import ConnectView from '../views/ConnectView.vue'
import DashboardView from '../views/DashboardView.vue'

const routes = [
  {
    path: '/',
    name: 'connect',
    component: ConnectView,
  },
  {
    path: '/dashboard',
    name: 'dashboard',
    component: DashboardView,
    meta: { requiresConnection: true },
  },
  // Catch-all: redirect to connect
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

const router = createRouter({
  // Use hash history so GitHub Pages works without server rewrite rules
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes,
})

// Navigation guard: redirect to connect if not connected
router.beforeEach((to) => {
  if (to.meta.requiresConnection) {
    const conn = useConnectionStore()
    if (!conn.isConnected) return { name: 'connect' }
  }
})

export default router
