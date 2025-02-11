<template>
  <div>
    <NuxtPage />
  </div>
</template>

<script setup>
import { useNuxtApp } from '#app'

const { $firebase } = useNuxtApp()
</script>
