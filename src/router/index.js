import { createRouter, createWebHistory } from 'vue-router'
import BuilderView from '../views/BuilderView.vue'
import AboutView from '../views/AboutView.vue'
import DocsView from '../views/DocsView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'builder',
      component: BuilderView
    },
    {
      path: '/about',
      name: 'about',
      component: AboutView
    },
    {
      path: '/docs',
      name: 'docs',
      component: DocsView
    }
  ]
})

export default router
