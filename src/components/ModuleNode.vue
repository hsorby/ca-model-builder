<template>
  <div
    class="module-node"
    :id="id"
    ref="moduleNode"
    :class="{ selected: selected }"
    @contextmenu.stop.prevent="openContextMenu"
  >
    <NodeResizer min-width="180" min-height="75" :is-visible="selected" />

    <el-card :class="[domainTypeClass, 'module-card']" shadow="hover">
      <div class="module-name" @dblclick="startEditing">
        <span v-if="!isEditing">
          {{ data.name }}
        </span>
        <el-input
          v-else
          ref="inputRef"
          v-model="editingName"
          size="small"
          @blur="saveEdit"
          @keyup.enter="saveEdit"
        />
      </div>
      <!-- non-editable label showing CellML component and source file (no white box) -->
      <div 
        v-if="data.label"
        class="module-label">{{ data.label }}
      </div>
      <div class="button-group">
        <el-dropdown trigger="click" @command="handleSetDomainType">
          <el-button size="small" circle class="module-button">
            <el-icon><Key /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="membrane">Membrane</el-dropdown-item>
              <el-dropdown-item command="process">Process</el-dropdown-item>
              <el-dropdown-item command="compartment"
                >Compartment</el-dropdown-item
              >
              <el-dropdown-item command="protein">Protein</el-dropdown-item>
              <el-dropdown-item command="undefined" divided
                >Reset to Default</el-dropdown-item
              >
            </el-dropdown-menu>
          </template>
        </el-dropdown>

        <el-dropdown trigger="click" @command="addPort({ type: $event })">
          <el-button size="small" circle class="module-button">
            <el-icon><Place /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="left">Left</el-dropdown-item>
              <el-dropdown-item command="right">Right</el-dropdown-item>
              <el-dropdown-item command="top">Top</el-dropdown-item>
              <el-dropdown-item command="bottom">Bottom</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>

        <el-button size="small" circle @click="openEditDialog" class="module-button">
          <el-icon><Edit /></el-icon>
        </el-button>
      </div>
    </el-card>

    <template v-for="(port, index) in data.ports" :key="port.name" class="port">
      <el-tooltip
        class="box-item"
        effect="dark"
        :content="port.name"
        placement="bottom"
        :show-after="1000"
      >
        <Handle
          :id="'port_' + port.type + '_' + index"
          :ref="'handle_' + port.type + '_' + index"
          type="source"
          :position="portPosition(port.type)"
          :style="getHandleStyle(index, port)"
          class="port-handle"
        />
        <template #content>
          <el-button
            class="delete-port-btn"
            type="danger"
            :icon="Delete"
            circle
            plain
            size="small"
            @click.stop="removePort(index)"
          />
        </template>
      </el-tooltip>
    </template>
      <!-- context menu -->
      <teleport to="body">
        <div 
          v-if="contextMenuVisible"
          class="context-menu"
          :style="{ top: contextMenuY + 'px', left: contextMenuX + 'px' }"
          @click.stop
        >
          <ul class="context-menu-list">
            <li @click="requestReplace('replace')">Replace module…</li>
          </ul>
        </div>
      </teleport>
    </div>
</template>

<script setup>
import { computed, nextTick, ref, useId, onBeforeUnmount } from "vue"
import { Handle, Position, useVueFlow } from "@vue-flow/core"
import { NodeResizer } from "@vue-flow/node-resizer"
import { Delete, Edit, Key, Place, Plus } from "@element-plus/icons-vue"

const { updateNodeData, updateNodeInternals } = useVueFlow()

