<template>
  <el-dialog
    :model-value="modelValue"
    title="Edit Module"
    width="300px"
    teleported
    @closed="resetForm"
    @update:model-value="closeDialog"
    @mousedown.stop
    @wheel.stop
  >
    <el-form
      :model="editableData"
      label-position="top"
      @submit.prevent="handleConfirm"
    >
      <el-form-item label="Module Name">
        <el-input v-model="editableData.name" placeholder="Enter module name" />
      </el-form-item>
    </el-form>

    <template #footer>
      <span class="dialog-footer">
        <el-button @click="closeDialog">Cancel</el-button>
        <el-button type="primary" @click="handleConfirm"> Confirm </el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup>
import { reactive, watch } from "vue"
import {
  ElNotification,
  ElDialog,
  ElForm,
  ElFormItem,
  ElInput,
  ElButton,
} from "element-plus"

const props = defineProps({
  // v-model for visibility
  modelValue: {
    type: Boolean,
    default: false,
  },
  // Pass the current name to edit
  initialName: {
    type: String,
    default: "",
  },
  nodeId: {
    type: String,
    required: true,
  },
  existingNames: {
    type: Array,
    default: () => [],
  }
})

const emit = defineEmits([
  "update:modelValue", // Required for v-model
  "confirm", // Emits the new data
])

const editableData = reactive({
  name: "",
})

function resetForm() {
  editableData.name = props.initialName
}

function closeDialog() {
  emit("update:modelValue", false)
}

function handleConfirm() {
  if (!editableData.name || !editableData.name.trim()) {
    ElNotification.error("Module name cannot be empty.")
    return
  }

  const nameExists = props.existingNames.some(name => name === editableData.name && name !== props.initialName)
  if (nameExists) {
    ElNotification.error("A module with this name already exists.")
    return
  }

  emit("confirm", { name: editableData.name, nodeId: props.nodeId })

  closeDialog()
}

watch(
  () => [props.initialName, props.modelValue],
  ([newName, isVisible]) => {
    if (isVisible) {
      resetForm()
    }
  },
  { immediate: true }
)
</script>

<style scoped>
.el-form-item {
  margin-bottom: 15px; /* More space */
}
</style>
