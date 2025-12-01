<script setup lang="ts">
defineProps<{
  entityName: string;
}>();

const emit = defineEmits<{
  create: [];
  createFolder: [];
  expandAll: [];
  collapseAll: [];
}>();
</script>

<template>
  <div class="flex flex-wrap gap-1.5 p-2 border-b border-gray-200">
    <button
      class="px-3 py-1.5 bg-blue-500 text-white rounded-md text-sm hover:bg-blue-600 transition flex items-center gap-1"
      @click="emit('create')"
    >
      + 新建{{ entityName }}
    </button>
    <button
      class="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-md text-sm hover:bg-gray-200 transition flex items-center gap-1"
      @click="emit('createFolder')"
    >
      📁 新建文件夹
    </button>
    <div class="ml-auto flex gap-1">
      <button
        class="w-7 h-7 flex items-center justify-center bg-blue-50 rounded-md hover:bg-blue-100 transition"
        title="展开全部文件夹"
        @click="emit('expandAll')"
      >
        📂
      </button>
      <button
        class="w-7 h-7 flex items-center justify-center bg-blue-50 rounded-md hover:bg-blue-100 transition"
        title="收缩全部文件夹"
        @click="emit('collapseAll')"
      >
        📁
      </button>
    </div>
  </div>
</template>
