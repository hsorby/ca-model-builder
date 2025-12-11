<template>
  <el-container style="height: 100vh">
    <el-header class="app-header">
      <h3>Circulatory Autogen Model Builder</h3>
      <div class="file-uploads">
        <div class="file-io-buttons">
          <el-upload
            action="#"
            :auto-upload="false"
            :on-change="handleModuleFile"
            :show-file-list="false"
          >
            <el-button :disabled="libcellml.status !== 'ready'" type="primary">
              Load Modules
            </el-button>
          </el-upload>
          <el-upload
            action="#"
            :auto-upload="false"
            :on-change="handleParametersFile"
            :show-file-list="false"
            style="margin-left: 10px"
          >
            <el-button :disabled="libcellml.status !== 'ready'" type="primary">
              Load Parameters
            </el-button>
          </el-upload>

          <el-divider direction="vertical" style="margin: 0 15px" />

          <el-button
            type="info"
            @click="handleUndo"
            style="margin-left: 10px"
            :disabled="!historyStore.canUndo"
          >
            Undo
          </el-button>
          <el-button
            type="info"
            @click="handleRedo"
            style="margin-left: 10px"
            :disabled="!historyStore.canRedo"
          >
            Redo
          </el-button>

          <el-divider direction="vertical" style="margin: 0 15px" />

          <el-upload
            action="#"
            :auto-upload="false"
            :on-change="handleLoadWorkflow"
            :show-file-list="false"
            accept=".json"
          >
            <el-button type="success">Load Model</el-button>
          </el-upload>

          <el-button
            type="success"
            @click="handleSaveWorkflow"
            style="margin-left: 10px"
          >
            Save Model
          </el-button>

          <el-divider direction="vertical" style="margin: 0 15px" />

          <el-button
            type="info"
            @click="handleExport"
            style="margin-left: 10px"
            :disabled="!exportAvailable"
          >
            Export Model
          </el-button>
        </div>
      </div>
    </el-header>

    <el-container style="flex-grow: 1; min-height: 0">
      <el-aside :width="asideWidth + 'px'" class="module-aside">
        <h4 style="margin-top: 0">Available Modules</h4>
        <ModuleList />
      </el-aside>

      <div class="resize-handle" @mousedown="startResize">
        <el-icon class="handle-icon"><DCaret /></el-icon>
      </div>

      <el-main class="workbench-main">
        <div class="dnd-flow" @drop="onDrop">
          <VueFlow
            @dragover="onDragOver"
            @dragleave="onDragLeave"
            @nodes-change="onNodeChange"
            @edges-change="onEdgeChange"
            @node-drag-start="onNodeDragStart"
            @node-drag-stop="onNodeDragStop"
            :translate-extent="finiteTranslateExtent"
            :max-zoom="1.5"
            :min-zoom="0.3"
            :connection-line-options="connectionLineOptions"
          >
            <MiniMap :pannable="true" :zoomable="true" />
            <Controls />
            <template #node-moduleNode="props">
              <ModuleNode
                :id="props.id"
                :data="props.data"
                :selected="props.selected"
                @open-edit-dialog="onOpenEditDialog"
              />
            </template>
            <Workbench>
              <p v-if="isDragOver">Drop here</p>
            </Workbench>
          </VueFlow>
        </div>
      </el-main>
    </el-container>
  </el-container>

  <EditModuleDialog
    v-model="editDialogVisible"
    :initial-name="currentEditingNode.name"
    :node-id="currentEditingNode.nodeId"
    :existing-names="allNodeNames"
    :port-options="currentEditingNode?.portOptions || []"
    :initial-port-labels="currentEditingNode?.portLabels || []"
    @confirm="onEditConfirm"
  />

  <SaveDialog
    v-model="saveDialogVisible"
    @confirm="onSaveConfirm"
    :default-name="builderStore.lastSaveName"
  />
  <SaveDialog
    v-model="exportDialogVisible"
    @confirm="onExportConfirm"
    title="Export for Circulatory Autogen"
    :default-name="builderStore.lastExportName"
    suffix=".zip"
  />
