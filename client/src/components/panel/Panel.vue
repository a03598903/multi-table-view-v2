<script setup lang="ts">
import { computed, inject, ref, watch } from 'vue';
import { usePanelsStore } from '../../stores/panels';
import { useSettingsStore } from '../../stores/settings';
import type { IPanelConfig, TreeItem, PanelKey } from '../../types';
import { getPanelConfig, PANEL_CONFIGS } from '../../types';
import * as api from '../../api';
import PanelHeader from './PanelHeader.vue';
import PanelActions from './PanelActions.vue';
import PanelContent from './PanelContent.vue';

const props = defineProps<{
  config: IPanelConfig;
}>();

const panelsStore = usePanelsStore();
const settingsStore = useSettingsStore();

const showToast = inject<(msg: string) => void>('showToast');

// 面板索引
const panelIndex = computed(() => PANEL_CONFIGS.findIndex(p => p.key === props.config.key));

// 是否为活动面板
const isActivePanel = computed(() => panelsStore.activePanelIndex === panelIndex.value);

// 搜索相关
const searchQuery = ref('');
const searchResults = ref<TreeItem[]>([]);
const currentResultIndex = ref(0);
const highlightedItemId = ref<string | null>(null);

// 计算属性
const panelData = computed(() => panelsStore.getPanelData(props.config.key));
const isCollapsed = computed(() => settingsStore.isPanelCollapsed(props.config.key));
const panelWidth = computed(() => settingsStore.getPanelWidth(props.config.key));

// 计数
const itemCount = computed(() => {
  const countItems = (items: TreeItem[]): number => {
    let count = 0;
    items.forEach(item => {
      if (item.type !== 'folder') count++;
      if ('children' in item && item.children) {
        count += countItems(item.children);
      }
    });
    return count;
  };
  return countItems(panelData.value);
});

// 面板样式
const panelStyle = computed(() => {
  if (isCollapsed.value) {
    return { width: '40px', minWidth: '40px' };
  }
  return { width: `${panelWidth.value}vw` };
});

// 搜索项目
function searchItems(items: TreeItem[], query: string): TreeItem[] {
  const results: TreeItem[] = [];
  const lowerQuery = query.toLowerCase();

  const traverse = (list: TreeItem[]) => {
    list.forEach(item => {
      // 搜索名称和编码
      const name = item.type === 'selected'
        ? (item as { view_name?: string }).view_name || ''
        : item.name;
      const code = item.code || '';

      if (name.toLowerCase().includes(lowerQuery) || code.includes(query)) {
        results.push(item);
      }

      if ('children' in item && item.children) {
        traverse(item.children);
      }
    });
  };

  traverse(items);
  return results;
}

// 监听搜索变化
watch(searchQuery, (newQuery) => {
  if (newQuery.trim()) {
    searchResults.value = searchItems(panelData.value, newQuery.trim());
    currentResultIndex.value = 0;
    if (searchResults.value.length > 0) {
      highlightAndScrollTo(searchResults.value[0]);
    } else {
      highlightedItemId.value = null;
    }
  } else {
    searchResults.value = [];
    currentResultIndex.value = 0;
    highlightedItemId.value = null;
  }
});

