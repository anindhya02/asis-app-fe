<script setup lang="ts">
import { RouterView } from 'vue-router'
import { Toaster } from 'vue-sonner'
</script>

<template>
  <Toaster richColors position="top-right" />
  <RouterView />
</template>

<style>
  body {
    margin: 0;
  }
</style>
