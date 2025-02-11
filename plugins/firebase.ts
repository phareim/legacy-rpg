import { mockFirebase } from '~/utils/mock-firebase'

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.provide('firebase', mockFirebase)
}) 