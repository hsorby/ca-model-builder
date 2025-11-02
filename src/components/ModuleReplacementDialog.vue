<template>
    <el-dialog
        :model-value="modelValue"
        title="Replace Module"
        width="600px"
        teleported
        @update:model-value="closeDialog"
    >
    <div style="display:flex; gap:12px;">
      <div style="flex:1 1 0;">
        <ModuleList selectable @select="onModuleSelected" />
      </div>
      <div style="width:250px; display:flex; flex-direction:column; gap:8px;">
        <div style="font-weight:600">Selected module</div>
        <div v-if="selectedModule">
          <div style="font-weight:600">{{ selectedModule.name || selectedModule.filename }}</div>
          <div style="font-size:12px; color:#666">{{ selectedModule.sourceFile || '' }}</div>
        </div>
        <el-checkbox v-model="retainMatches">Keep ports with matching names</el-checkbox>  
        </div>
    </div>

    <template #footer>
      <span class="dialog-footer">
        <el-button @click="closeDialog">Cancel</el-button>
        <el-button type="primary" @click="handleConfirm"> Confirm </el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref } from "vue"
import ModuleList from "./ModuleList.vue"
import { ElCheckbox,  ElButton } from "element-plus"

const props = defineProps({
  modelValue: { type: Boolean, default: false },
})

const emit = defineEmits([
  "update:modelValue", // Required for v-model
  "select", // Emits the new data
])

const selectedModule = ref(null)
const retainMatches = ref(false)

function closeDialog() {
  emit("update:modelValue", false)
  selectedModule.value = null
  retainMatches.value = false
}

function onModuleSelected(module) {
  selectedModule.value = module
}

function handleConfirm() {
  if (!selectedModule.value) return
  emit("select", { module: selectedModule.value, retainMatches: retainMatches.value })
  emit("update:modelValue", false)
  selectedModule.value = null
  retainMatches.value = false
}

</script>

<style scoped>

</style>
