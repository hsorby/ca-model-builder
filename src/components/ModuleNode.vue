<template>
  <div
    class="module-node"
    :id="id"
    ref="moduleNode"
    :class="{ selected: selected }"
    @contextmenu.stop.prevent="openContextMenu"
    @mousedown.capture="StopDrag"
  >
    <NodeResizer min-width="180" min-height="105" :is-visible="selected" />

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
      <div v-if="data.label" class="module-label">{{ data.label }}</div>
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

        <el-button
          size="small"
          circle
          @click="openEditDialog"
          class="module-button"
        >
          <el-icon><Edit /></el-icon>
        </el-button>
      </div>
    </el-card>

    <template v-for="port in data.ports" :key="port.uid" class="port">
      <el-tooltip
        class="box-item"
        effect="dark"
        :content="port.name"
        placement="bottom"
        :show-after="1000"
      >
        <Handle
          :id="'port_' + port.type + '_' + port.uid"
          :ref="'handle_' + port.type + '_' + port.uid"
          type="source"
          :position="portPosition(port.type)"
          :style="getHandleStyle(port)"
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
            @click.stop="removePort(port.uid)"
          />
        </template>
      </el-tooltip>
    </template>
    <!-- context menu -->
    <teleport to="body">
      <div
        v-if="contextMenuVisible"
        ref="contextMenu"
        class="context-menu"
        :style="{ top: contextMenuY + 'px', left: contextMenuX + 'px' }"
        @click.stop
      >
        <ul class="context-menu-list">
          <li @click="openReplacementDialog('replace')">Replace module</li>
        </ul>
      </div>
    </teleport>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onBeforeUnmount, ref } from 'vue'
import { Handle, Position, useVueFlow } from '@vue-flow/core'
import { NodeResizer } from '@vue-flow/node-resizer'
import { Delete, Edit, Key, Place } from '@element-plus/icons-vue'
import { useFlowHistoryStore } from '../stores/historyStore'

const { addEdges, edges, removeEdges, updateNodeData, updateNodeInternals } =
  useVueFlow()
const historyStore = useFlowHistoryStore()

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

const emit = defineEmits(['open-edit-dialog', 'open-replacement-dialog'])

const moduleNode = ref(null)