</template>

<script setup>
import { computed, inject, nextTick, onMounted, ref } from 'vue'
import { ElNotification } from 'element-plus'
import { MarkerType, useVueFlow, VueFlow } from '@vue-flow/core'
import { DCaret } from '@element-plus/icons-vue'
import { Controls } from '@vue-flow/controls'
import { MiniMap } from '@vue-flow/minimap'
import Papa from 'papaparse'

import { useBuilderStore } from './stores/builderStore'
import { useFlowHistoryStore } from './stores/flowHistory'
import ModuleList from './components/ModuleList.vue'
import Workbench from './components/WorkbenchArea.vue'
import ModuleNode from './components/ModuleNode.vue'
import useDragAndDrop from './composables/useDnD'
import EditModuleDialog from './components/EditModuleDialog.vue'
import SaveDialog from './components/SaveDialog.vue'
import { generateExportZip } from './services/caExport'

const {
  addEdges,
  addNodes,
  applyNodeChanges,
  applyEdgeChanges,
  edges,
  findNode,
  fromObject,
  nodes,
  onConnect,
  removeEdges,
  removeNodes,
  setViewport,
  toObject,
  updateNodeData,
} = useVueFlow()

const pendingHistoryNodes = new Set()

const { onDragOver, onDrop, onDragLeave, isDragOver } =
  useDragAndDrop(pendingHistoryNodes)
const historyStore = useFlowHistoryStore()

import testModuleBGContent from './assets/bg_modules.cellml?raw'
import testModuleColonContent from './assets/colon_FTU_modules.cellml?raw'
import testParamertersCSV from './assets/colon_FTU_parameters.csv?raw'
import { no } from 'element-plus/es/locales.mjs'

const testData = {
  filename: 'colon_FTU_modules.cellml',
  content: testModuleColonContent,
}

const builderStore = useBuilderStore()

const libcellmlReadyPromise = inject('$libcellml_ready')
const libcellml = inject('$libcellml')
const editDialogVisible = ref(false)
const saveDialogVisible = ref(false)
const exportDialogVisible = ref(false)
const currentEditingNode = ref({ nodeId: '', ports: [], name: '' })
const asideWidth = ref(250)
const connectionLineOptions = ref({
  type: 'smoothstep',
  markerEnd: MarkerType.ArrowClosed,
  style: {
    strokeWidth: 5,
    // stroke: '#b1b1b7', // Can customize color if desired.
  },
})

const allNodeNames = computed(() => nodes.value.map((n) => n.data.name))
const exportAvailable = computed(
  () => nodes.value.length > 0 && builderStore.parameterData.length > 0
)

let dragStartPos = { x: 0, y: 0 }

const onNodeDragStart = (event) => {
  // Store the initial position
  dragStartPos = { ...event.node.position }
}

const onNodeDragStop = (event) => {
  const node = event.node
  const start = { ...dragStartPos }
  const end = { ...node.position }
}

onConnect((connection) => {
  // Match what we specify in connectionLineOptions.
  const newEdge = {
    ...connection,
    type: 'smoothstep',
    markerEnd: MarkerType.ArrowClosed,
  }

  addEdges(newEdge)

  // historyStore.addCommand({
  //   redo: () => addEdges(connection),
  //   undo: () => removeEdges(connection.id), // Vue Flow auto-generates IDs if not provided, ensure you handle IDs
  // })
})

const movementBuffer = new Map()
let movementTimeout = null
const DEBOUNCE_MS = 500

const extractNodeData = (node) => {
  return {
    id: node.id,
    type: node.type,
    position: { ...node.position },
    data: { ...node.data },
    dimensions: { ...node.dimensions },
    selected: node.selected,
  }
}

const snapshotNode = (change) => {
  if (change.type === 'add') {
    // For added nodes, snapshot is the node itself
    return extractNodeData(change.item)
  }

  const node = findNode(change.id)
  if (!node) return null

  // Create a deep copy to break reactivity references
  return extractNodeData(node)
}

/**
 * Flushes pending movement changes to the history stack.
 * We call this when the timer expires OR if a different event interrupts the drag.
 */
