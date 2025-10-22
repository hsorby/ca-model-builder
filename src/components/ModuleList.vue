<template>
  <div class="module-list-container">
    <el-input
      v-model="filterText"
      placeholder="Filter modules..."
      clearable
      class="filter-input"
    />
    <div class="module-list">
      <el-card
        v-for="module in filteredModules"
        :key="module.name"
        class="module-card"
        shadow="hover"
        :draggable="true"
        @dragstart="onDragStart($event, module)"
      >
        <div class="module-name">{{ module.name }}</div>
      </el-card>

      <el-empty
        v-if="filteredModules.length === 0"
        :description="
          store.availableModules.length === 0
            ? 'Load a module file'
            : 'No modules found'
        "
        :image-size="80"
      ></el-empty>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from "vue"
import { useBuilderStore } from "../stores/builderStore"
import useDragAndDrop from "../composables/useDnD"

const store = useBuilderStore()
const { onDragStart } = useDragAndDrop()

const filterText = ref("")

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
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex-grow: 1; /* Makes the list fill the container */
  overflow-y: auto; /* Adds the scrollbar when content overflows */
  padding-right: 5px; /* Adds space for the scrollbar */
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
