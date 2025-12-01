<script setup lang="ts">
defineProps<{
  message: string;
  visible: boolean;
}>();
</script>

<template>
  <Transition
    enter-active-class="transition-opacity duration-300"
    leave-active-class="transition-opacity duration-300"
    enter-from-class="opacity-0"
    leave-to-class="opacity-0"
  >
    <div
      v-if="visible"
      class="fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-md shadow-lg text-sm z-50"
    >
      {{ message }}
    </div>
  </Transition>
</template>
