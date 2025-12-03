<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, provide } from 'vue';
import { usePanelsStore } from '../../stores/panels';
import { useSettingsStore } from '../../stores/settings';
import PanelContainer from './PanelContainer.vue';

const props = defineProps<{
  visible: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const panelsStore = usePanelsStore();
const settingsStore = useSettingsStore();

// 主内容区域引用（供 PanelContainer 使用）
const mainContentRef = ref<HTMLElement | null>(null);
provide('mainContentRef', mainContentRef);

// 点击外部关闭
function handleClickOutside(e: MouseEvent) {
  const target = e.target as HTMLElement;
  if (target.classList.contains('modal-backdrop')) {
    emit('close');
  }
}

// ESC 键关闭
function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    emit('close');
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown);
});
</script>

<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="modal-backdrop fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-16"
      @click="handleClickOutside"
    >
      <div
        class="modal-content bg-white rounded-xl shadow-2xl w-[95vw] max-h-[80vh] overflow-hidden flex flex-col"
        @click.stop
      >
        <!-- 头部 -->
        <div class="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-indigo-500 to-purple-600">
          <h2 class="text-lg font-semibold text-white">选择视图</h2>
          <button
            class="w-8 h-8 flex items-center justify-center rounded-lg bg-white/20 text-white hover:bg-white/30 transition"
            @click="emit('close')"
          >
            ×
          </button>
        </div>

        <!-- 内容：面板容器 -->
        <div
          ref="mainContentRef"
          class="flex-1 flex gap-3 p-4 overflow-x-auto overflow-y-hidden bg-gradient-to-r from-indigo-50 to-purple-50"
        >
          <PanelContainer />
        </div>

        <!-- 底部提示 -->
        <div class="px-4 py-2 border-t border-gray-200 bg-gray-50 text-sm text-gray-500">
          点击视图的 ⭐ 图标添加到已选视图，然后在工具栏中点击 + 图标打开到编辑区域
        </div>
      </div>
    </div>
  </Teleport>
</template>
