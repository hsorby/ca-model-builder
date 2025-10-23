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
            :translate-extent="finiteTranslateExtent"
            :max-zoom="1.5"
            :min-zoom="0.8"
          >
            <MiniMap />
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

  <SaveDialog v-model="saveDialogVisible" @confirm="onSaveConfirm" />
  <SaveDialog
    v-model="exportDialogVisible"
    @confirm="onExportConfirm"
    title="Export for Circulatory Autogen"
    suffix=".zip"
  />
</template>

<script setup>
import { computed, inject, onMounted, ref } from "vue"
import { ElNotification } from "element-plus"
import { VueFlow, useVueFlow } from "@vue-flow/core"
import { DCaret } from "@element-plus/icons-vue"
import { MiniMap } from "@vue-flow/minimap"
import Papa from "papaparse"

import { useBuilderStore } from "./stores/builderStore"
import ModuleList from "./components/ModuleList.vue"
import Workbench from "./components/WorkbenchArea.vue"
import ModuleNode from "./components/ModuleNode.vue"
import useDragAndDrop from "./composables/useDnD"
import EditModuleDialog from "./components/EditModuleDialog.vue"
import SaveDialog from "./components/SaveDialog.vue"
import { generateExportZip } from "./services/caExport"

const {
  addEdges,
  edges,
  nodes,
  onConnect,
  setViewport,
  updateNodeData,
  viewport,
} = useVueFlow()

const { onDragOver, onDrop, onDragLeave, isDragOver } = useDragAndDrop()

onConnect(addEdges)

import testModuleBGContent from "./assets/bg_modules.cellml?raw"
import testModuleColonContent from "./assets/colon_FTU_modules.cellml?raw"
import testParamertersCSV from "./assets/colon_FTU_parameters.csv?raw"

const testData = {
  filename: "colon_FTU_modules.cellml",
  content: testModuleColonContent,
}

const store = useBuilderStore()

const libcellmlReadyPromise = inject("$libcellml_ready")
const libcellml = inject("$libcellml")
const editDialogVisible = ref(false)
const saveDialogVisible = ref(false)
const exportDialogVisible = ref(false)
const currentEditingNode = ref({ nodeId: "", ports: [], name: "" })
const asideWidth = ref(250)

const allNodeNames = computed(() => nodes.value.map((n) => n.data.name))
const exportAvailable = computed(
  () => nodes.value.length > 0 && store.parameterData.length > 0
)

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
          description: "Failed to parse model.  Reason:" + err.message,
        },
      ],
      type: "parser",
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

    return { issues: errors, type: "parser" }
  }

  parser.delete()
  printer.delete()

  let data = []
  for (i = 0; i < model.componentCount(); i++) {
    let comp = model.componentByIndex(i)
    let options = []
    for (let j = 0; j < comp.variableCount(); j++) {
      let varr = comp.variableByIndex(j)
      if (varr.interfaceType() === "public") {
        options.push({
          name: varr.name(),
          // Add other properties as needed
        })
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
  return { type: "success", data }
}

const handleModuleFile = (file) => {
  const filename = file.name
  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      try {
        const result = processModuleData(e.target.result, filename)
        if (result.type !== "success") {
          if (result.issues) {
            ElNotification({
              title: "Error",
              message: `${result.issues.length} issues found in model file.`,
              type: "error",
            })
            console.error("Model import issues:", result.issues)
          }
          return
        }
        store.addModuleFile({
          filename: filename,
          modules: result.data,
        })
      } catch (err) {
        console.error("Error parsing file:", err)
        ElNotification({
          title: "Error",
          message: "Failed to parse module file as CellML.",
          type: "error",
        })
        return
      }
    } catch (error) {
      console.error("Error parsing module file:", error)
      ElNotification({
        title: "Error",
        message: "An error occurred while processing the module file.",
        type: "error",
      })
    }
  }
  reader.readAsText(file.raw)
}

