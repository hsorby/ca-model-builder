<template>
  <div class="ghost-node">
    <div class="ghost-header">
      <span class="ghost-icon">👻</span> 
      <span class="label">Next: {{ targetNode?.label || 'Unknown' }}</span>
    </div>

    <div class="ports-container">
       <div v-for="port in targetPorts" :key="port.id" class="port-wrapper">
          <Handle 
            v-if="port.type === 'target'"
            :id="port.id" 
            :position="Position.Left" 
            type="target"
          />
          <span v-if="port.type === 'target'">{{ port.label }}</span>
       </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useVueFlow, Handle, Position } from '@vue-flow/core'

const props = defineProps(['id', 'data'])
const { findNode } = useVueFlow()

// 1. Find the "Real" Node this ghost is mimicking
const targetNode = computed(() => {
  if (!props.data.targetNodeId) return null
  return findNode(props.data.targetNodeId)
})

// 2. Mimic its ports
const targetPorts = computed(() => {
  return targetNode.value?.data?.ports || []
})
</script>

<style scoped>
.ghost-node {
  /* Visual styling to make it look "Ghostly" */
  border: 2px dashed #ccc;
  background: rgba(255, 255, 255, 0.5);
  opacity: 0.8;
  filter: grayscale(100%);
  border-radius: 8px;
  padding: 10px;
  min-width: 150px;
}
</style>
