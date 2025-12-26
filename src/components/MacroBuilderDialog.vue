<template>
  <el-dialog
    :model-value="modelValue"
    title="Macro Builder"
    class="macro-dialog"
    fullscreen
    @update:model-value="closeDialog"
  >
    <el-container style="flex-grow: 1; min-height: 0">
      <el-aside :width="asideWidth + 'px'" class="module-aside">
        <h4 style="margin-top: 0">Available Modules</h4>
        <ModuleList />
      </el-aside>

      <div class="resize-handle" @mousedown="startResize">
        <el-icon class="handle-icon"><DCaret /></el-icon>
      </div>

      <el-main class="workbench-macro">
        <div class="dnd-flow" @drop="onDrop" @dragover.prevent>
          <VueFlow
            :id="FLOW_IDS.MACRO"
            @dragleave="onDragLeave"
            @nodes-change="onNodeChange"
            @edges-change="onEdgeChange"
            :default-edge-options="edgeLineOptions"
            :connection-line-options="edgeLineOptions"
            :nodes="nodes"
            :delete-key-code="['Backspace', 'Delete']"
          >
            <template #node-moduleNode="props">
              <ModuleNode
                :id="props.id"
                :data="props.data"
                :selected="props.selected"
                @open-edit-dialog="onOpenEditDialog"
                :ref="(el) => (nodeRefs[props.id] = el)"
              />
            </template>
            <WorkbenchArea />
          </VueFlow>
        </div>
      </el-main>
    </el-container>
    <template #footer>
      <div class="config-panel">
        <el-input-number v-model="multiplier" label="Repeat Count" />
        <el-button @click="closeDialog" type="">Cancel</el-button>
        <el-button @click="generateMacro" type="primary"
          >Generate Macro Node</el-button
        >
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref } from 'vue'
import { VueFlow, useVueFlow } from '@vue-flow/core'
import { DCaret } from '@element-plus/icons-vue'
import {
  ElDialog,
  ElContainer,
  ElAside,
  ElMain,
  ElButton,
  ElInputNumber,
  ElIcon,
} from 'element-plus'

import WorkbenchArea from './WorkbenchArea.vue'
import ModuleList from './ModuleList.vue'
import ModuleNode from './ModuleNode.vue'
import { useResizableAside } from '../composables/useResizableAside'
import useDragAndDrop from '../composables/useDnD'
import { edgeLineOptions, FLOW_IDS } from '../utils/constants'

const { edges, nodes, onDragLeave, onNodeChange, onEdgeChange } = useVueFlow(
  FLOW_IDS.MACRO
) // Unique ID separates this from main canvas.

const previousNodes = new Set()
const { onDrop } = useDragAndDrop(previousNodes)

const { width: asideWidth, startResize } = useResizableAside(200, 150, 400)
const props = defineProps({
  // v-model for visibility
  modelValue: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update:modelValue', 'generate', 'edit-node'])

const multiplier = ref(1)
const nodeRefs = ref({})

function onOpenEditDialog(eventPayload) {
  emit('edit-node', {
    ...eventPayload,
    instanceId: FLOW_IDS.MACRO,
  })
}

function closeDialog() {
  emit('update:modelValue', false)
}

function generateMacro() {
  const serializedNodes = nodes.value.map((node) => {
    const dataSnapshot = JSON.parse(JSON.stringify(node.data))

    return {
      id: node.id,
      type: node.type,
      position: { ...node.position },
      data: dataSnapshot,
      width: node.dimensions?.width || node.width || 150, // Fallback safe
      height: node.dimensions?.height || node.height || 50,
    }
  })

  const serializedEdges = edges.value.map((e) => ({ ...e }))

  const macroData = {
    flow: { nodes: serializedNodes, edges: serializedEdges },
    repeatCount: multiplier.value,
  }

  emit('generate', macroData)
  closeDialog()
}
</script>

<style scoped>
.workbench-macro {
  padding: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.dnd-flow {
  flex-grow: 1;
  height: 100%; /* Crucial for Vue Flow */
  width: 100%;
  position: relative;
}
</style>

<style>
.macro-dialog .el-dialog__body {
  /* Calculate height: 100vh - Header (approx 55px) - Footer (approx 65px) */
  height: calc(100vh - 120px);
  padding: 0 !important; /* Remove default padding for edge-to-edge look */
  display: flex;
  flex-direction: column;
}
</style>
