<script setup lang="ts">
defineProps<{
  title: string;
  visible: boolean;
}>();

const emit = defineEmits<{
  close: [];
  confirm: [];
}>();
</script>

<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      @click.self="emit('close')"
    >
      <div class="bg-white rounded-xl p-5 min-w-[320px] max-w-[90%] shadow-2xl">
        <h3 class="text-lg font-semibold text-gray-800 mb-4">{{ title }}</h3>

        <div class="mb-5">
          <slot></slot>
        </div>

        <div class="flex justify-end gap-2">
          <button
            class="px-4 py-2 bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 transition text-sm"
            @click="emit('close')"
          >
            取消
          </button>
          <button
            class="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition text-sm"
            @click="emit('confirm')"
          >
            确定
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
