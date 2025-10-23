<template>
  <el-dialog
    :model-value="modelValue"
    title="Save Workflow"
    width="400px"
    teleported
    @closed="resetForm"
    @update:model-value="closeDialog"
    @mousedown.stop
    @wheel.stop
  >
    <el-form
      label-position="top"
      @submit.prevent="handleConfirm"
    >
      <el-form-item label="Filename">
        <el-input v-model="fileName">
          <template #append>.json</template>
        </el-input>
      </el-form-item>
    </el-form>
    
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="closeDialog">Cancel</el-button>
        <el-button type="primary" @click="handleConfirm">
          Save
        </el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, watch } from 'vue'
import { ElNotification, ElDialog, ElForm, ElFormItem, ElInput, ElButton } from 'element-plus'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  defaultName: {
    type: String,
    default: 'ca-model-builder',
  }
})

const emit = defineEmits([
  'update:modelValue',
  'confirm' 
])

const fileName = ref(props.defaultName)

function resetForm() {
  fileName.value = props.defaultName
}

function closeDialog() {
  emit('update:modelValue', false)
}

function handleConfirm() {
  if (!fileName.value || !fileName.value.trim()) {
    ElNotification.error("Filename cannot be empty.")
    return
  }
  
  emit('confirm', fileName.value)
  closeDialog()
}

// Reset the form to the default name every time it's opened
watch(() => props.modelValue, (isVisible) => {
  if (isVisible) {
    resetForm()
  }
})
</script>
