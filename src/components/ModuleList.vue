<template>
  <div class="module-list-container">
    <el-input
      v-model="filterText"
      placeholder="Filter modules..."
      clearable
      class="filter-input"
    />
    <el-collapse v-model="activeCollapseNames" class="module-list">
      <el-collapse-item
        v-for="file in filteredModuleFiles"
        :key="file.filename"
        :title="file.filename"
        :name="file.filename"
        type="secondary"
      >
        <el-card
          v-for="module in file.modules"
          :key="module.name"
          class="module-card"
          shadow="hover"
          :draggable="true"
          @dragstart="onDragStart($event, module)"
        >
          <div class="module-name">{{ module.name }}</div>
        </el-card>
      </el-collapse-item>
    </el-collapse>

    <el-empty
      v-if="filteredModuleFiles.length === 0"
      :description="
        store.availableModules.length === 0
          ? 'Load a module file'
          : 'No modules found'
      "
      :image-size="80"
    ></el-empty>
  </div>
</template>

<script setup>
import { computed, ref, watch } from "vue"
import { useBuilderStore } from "../stores/builderStore"
import useDragAndDrop from "../composables/useDnD"

const store = useBuilderStore()
const { onDragStart } = useDragAndDrop()

const filterText = ref("")
const activeCollapseNames = ref([])

const filteredModuleFiles = computed(() => {
  const lowerCaseFilter = filterText.value.toLowerCase()

  if (!lowerCaseFilter) {
    return store.availableModules // Show all files
  }

  // Filter *inside* each file, and only return files that have matches
  return store.availableModules
    .map((file) => {
      const filteredModules = file.modules.filter((module) =>
        module.name.toLowerCase().includes(lowerCaseFilter)
      )
      return { ...file, modules: filteredModules }
    })
    .filter((file) => file.modules.length > 0)
})

watch(filteredModuleFiles, (newFiles) => {
  // If we are filtering, open all panels that have matches
  if (filterText.value) {
    activeCollapseNames.value = newFiles.map((f) => f.filename)
  }
  // If filter is cleared, you might want to close them all:
  // else {
  //   activeCollapseNames.value = []
  // }
})

// Initially, open all panels
activeCollapseNames.value = store.availableModules.map((f) => f.filename)

const filteredModules = computed(() => {
  if (!filterText.value) {
    return store.availableModules
  }

  const lowerCaseFilter = filterText.value.toLowerCase()

  return store.availableModules.filter((module) =>
    module.name.toLowerCase().includes(lowerCaseFilter)
  )
})
</script>

<style scoped>
.module-list {
  flex-grow: 1;
  overflow-y: auto;
  border: none;
}

:deep(.el-collapse-item__header) {
  font-weight: bold;
  font-size: 1.05em;
  background-color: #f9f9f9;
  border-radius: 4px;
  padding-left: 10px;
  margin-top: 5px;
}

:deep(.el-collapse-item__wrap) {
  border-bottom: none;
}

:deep(.el-collapse-item__content) {
  padding: 10px 0 0 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.module-list-container {
  display: flex;
  flex-direction: column;
  flex-grow: 1; /* Makes the whole container fill the aside */
  min-height: 0; /* Fix for overflow in flex columns */
}

.filter-input {
  margin-bottom: 15px;
}

.module-card {
  cursor: grab;
  user-select: none; /* Prevent text selection while dragging */
  flex-shrink: 0;
}

.module-name {
  font-weight: bold;
}
</style>