const flushPositionChanges = () => {
  if (movementBuffer.size === 0) return

  const undoSnapshots = []
  const redoSnapshots = []

  // Build the snapshots
  for (const [id, startSnapshot] of movementBuffer.entries()) {
    const endSnapshot = snapshotNode({ id })

    // Only record if it actually moved
    if (
      (endSnapshot &&
        (startSnapshot.position.x !== endSnapshot.position.x ||
          startSnapshot.position.y !== endSnapshot.position.y)) ||
      startSnapshot.dimensions.width !== endSnapshot.dimensions.width ||
      startSnapshot.dimensions.height !== endSnapshot.dimensions.height
    ) {
      undoSnapshots.push(startSnapshot)
      redoSnapshots.push(endSnapshot)
    }
  }

  // Create the Command
  if (undoSnapshots.length > 0) {
    historyStore.addCommand({
      type: 'move',
      undo: () => {
        // Restore all nodes in this batch to start positions
        undoSnapshots.forEach((snap) => {
          const node = findNode(snap.id)
          if (node) {
            node.position = snap.position
            node.dimensions = snap.dimensions
          }
        })
      },
      redo: () => {
        // Restore all nodes in this batch to end positions
        redoSnapshots.forEach((snap) => {
          const node = findNode(snap.id)
          if (node) {
            node.position = snap.position
            node.dimensions = snap.dimensions
          }
        })
      },
    })
  }

  // Reset
  movementBuffer.clear()
  movementTimeout = null
}

const processSingleChange = (change) => {
  if (change.type === 'add') {
    historyStore.lastChangeWasAddSetter(true)
    const node = snapshotNode(change)
    historyStore.addCommand({
      type: 'add',
      offset: 'not-applied',
      undo: () => removeNodes(node.id),
      redo: () => addNodes(node),
    })
  } else if (change.type === 'remove') {
    const snap = snapshotNode(change)
    if (snap) {
      historyStore.addCommand({
        type: 'remove',
        undo: () => addNodes(snap),
        redo: () => removeNodes(snap.id),
      })
    }
  } else {
    if (change.type === 'select') {
      // Ignore selection changes for history.
    } else {
      console.log('Unhandled non-debouncable change type:', change.type)
      console.log(change)
    }
  }
}

const processNonDebouncableChanges = (changes) => {
  if (changes.length === 1) {
    const change = changes[0]
    processSingleChange(change)
  }
}

const onNodeChange = (changes) => {
  if (historyStore.isUndoRedoing) {
    // If we are currently undoing/redoing, bypass history tracking
    return applyNodeChanges(changes)
  }

  const debouncableChanges = []
  const nonDebouncableChanges = []

  changes.forEach((c) => {
    if (c.type === 'position' && c.position) {
      debouncableChanges.push(c)
    } else if (c.type === 'dimensions' && c.dimensions) {
      if (historyStore.lastChangeWasAdd) {
        historyStore.lastChangeWasAddSetter(false)
        if (!historyStore.lastCommandHadOffsetApplied) {
          const node = snapshotNode(c)
          node.position = {
            x: node.position.x - node.dimensions.width / 2,
            y: node.position.y - node.dimensions.height / 2,
          }
          historyStore.replaceLastCommand({
            type: 'add',
            offset: 'applied',
            undo: () => removeNodes(node.id),
            redo: () => addNodes(node),
          })
        }
      } else {
        debouncableChanges.push(c)
      }
    } else {
      nonDebouncableChanges.push(c)
    }
  })

  // --- HANDLER A: Position Changes (Debounced) ---
  if (debouncableChanges.length > 0) {
    // Clear existing timer
    if (movementTimeout) {
      clearTimeout(movementTimeout)
    }

    // Capture the "Start" state if we haven't yet for this specific drag session
    debouncableChanges.forEach((change) => {
      if (!movementBuffer.has(change.id)) {
        // We snapshot BEFORE the change is applied by Vue Flow logic?
        // Actually, onNodesChange fires BEFORE changes are applied.
        // So findNode currently returns the OLD position. Perfect.
        const snap = snapshotNode(change)
        if (snap) {
          movementBuffer.set(change.id, snap)
        }
      }
    })

    // Set a timer to finalize the move if no more events come in
    movementTimeout = setTimeout(flushPositionChanges, DEBOUNCE_MS)
  }

  // --- HANDLER B: Other Changes (Immediate) ---
  if (nonDebouncableChanges.length > 0) {
    // CRITICAL: If we were dragging and suddenly deleted the node (or did something else),
    // we must flush the drag history FIRST so the sequence is correct.
    if (movementTimeout) {
      clearTimeout(movementTimeout)
      flushPositionChanges()
    }

    processNonDebouncableChanges(nonDebouncableChanges)
    // processNonPositionBatch(nonDebouncableChanges)
  }

  // Have Vue Flow update the graph
  applyNodeChanges(changes)
}

