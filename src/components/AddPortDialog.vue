<template>
  <el-dialog
    :model-value="modelValue"
    title="Add New Port"
    width="300px"
    teleported
    @closed="resetForm"
    @update:model-value="closeDialog"
    @mousedown.stop
    @wheel.stop
  >
    <el-form :model="newPort" label-position="top">
      <el-form-item label="Port Name">
        <el-input v-model="newPort.name" placeholder="e.g., my_port" />
      </el-form-item>
      <el-form-item label="Port Type">
        <el-radio-group v-model="newPort.type">
          <el-radio label="in">Input</el-radio>
          <el-radio label="out">Output</el-radio>
        </el-radio-group>
      </el-form-item>
    </el-form>
    
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="closeDialog">Cancel</el-button>
        <el-button type="primary" @click="handleConfirm">
          Confirm
        </el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup>
import { reactive, watch } from 'vue'
import { ElNotification, ElDialog, ElForm, ElFormItem, ElInput, ElRadioGroup, ElRadio } from 'element-plus'

// --- Props & Emits ---

const props = defineProps({
  // This prop is used by v-model
  modelValue: {
    type: Boolean,
    default: false,
  },
  // This prop is for validation
  existingPorts: {
    type: Array,
    default: () => [],
  },
})

console.log("---------------")
console.log(props.existingPorts)
const emit = defineEmits([
  'update:modelValue', // Required for v-model
  'confirm'            // Our custom event
])

// --- Internal State ---

const newPort = reactive({
  name: '',
  type: 'in',
})

// --- Methods ---

function resetForm() {
  newPort.name = ''
  newPort.type = 'in'
}

function closeDialog() {
  emit('update:modelValue', false)
}

function handleConfirm() {
  // --- Validation ---
  if (!newPort.name.trim()) {
    ElNotification.error("Port name cannot be empty.")
    return
  }
  const portExists = props.existingPorts.some(p => p.name === newPort.name)
  if (portExists) {
    ElNotification.error("A port with this name already exists.")
    return
  }

  // 1. Emit the new port data as an object
  emit('confirm', { ...newPort })
  
  // 2. Close the dialog
  closeDialog()
}

// Reset the form if the dialog is opened from the outside
watch(() => props.modelValue, (newValue) => {
  if (newValue) {
    resetForm()
  }
})
</script>

<style scoped>
.el-form-item {
  margin-bottom: 10px;
}
</style>