const props = defineProps({
  data: {
    type: Object,
    required: true,
  },
  id: {
    type: String,
    required: true,
  },
  selected: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(["open-edit-dialog", "request-replace-module", "request-compatibility-check", "module-replaced"])

const id = useId()
const moduleNode = ref(null)

async function openEditDialog() {
  emit("open-edit-dialog", {
    nodeId: props.id,
    ports: props.data.ports,
    name: props.data.name,
    portOptions: props.data.portOptions,
    portLabels: props.data.portLabels,
  })
}

const domainTypeClass = computed(() => {
  return props.data.domainType
    ? `domain-type-${props.data.domainType}`
    : "domain-type-default"
})

function portPosition(type) {
  switch (type) {
    case "left":
      return Position.Left
    case "right":
      return Position.Right
    case "top":
      return Position.Top
    case "bottom":
      return Position.Bottom
    default:
      return Position.Left
  }
}

function handleSetDomainType(typeCommand) {
  const newType = typeCommand === "undefined" ? undefined : typeCommand
  updateNodeData(props.id, { domainType: newType })
}

function portCount(aspect) {
  return props.data.ports.filter((p) => p.type === aspect).length
}

function getPositionIndex(fullList, globalIndex) {
  const targetPosition = fullList[globalIndex].type
  let positionIndex = -1

  for (let i = 0; i <= globalIndex; i++) {
    const currentObject = fullList[i]

    if (currentObject.type === targetPosition) {
      positionIndex++
    }
  }

  return positionIndex
}

function getHandleStyle(index, port) {
  const n = portCount(port.type)
  // Space between each port.
  const portSpacing = 16
  const positionIndex = getPositionIndex(props.data.ports, index)

  // This calculates the offset from the center
  const offset = portSpacing * (positionIndex - (n - 1) / 2)

  if (["top", "bottom"].includes(port.type)) {
    // Let CSS calculate the 50% mark and apply the offset
    return {
      left: `calc(50% + ${offset}px)`,
    }
  }

  // Let CSS calculate the 50% mark and apply the offset
  return {
    top: `calc(50% + ${offset}px)`,
  }
}

async function removePort(indexToRemove) {
  // Create a new array filtering out the port we want to remove
  const newPortsArray = props.data.ports.filter((port, index) => {
    // Keep the port only if its index does NOT match indexToRemove
    return index !== indexToRemove
  })

  // Update the node's data
  updateNodeData(props.id, { ports: newPortsArray })

  // Wait for Vue to update the DOM
  await nextTick()

  // Tell Vue Flow to re-scan the node's handles
  updateNodeInternals(props.id)
}

const addPort = async (portToAdd) => {
  // Create a new array with the old ports + the new one
  const newPortsArray = [...props.data.ports, portToAdd]

  // Tell Vue Flow to update this node's data
  // This will cause the component to re-render
  updateNodeData(props.id, { ports: newPortsArray })
  await nextTick()
  updateNodeInternals(props.id)
}

const isEditing = ref(false)
const editingName = ref("")
const inputRef = ref(null) // This is a template ref for the input

// This function is triggered by the double-click
async function startEditing(event) {
  // Don't allow click-through to the flow pane
  event.stopPropagation()

  isEditing.value = true
  editingName.value = props.data.name

  // Wait for Vue to re-render and show the input
  await nextTick()

  // Focus the input
  inputRef.value?.focus()
}

// This is triggered by pressing Enter or clicking away
function saveEdit() {
  if (!editingName.value || editingName.value.trim() === "") {
    isEditing.value = false // Cancel edit if name is empty
    return
  }

  // Update the node's data in the store
  updateNodeData(props.id, { name: editingName.value })
  isEditing.value = false
}

const contextMenuVisible = ref(false)
const contextMenuX = ref(0)
const contextMenuY = ref(0)

function closeContextMenu() {
  contextMenuVisible.value = false
  document.removeEventListener("click", closeContextMenu)
}

onBeforeUnmount(() => {
  document.removeEventListener("click", closeContextMenu)
})

function openContextMenu(event) {
  event.stopPropagation()
  event.preventDefault()

  let x = event.clientX
  let y = event.clientY

  const pad = 8
  const vw = window.innerWidth
  const vh = window.innerHeight
  const menuWidth = 150
  const menuHeight = 200
  if (x + menuWidth + pad > vw) x = vw - menuWidth - pad
  if (y + menuHeight + pad > vh) y = vh - menuHeight - pad

  contextMenuX.value = x
  contextMenuY.value = y
  contextMenuVisible.value = true
  document.addEventListener("click", closeContextMenu)
}

function requestReplace(mode) {
  closeContextMenu()
  emit("request-replace-module", { nodeId: props.id, mode, nodeData: props.data })
}

function checkCompatibility() {
  closeContextMenu()
  emit("request-compatibility-check", { nodeId: props.id, nodeData: props.data })
}

function compareCompatibility(nodeData, candidateModule) {
  const existingNames = new Set((nodeData?.ports || []).map((p) => p.name || p.variable || ""))
  const candidateNames = new Set((candidateModule?.ports || []).map((p) => p.name || p.variable || ""))
  const missingInCandidate = [...existingNames].filter((n) => n && !candidateNames.has(n))
  const newInCandidate = [...candidateNames].filter((n) => n && !existingNames.has(n))
  const matching = [...candidateNames].filter((n) => n && existingNames.has(n))
  return { missingInCandidate, newInCandidate, matching, compatible: missingInCandidate.length === 0 }
}

async function applyReplacement(newModule, options = { retainMatches: false }) {
  if (!newModule) return
  const retain = !!options.retainMatches
  let finalPorts = []
  if (retain && Array.isArray(newModule.ports)) {
    const existingByKey = {}
    for (const p of props.data.ports || []) {
      const key = p.name || p.variable || ""
      if (key) existingByKey[key] = p
    }
    finalPorts = (newModule.ports || []).map((p) => {
      const key = p.name || p.variable || ""
      if (key && existingByKey[key]) return existingByKey[key]
      return { name: p.name || key || `port_${Math.random().toString(36).slice(2, 8)}`, type: p.type || "left", ...p }
    })
  } else {
    finalPorts = (newModule.ports || []).map((p, i) => ({ name: p.name || `port_${i}`, type: p.type || "left", ...p }))
  }

  const newData = {
    ...props.data,
    name: newModule.name ?? props.data.name,
    domainType: newModule.domainType ?? props.data.domainType,
    ports: finalPorts,
    moduleType: newModule.moduleType ?? newModule.type ?? props.data.moduleType,
  }

  updateNodeData(props.id, newData)
  await nextTick()
  updateNodeInternals(props.id)
  emit("module-replaced", { nodeId: props.id, newModule, retained: retain })
}

defineExpose({ applyReplacement, compareCompatibility })

</script>

<style scoped>
.module-node {
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  position: relative;
  width: 100%;
  height: 100%;
}

.module-node.selected {
  /* Use the Element Plus primary color for the border */
  border-color: #409eff;

  /* Add a "focus ring" glow using the primary color */
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.4);
}

.module-card {
  pointer-events: none;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.module-name {
  pointer-events: none;
  font-weight: bold;
  text-overflow: ellipsis;
  overflow: hidden;
  cursor: pointer;
  margin-bottom: 4px;
}

div.module-name,
.module-button {
  pointer-events: auto;
}

.button-group {
  padding-top: 4px;
  display: flex;
  gap: 10px;
}

.title {
  background: #f9f9f9;
  font-weight: bold;
  padding: 8px;
  border-bottom: 1px solid #eee;
  border-radius: 8px 8px 0 0;
}

.module-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.module-label {
  margin-bottom: 4px;
  font-size: 11px;
  color: #6b7280;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  user-select: none;
}

.context-menu {
  position: fixed;
  z-index: 10000;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 6px;
  box-shadow: 0 6px 18px rgba(0,0,0,0.12);
  min-width: 180px;
  padding: 6px 0;
}

.context-menu-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.context-menu-list li {
  padding: 8px 12px;
  cursor: pointer;
  font-size: 13px;
}

.context-menu-list li:hover {
  background: #f5f7fa;
}

/* 
  This is needed to ensure the handle is 
  *above* the card's content, not just unclipped.
*/
:deep(.vue-flow__handle) {
  width: 10px;
  height: 10px;
  border: 2px solid #409eff;
  border-radius: 10px;
  background: #000000;
}

.domain-type-default.el-card {
  background-color: #ffffff;
}

.domain-type-compartment.el-card {
  background-color: #ffe7e1;
}

.domain-type-membrane.el-card {
  background-color: #ffe2ec;
}

.domain-type-process.el-card {
  background-color: #e1edff;
}

.domain-type-protein.el-card {
  background-color: #d1fff0;
}
</style>