async function openEditDialog() {
  emit('open-edit-dialog', {
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
    : 'domain-type-default'
})

function portPosition(type) {
  switch (type) {
    case 'left':
      return Position.Left
    case 'right':
      return Position.Right
    case 'top':
      return Position.Top
    case 'bottom':
      return Position.Bottom
    default:
      return Position.Left
  }
}

function handleSetDomainType(typeCommand) {
  const newType = typeCommand === 'undefined' ? undefined : typeCommand
  updateNodeData(props.id, { domainType: newType })
}

function getHandleStyle(port) {
  const portsOfSameType = props.data.ports.filter((p) => p.type === port.type)
  const n = portsOfSameType.length

  // Space between each port.
  const portSpacing = 16
  const positionIndex = portsOfSameType.findIndex((p) => p.uid === port.uid)

  // guard: if not found, fall back to 0
  const safeIndex = positionIndex === -1 ? 0 : positionIndex

  // This calculates the offset from the center
  const offset = portSpacing * (positionIndex - (n - 1) / 2)

  if (['top', 'bottom'].includes(port.type)) {
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

const applyPorts = async (portsToSet) => {
  updateNodeData(props.id, { ports: portsToSet })

  // Changing ports adds/removes handles, so we MUST refresh internals
  await nextTick()
  updateNodeInternals(props.id)
}

async function removePort(portIdToRemove) {
  const oldPorts = JSON.parse(JSON.stringify(props.data.ports))

  const port = oldPorts.find((p) => p.uid === portIdToRemove)
  if (!port) return

  const handleId = `port_${port.type}_${port.uid}`

  // Find all edges connected to this specific port handle.
  // We need to snapshot these edge objects so we can restore them later
  const connectedEdges = edges.value.filter(
    (edge) =>
      (edge.source === props.id && edge.sourceHandle === handleId) ||
      (edge.target === props.id && edge.targetHandle === handleId)
  )

  const edgesSnapshot = connectedEdges.map((edge) =>
    JSON.parse(JSON.stringify(edge))
  )

  // Define New Ports (for Redo)
  const newPorts = props.data.ports.filter((p) => p.uid !== portIdToRemove)

  // Add Composite Command to History
  historyStore.executeAndAddCommand({
    type: 'remove-port',
    undo: async () => {
      // Restore the port first (so the handle exists in the DOM).
      await applyPorts(oldPorts)

      // Then, restore the edges.
      if (edgesSnapshot.length > 0) {
        addEdges(edgesSnapshot)
      }
    },
    redo: async () => {
      // Remove the edges.
      if (edgesSnapshot.length > 0) {
        removeEdges(edgesSnapshot.map((e) => e.id))
      }

      // Then, remove the port
      await applyPorts(newPorts)
    },
  })
}

const addPort = async (portToAdd) => {
  const oldPorts = [...props.data.ports]
  // create stable node id
  const newPort = {
    ...portToAdd,
    uid: crypto.randomUUID(),
  }

  // Create a new array with the old ports + the new one
  const newPorts = [...props.data.ports, newPort]

  // Tell Vue Flow to update this node's data
  // This will cause the component to re-render
  await applyPorts(newPorts)

  historyStore.addCommand({
    type: 'add-port',
    undo: async () => {
      applyPorts(oldPorts)
    },
    redo: async () => {
      applyPorts(newPorts)
    },
  })
}

const isEditing = ref(false)
const editingName = ref('')
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

function StopDrag(event) {
  if (isEditing.value) {
    event.stopPropagation()
  }
}

// This is triggered by pressing Enter or clicking away
function saveEdit() {
  if (!editingName.value || editingName.value.trim() === '') {
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

const moduleListClickEl = ref(null)

function onDocumentPointerDown(event) {
  // If the pointer down is inside the context menu, do nothing
  const path = event.composedPath ? event.composedPath() : event.path || []
  const cm = document.querySelector('.context-menu')
  if (cm && path.includes(cm)) return
  closeContextMenu()
}

function removeMenuOpenListeners() {
  document.removeEventListener('click', closeContextMenu)
  document.removeEventListener('pointerdown', onDocumentPointerDown, true)
  document.removeEventListener('dragstart', closeContextMenu)
  if (moduleListClickEl.value) {
    moduleListClickEl.value.removeEventListener('click', closeContextMenu)
    moduleListClickEl.value = null
  }
}

function closeContextMenu() {
  contextMenuVisible.value = false
  removeMenuOpenListeners()
}

onMounted(() => {
  document.addEventListener('module-context-open', handleExternalContextOpen)
  document.addEventListener('contextmenu', handleDocumentContextmenu)
})

onBeforeUnmount(() => {
  document.removeEventListener('module-context-open', handleExternalContextOpen)
  document.removeEventListener('contextmenu', handleDocumentContextmenu)
  removeMenuOpenListeners()
})

async function openContextMenu(event) {
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

  await nextTick()

  // close when clicking elsewhere and pointer down/drag start
  document.addEventListener('click', closeContextMenu)
  document.addEventListener('dragstart', closeContextMenu)
  document.addEventListener('pointerdown', onDocumentPointerDown, true)
}

async function openReplacementDialog() {
  emit('open-replacement-dialog', {
    nodeId: props.id,
    nodeData: props.data,
    name: props.data.name,
    portOptions: props.data.portOptions,
    portLabels: props.data.portLabels,
  })
  closeContextMenu()
}

// Close when another module opens a context menu or when right-click happens outside this node
function handleExternalContextOpen(e) {
  const openId = e?.detail?.nodeId ?? null
  if (openId !== props.id) {
    closeContextMenu()
  }
}

function handleDocumentContextmenu(e) {
  // If the right-click target is not inside this module node, close the menu.
  if (!moduleNode.value) return
  const path = e.composedPath ? e.composedPath() : e.path || []
  if (!path.includes(moduleNode.value)) {
    closeContextMenu()
  }
}
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
  pointer-events: auto;
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
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.12);
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