// 高亮并滚动到项目
async function highlightAndScrollTo(item: TreeItem) {
  // 先展开所有包含该项目的文件夹
  await expandFoldersContaining(item.id);

  highlightedItemId.value = item.id;

  // 等待 DOM 更新后滚动
  setTimeout(() => {
    const element = document.querySelector(`[data-item-id="${item.id}"]`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, 100);
}

// 展开包含指定项目的所有文件夹
async function expandFoldersContaining(itemId: string) {
  const foldersToExpand: string[] = [];

  const findPath = (items: TreeItem[], targetId: string, path: string[] = []): boolean => {
    for (const item of items) {
      if (item.id === targetId) {
        return true;
      }
      if (item.type === 'folder' && 'children' in item && item.children) {
        const found = findPath(item.children, targetId, [...path, item.id]);
        if (found) {
          foldersToExpand.push(item.id);
          return true;
        }
      }
    }
    return false;
  };

  findPath(panelData.value, itemId);

  // 展开所有需要展开的文件夹
  for (const folderId of foldersToExpand) {
    await api.updateFolder(folderId, { expanded: 1 });
  }

  if (foldersToExpand.length > 0) {
    await panelsStore.loadPanel(props.config.key);
  }
}

// 上一个结果
function prevResult() {
  if (searchResults.value.length === 0) return;
  currentResultIndex.value = (currentResultIndex.value - 1 + searchResults.value.length) % searchResults.value.length;
  highlightAndScrollTo(searchResults.value[currentResultIndex.value]);
}

// 下一个结果
function nextResult() {
  if (searchResults.value.length === 0) return;
  currentResultIndex.value = (currentResultIndex.value + 1) % searchResults.value.length;
  highlightAndScrollTo(searchResults.value[currentResultIndex.value]);
}

// 清除搜索
function clearSearch() {
  searchQuery.value = '';
  searchResults.value = [];
  currentResultIndex.value = 0;
  highlightedItemId.value = null;
}

// 面板点击（展开折叠的面板）
function handlePanelClick() {
  if (isCollapsed.value) {
    settingsStore.togglePanel(props.config.key);
  }
}

// 宽度变化
function onWidthChange(value: number) {
  settingsStore.setPanelWidth(props.config.key, value);
}

// 重置宽度
function resetWidth() {
  settingsStore.resetPanelWidth(props.config.key);
}

// 切换折叠
function toggleCollapse() {
  settingsStore.togglePanel(props.config.key);
}

// 创建实体
async function createEntity() {
  const config = props.config;

  // 检查是否需要选择父级
  if (config.parentKey) {
    const parentItem = panelsStore.selected[config.parentKey];
    if (!parentItem) {
      const parentConfig = getPanelConfig(config.parentKey);
      showToast?.(`请先选择${parentConfig?.title || '父级'}`);
      return;
    }
  }

  try {
    const payload: Record<string, unknown> = { name: '默认名称' };

    if (config.parentField && config.parentKey) {
      payload[config.parentField] = panelsStore.selected[config.parentKey]?.id;
    }

    const newItem = await api.createEntity(config.key, payload);
    await panelsStore.loadPanel(config.key);
    // 触发编辑新项目
    panelsStore.setEditingItemId(newItem.id);
    showToast?.('已创建');
  } catch (e) {
    showToast?.('创建失败');
  }
}

// 创建文件夹
async function createFolder() {
  const config = props.config;

  try {
    const payload: Record<string, unknown> = {
      name: '默认名称',
      type: config.folderType
    };

    if (config.parentKey) {
      payload.owner_id = panelsStore.selected[config.parentKey]?.id;
    }

    const newFolder = await api.createFolder(payload as { name?: string; type: string; parent_id?: string; owner_id?: string });
    await panelsStore.loadPanel(config.key);
    // 触发编辑新文件夹
    panelsStore.setEditingItemId(newFolder.id);
    showToast?.('已创建文件夹');
  } catch (e) {
    showToast?.('创建失败');
  }
}

// 展开所有文件夹
async function expandAllFolders() {
  const folders = getAllFolders(panelData.value);
  for (const folder of folders) {
    if (!folder.expanded) {
      await api.updateFolder(folder.id, { expanded: 1 });
    }
  }
  await panelsStore.loadPanel(props.config.key);
  showToast?.('已展开全部');
}

// 折叠所有文件夹
async function collapseAllFolders() {
  const folders = getAllFolders(panelData.value);
  for (const folder of folders) {
    if (folder.expanded) {
      await api.updateFolder(folder.id, { expanded: 0 });
    }
  }
  await panelsStore.loadPanel(props.config.key);
  showToast?.('已收缩全部');
}

// 获取所有文件夹
function getAllFolders(items: TreeItem[]): TreeItem[] {
  const folders: TreeItem[] = [];
  const traverse = (list: TreeItem[]) => {
    list.forEach(item => {
      if (item.type === 'folder') {
        folders.push(item);
      }
      if ('children' in item && item.children) {
        traverse(item.children);
      }
    });
  };
  traverse(items);
  return folders;
}
</script>

<template>
  <div
    class="panel-wrapper bg-white rounded-xl shadow-xl flex flex-col overflow-hidden transition-all duration-200 flex-shrink-0"
    :class="{
      'cursor-pointer hover:shadow-2xl': isCollapsed,
      'ring-4 ring-blue-400 ring-opacity-75': isActivePanel
    }"
    :style="panelStyle"
    @click="handlePanelClick"
  >
    <!-- 收缩状态下的完整展开区域 -->
    <template v-if="isCollapsed">
      <PanelHeader
        :config="config"
        :count="itemCount"
        :collapsed="isCollapsed"
        @toggle="toggleCollapse"
      />
    </template>

    <!-- 展开状态 -->
    <template v-else>
      <!-- 宽度控制条 -->
      <div
        class="flex items-center gap-2 px-2 py-1 bg-gray-100 border-b border-gray-200 text-xs text-gray-600"
      >
        <span>宽度</span>
        <input
          type="range"
          class="flex-1 h-1 accent-blue-500"
          min="15"
          max="50"
          :value="panelWidth"
          @input="onWidthChange(Number(($event.target as HTMLInputElement).value))"
          @click.stop
        />
        <span class="w-8 text-center font-medium">{{ panelWidth }}%</span>
        <button
          class="px-1.5 py-0.5 bg-gray-200 rounded text-xs hover:bg-gray-300"
          @click.stop="resetWidth"
        >
          重置
        </button>
      </div>

      <!-- 头部 -->
      <PanelHeader
        :config="config"
        :count="itemCount"
        :collapsed="isCollapsed"
        @toggle="toggleCollapse"
      />

      <!-- 搜索栏 -->
      <div class="px-2 py-1.5 border-b border-gray-200">
        <div class="flex items-center gap-1">
          <div class="relative flex-1">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="搜索..."
              class="w-full pl-7 pr-7 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:border-blue-500"
              @keydown.enter="nextResult"
              @keydown.escape="clearSearch"
            />
            <span class="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
            <button
              v-if="searchQuery"
              class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
              @click="clearSearch"
            >
              ✕
            </button>
          </div>
          <!-- 搜索结果导航 -->
          <template v-if="searchResults.length > 0">
            <span class="text-xs text-gray-500 whitespace-nowrap">
              {{ currentResultIndex + 1 }}/{{ searchResults.length }}
            </span>
            <button
              class="w-6 h-6 flex items-center justify-center text-gray-500 hover:bg-gray-100 rounded"
              @click="prevResult"
            >
              ▲
            </button>
            <button
              class="w-6 h-6 flex items-center justify-center text-gray-500 hover:bg-gray-100 rounded"
              @click="nextResult"
            >
              ▼
            </button>
          </template>
          <span v-else-if="searchQuery && searchResults.length === 0" class="text-xs text-red-500">
            无结果
          </span>
        </div>
      </div>

      <!-- 操作栏 -->
      <PanelActions
        :entity-name="config.title"
        @create="createEntity"
        @create-folder="createFolder"
        @expand-all="expandAllFolders"
        @collapse-all="collapseAllFolders"
      />

      <!-- 内容区 -->
      <PanelContent
        :config="config"
        :items="panelData"
        :highlighted-item-id="highlightedItemId"
        :search-query="searchQuery"
      />
    </template>
  </div>
</template>