let lastEdgeChangeType = null
const onEdgeChange = (changes) => {
  const nextChanges = []
  changes.forEach((change) => {
    console.log('Edge change:', change.type, change)
    if (change.type === 'remove') {
      // Note: Finding edges by ID is harder in generic Vue Flow if you don't store them
      // But usually `changes` contains the ID.
      // You might need `findEdge` logic or access `edges.value` directly.
      const edge = edges.value.find((e) => e.id === change.id)

      if (edge) {
        const edgeSnapshot = { ...edge } // Shallow copy usually enough for edges
        historyStore.addCommand({
          redo: () => removeEdges(edgeSnapshot.id),
          undo: () => addEdges(edgeSnapshot),
        })
      }
      nextChanges.push(change)
    } else {
      nextChanges.push(change)
    }
  })
  applyEdgeChanges(nextChanges)
}

function onOpenEditDialog(eventPayload) {
  currentEditingNode.value = {
    ...eventPayload,
  }
  // Open the dialog
  editDialogVisible.value = true
}

async function onEditConfirm(updatedData) {
  const nodeId = currentEditingNode.value.nodeId
  if (!nodeId) return

  updateNodeData(nodeId, updatedData)
}

function processModuleData(cellmlString, fileName) {
  let parser = new libcellml.library.Parser(false)
  let printer = new libcellml.library.Printer()
  let model = null
  try {
    model = parser.parseModel(cellmlString)
  } catch (err) {
    parser.delete()
    printer.delete()

    return {
      issues: [
        {
          description: 'Failed to parse model.  Reason:' + err.message,
        },
      ],
      type: 'parser',
    }
  }

  let errors = []
  let i = 0
  if (parser.errorCount()) {
    while (i < parser.errorCount()) {
      let e = parser.error(i)
      errors.push({
        description: e.description(),
      })
      e.delete()
      i++
    }
    parser.delete()
    printer.delete()
    model.delete()

    return { issues: errors, type: 'parser' }
  }

  parser.delete()
  printer.delete()

  let data = []
  for (i = 0; i < model.componentCount(); i++) {
    let comp = model.componentByIndex(i)
    let options = []
    for (let j = 0; j < comp.variableCount(); j++) {
      let varr = comp.variableByIndex(j)
      if (
        varr.hasInterfaceType(libcellml.library.Variable.InterfaceType.PUBLIC)
      ) {
        let units = varr.units()
        options.push({
          name: varr.name(),
          units: units.name(),
        })
        units.delete()
      }
      varr.delete()
    }
    data.push({
      name: comp.name(),
      portOptions: options,
      ports: [],
      componentName: comp.name(),
      sourceFile: fileName,
    })
    comp.delete()
  }
  // store.setAvailableModules(data)

  model.delete()
  return { type: 'success', data }
}