const handleParametersFile = (file) => {
  if (!file) {
    ElNotification.error("No file selected.")
    return
  }

  Papa.parse(file.raw, {
    header: true, // Converts row 1 to object keys
    skipEmptyLines: true,

    complete: (results) => {
      // results.data will be an array of objects
      // e.g., [{ param_name: 'a', value: '1' }, { param_name: 'b', value: '2' }]
      store.setParameterData(results.data)

      ElNotification.success({
        title: "Parameters Loaded",
        message: `Loaded ${results.data.length} parameters from ${file.name}.`,
        offset: 50,
      })
    },

    error: (err) => {
      ElNotification.error({
        title: "CSV Parse Error",
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
    title: "Exporting...",
    message: "Generating and zipping files.",
    type: "info",
    duration: 0, // Stays open until closed
  })

  try {
    const zipBlob = await generateExportZip(
      fileName,
      nodes.value,
      edges.value,
      store.parameterData
    )

    if (!import.meta.env.DEVOFF) {
      const link = document.createElement("a")
      link.href = URL.createObjectURL(zipBlob)
      link.download = `${fileName}.zip`
      link.click()

      URL.revokeObjectURL(link.href)
    }
    notification.close()
    ElNotification.success({message: "Export successful!", offset: 50 });
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
  const finalName = fileName.endsWith(".json") ? fileName : `${fileName}.json`

  // (This is your old logic, moved here)
  const saveState = {
    flow: {
      nodes: nodes.value,
      edges: edges.value,
      viewport: viewport.value,
    },
    store: {
      availableModules: store.availableModules,
      parameterData: store.parameterData,
    },
  }

  const jsonString = JSON.stringify(saveState, null, 2)
  const blob = new Blob([jsonString], { type: "application/json" })
  const url = URL.createObjectURL(blob)

  const link = document.createElement("a")
  link.href = url
  link.download = finalName // Use the user's chosen name
  link.click()

  URL.revokeObjectURL(url)

  ElNotification.success({message: "Workflow saved!", offset: 50 });
}

/**
 * Reads a JSON file and restores the application state.
 */
function handleLoadWorkflow(file) {
  const reader = new FileReader()

  reader.onload = (e) => {
    try {
      const loadedState = JSON.parse(e.target.result)

      // Validate the loaded file
      if (!loadedState.flow || !loadedState.store) {
        throw new Error("Invalid workflow file format.")
      }

      // Restore Vue Flow state
      // We use `setViewport` to apply zoom/pan
      setViewport(loadedState.flow.viewport)
      // We directly set the reactive refs
      nodes.value = loadedState.flow.nodes
      edges.value = loadedState.flow.edges

      // Restore Pinia store state
      store.availableModules = loadedState.store.availableModules
      store.parameterData = loadedState.store.parameterData

      ElNotification.success({message: "Workflow loaded successfully!", offset: 50 });
    } catch (error) {
      ElNotification.error(`Failed to load workflow: ${error.message}`)
    }
  }

  reader.readAsText(file.raw)
}

const finiteTranslateExtent = [
  [-1000, -1000],
  [1000, 1000],
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
  window.removeEventListener("mousemove", onResizing)
  window.removeEventListener("mouseup", stopResize)
  // Re-enable text selection
  document.body.style.userSelect = ""
}

// This function is called on mousedown
const startResize = (event) => {
  event.preventDefault()

  // Add the listeners to the entire window
  window.addEventListener("mousemove", onResizing)
  window.addEventListener("mouseup", stopResize)
  // Disable text selection globally while dragging
  document.body.style.userSelect = "none"
}

// --- Development Test Data ---
onMounted(async () => {
  // import.meta.env.DEV is a Vite variable that is true
  // only when running 'yarn dev'
  if (import.meta.env.DEV) {
    await libcellmlReadyPromise
    handleParametersFile({ raw: testParamertersCSV })
    const result = processModuleData(testData.content, testData.filename)
    if (result.type !== "success") {
      throw new Error("Failed to process test module file.")
    } else {
      store.addModuleFile({
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
  font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
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
