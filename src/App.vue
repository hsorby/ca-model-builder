<template>
  <el-container style="height: 100vh">
    <el-header class="app-header">
      <h3>Model Builder</h3>
      <div class="file-uploads">
        <el-upload
          action="#"
          :auto-upload="false"
          :on-change="handleModuleFile"
          :show-file-list="false"
        >
          <el-button :disabled="libcellml.status !== 'ready'" type="primary"
            >Load Modules</el-button
          >
        </el-upload>
        <el-upload
          action="#"
          :auto-upload="false"
          :on-change="handleUnitsFile"
          :show-file-list="false"
          style="margin-left: 10px"
        >
          <el-button :disabled="libcellml.status !== 'ready'" type="primary"
            >Load Units</el-button
          >
        </el-upload>
      </div>
    </el-header>

    <el-container style="flex-grow: 1; min-height: 0">
      <el-aside width="250px" class="module-aside">
        <h4 style="margin-top: 0">Available Modules</h4>
        <ModuleList />
      </el-aside>

      <el-main class="workbench-main">
        <div class="dnd-flow" @drop="onDrop">
          <VueFlow
            :nodes="nodes"
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
                @open-port-dialog="onOpenPortDialog"
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
  <AddPortDialog
    v-model="addPortDialogVisible"
    :existing-ports="currentEditingNode.ports"
    @confirm="onAddPortConfirm" 
  />
</template>

<script setup>
import { inject, nextTick, onMounted, ref } from "vue"
import { ElNotification } from "element-plus"
import { VueFlow, useVueFlow } from "@vue-flow/core"
import { MiniMap } from "@vue-flow/minimap"

import { useBuilderStore } from "./stores/builderStore"
import ModuleList from "./components/ModuleList.vue"
import Workbench from "./components/WorkbenchArea.vue"
import ModuleNode from "./components/ModuleNode.vue"
import useDragAndDrop from "./composables/useDnD"
import AddPortDialog from "./components/AddPortDialog.vue"

const { addEdges, onConnect, updateNodeData, updateNodeInternals } = useVueFlow()

const { onDragOver, onDrop, onDragLeave, isDragOver } = useDragAndDrop()

const nodes = ref([])

onConnect(addEdges)

import testModuleContent from "./assets/bg_modules.cellml?raw"

const store = useBuilderStore()

const libcellmlReadyPromise = inject("$libcellml_ready")
const libcellml = inject("$libcellml")
const addPortDialogVisible = ref(false)
const currentEditingNode = ref({ nodeId: null, ports: [] })

function onOpenPortDialog(eventPayload) {
  // Store which node we're editing
  currentEditingNode.value = {
    nodeId: eventPayload.nodeId,
    ports: eventPayload.ports
  }
  // Open the dialog
  addPortDialogVisible.value = true
}

async function onAddPortConfirm(portToAdd) {
  const nodeId = currentEditingNode.value.nodeId
  if (!nodeId) return

  // Get the node's current data (we could also get this from the store)
  const node = nodes.value.find(n => n.id === nodeId)
  if (!node) return

  const newPortsArray = [
    ...node.data.ports,
    portToAdd
  ]

  console.log('Adding port:', portToAdd, 'to node:', nodeId)
  // Update the node's data in the main state
  updateNodeData(nodeId, { ports: newPortsArray })

  // Wait for Vue to update the DOM
  await nextTick()

  // Tell Vue Flow to re-scan the node
  updateNodeInternals(nodeId)
  
  // (Dialog closes itself via v-model)
}

function processModuleData(cellmlString) {
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
      // Add other properties as needed
    })
    comp.delete()
  }
  store.setAvailableModules(data)

  return { type: "success", model, data }
}

const handleModuleFile = (file) => {
  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      try {
        const result = processModuleData(e.target.result)
        if (result.type !== "success") {
          if (result.issues) {
            ElNotification({
              title: "Error",
              message: `${result.issues.length} issues found in model file.`,
              type: "error",
            })
            console.error("Model import issues:", result.issues)
            return
          }
        } else {
          result.model.delete()
        }
      } catch (err) {
        console.error("Error parsing file:", err)
        ElNotification({
          title: "Error",
          message: "Failed to parse module file as CellML.",
          type: "error",
        })
        return
      }
      // Call the store action to set the modules
      // store.setAvailableModules(data)
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

const handleUnitsFile = (file) => {
  // ... similar logic for your units file
  console.log("Units file loaded (logic TBD):", file.name)
  // e.g., store.setUnits(parsedData);
}

const finiteTranslateExtent = [
  [-1000, -1000],
  [1000, 1000],
]

// --- Development Test Data ---
onMounted(async () => {
  // import.meta.env.DEV is a Vite variable that is true
  // only when running 'yarn dev'
  if (import.meta.env.DEVOFF) {
    await libcellmlReadyPromise
    const result = processModuleData(testModuleContent)
    if (result.type !== "success") {
      throw new Error("Failed to process test module file.")
    } else {
      result.model.delete()
    }
    // You could do the same for your units file here
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
}

.workbench-main {
  position: relative; /* Crucial for positioning modules */
  background-color: #f4f4f5;
  overflow: hidden; /* Prevent scrolling for this demo */
  padding: 0;
}

.vue-flow__edge-path {
  stroke-width: 5px; /* <-- Change this value as you like */
}

/* (Optional) You can also make selected edges stand out 
*/
.vue-flow__edge.selected .vue-flow__edge-path {
  stroke: #409eff; /* Element Plus primary color */
  stroke-width: 7px;
}
</style>