const handleModuleFile = (file) => {
  const filename = file.name
  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      try {
        const result = processModuleData(e.target.result, filename)
        if (result.type !== 'success') {
          if (result.issues) {
            ElNotification({
              title: 'Error',
              message: `${result.issues.length} issues found in model file.`,
              type: 'error',
            })
            console.error('Model import issues:', result.issues)
          }
          return
        }
        builderStore.addModuleFile({
          filename: filename,
          modules: result.data,
        })
      } catch (err) {
        console.error('Error parsing file:', err)
        ElNotification({
          title: 'Error',
          message: 'Failed to parse module file as CellML.',
          type: 'error',
        })
        return
      }
    } catch (error) {
      console.error('Error parsing module file:', error)
      ElNotification({
        title: 'Error',
        message: 'An error occurred while processing the module file.',
        type: 'error',
      })
    }
  }
  reader.readAsText(file.raw)
}

const handleParametersFile = (file) => {
  if (!file) {
    ElNotification.error('No file selected.')
    return
  }

  Papa.parse(file.raw, {
    header: true, // Converts row 1 to object keys
    skipEmptyLines: true,

    complete: (results) => {
      // results.data will be an array of objects
      // e.g., [{ param_name: 'a', value: '1' }, { param_name: 'b', value: '2' }]
      builderStore.setParameterData(results.data)

      ElNotification.success({
        title: 'Parameters Loaded',
        message: `Loaded ${results.data.length} parameters from ${file.name}.`,
        offset: 50,
      })
    },

    error: (err) => {
      ElNotification.error({
        title: 'CSV Parse Error',
        message: err.message,
      })
    },
  })
}

function handleSaveWorkflow() {
  saveDialogVisible.value = true
}

function handleExport() {
  exportDialogVisible.value = true
}

/**
 * Collects all state and processes it into a zip file for CA ingestion.
 */
async function onExportConfirm(fileName) {
  const notification = ElNotification({
    title: 'Exporting...',
    message: 'Generating and zipping files.',
    type: 'info',
    duration: 0, // Stays open until closed
  })

  try {
    const zipBlob = await generateExportZip(
      fileName,
      nodes.value,
      edges.value,
      builderStore.parameterData
    )

    if (!import.meta.env.DEVOFF) {
      const link = document.createElement('a')
      link.href = URL.createObjectURL(zipBlob)
      link.download = `${fileName}.zip`
      link.click()

      URL.revokeObjectURL(link.href)
    }
    builderStore.setLastExportName(fileName)
    notification.close()
    ElNotification.success({ message: 'Export successful!', offset: 50 })
  } catch (error) {
    notification.close()
    ElNotification.error(`Export failed: ${error.message}`)
  }
}

/**
 * Collects all state and downloads it as a JSON file.
 */
function onSaveConfirm(fileName) {
  // Ensure the filename ends with .json
  const finalName = fileName.endsWith('.json') ? fileName : `${fileName}.json`

  const saveState = {
    flow: toObject(),
    // flow: {
    //   nodes: nodes.value,
    //   edges: edges.value,
    //   viewport: viewport.value,
    // },
    store: {
      availableModules: builderStore.availableModules,
      parameterData: builderStore.parameterData,
    },
  }

  const jsonString = JSON.stringify(saveState, null, 2)
  const blob = new Blob([jsonString], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = finalName
  link.click()

  URL.revokeObjectURL(url)

  builderStore.setLastSaveName(fileName)
  ElNotification.success({ message: 'Workflow saved!', offset: 50 })
}

function mergeModules(newModules) {
  const moduleMap = new Map(
    builderStore.availableModules.map((mod) => [mod.filename, mod])
  )

  if (newModules) {
    for (const newModule of newModules) {
      if (newModule && newModule.filename) {
        // Safety check
        moduleMap.set(newModule.filename, newModule)
      }
    }
  }

  builderStore.availableModules = Array.from(moduleMap.values())
}
/**
 * Reads a JSON file and restores the application state.
 */
function handleLoadWorkflow(file) {
  const reader = new FileReader()

  reader.onload = async (e) => {
    try {
      const loadedState = JSON.parse(e.target.result)

      // Validate the loaded file
      if (!loadedState.flow || !loadedState.store) {
        throw new Error('Invalid workflow file format.')
      }

      // Clear the current Vue Flow state.
      nodes.value = []
      edges.value = []
      setViewport({ x: 0, y: 0, zoom: 1 }) // Reset viewport.
      // Clear the current parameter data.
      builderStore.parameterData = []

      await nextTick()

      // Restore Vue Flow state.
      // We use `setViewport` to apply zoom/pan.
      setViewport(loadedState.flow.viewport)
      // We directly set the reactive refs.
      fromObject(loadedState.flow)
      // nodes.value = loadedState.flow.nodes
      // edges.value = loadedState.flow.edges

      // Restore Pinia store state.
      builderStore.parameterData = loadedState.store.parameterData
      // Merge available modules.
      mergeModules(loadedState.store.availableModules)

      ElNotification.success({
        message: 'Workflow loaded successfully!',
        offset: 50,
      })
    } catch (error) {
      ElNotification.error(`Failed to load workflow: ${error.message}`)
    }
  }

  reader.readAsText(file.raw)
}

const handleUndo = () => {
  historyStore.undo()
}

const handleRedo = () => {
  historyStore.redo()
}

const finiteTranslateExtent = [
  [-2000, -2000],
  [2000, 2000],
]

const onResizing = (event) => {
  // Prevent default to stop text selection, etc.
  event.preventDefault()

  // Set the new width, but with constraints
  // (e.g., min 200px, max 500px)
  asideWidth.value = Math.max(200, Math.min(event.clientX, 500))
}

// This function removes the global listeners
const stopResize = () => {
  window.removeEventListener('mousemove', onResizing)
  window.removeEventListener('mouseup', stopResize)
  // Re-enable text selection
  document.body.style.userSelect = ''
}

// This function is called on mousedown
const startResize = (event) => {
  event.preventDefault()

  // Add the listeners to the entire window
  window.addEventListener('mousemove', onResizing)
  window.addEventListener('mouseup', stopResize)
  // Disable text selection globally while dragging
  document.body.style.userSelect = 'none'
}

// --- Development Test Data ---
onMounted(async () => {
  // import.meta.env.DEV is a Vite variable that is true
  // only when running 'yarn dev'
  if (import.meta.env.DEV) {
    await libcellmlReadyPromise
    handleParametersFile({ raw: testParamertersCSV })
    const result = processModuleData(testData.content, testData.filename)
    if (result.type !== 'success') {
      throw new Error('Failed to process test module file.')
    } else {
      builderStore.addModuleFile({
        filename: testData.filename,
        modules: result.data,
      })
    }
  }
})
</script>

<style>
/* Basic Styles */
body {
  margin: 0;
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
}

.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #dcdfe6;
}

.file-uploads {
  display: flex;
}

.module-aside {
  padding: 20px;
  border-right: 1px solid #dcdfe6;
  background-color: #fcfcfc;

  display: flex;
  flex-direction: column;

  flex-shrink: 0;
}

.workbench-main {
  position: relative;
  background-color: #f4f4f5;
  overflow: hidden;
  padding: 0;
}

.vue-flow__connection-path,
.vue-flow__edge-path {
  stroke-width: 5px;
}

/* (Optional) You can also make selected edges stand out 
*/
.vue-flow__edge.selected .vue-flow__edge-path {
  stroke: #409eff; /* Element Plus primary color */
  stroke-width: 7px;
}

.resize-handle {
  width: 5px;
  height: 100%;
  /* transform: translateY(50%); */
  cursor: col-resize;
  background-color: #f4f2f2;
  border-left: 1px solid #dcdfe6;
  border-right: 1px solid #dcdfe6;
  flex-shrink: 0;
  position: relative;
}

.resize-handle:hover {
  background-color: #e0e0e0;
}

.handle-icon {
  /* Center the icon */
  position: absolute;
  top: 50%;
  left: 50%;

  /* This does three things:
    1. translate(-50%, -50%): Moves the icon back by half its own size to perfectly center it.
    2. rotate(90deg): Rotates it to point left/right.
  */
  transform: translate(-53%, -50%) rotate(90deg);

  /* Style it */
  font-size: 26px;
  color: #434344; /* Element Plus secondary text color */
  z-index: 10;
}

.file-io-buttons {
  display: flex;
  align-items: center;
}
</style>
