<template>
  <div
    class="module-node"
    :id="id"
    ref="moduleNode"
    :class="{ selected: selected }"
  >
    <el-card :class="[vesselTypeClass, 'module-card']" shadow="hover">
      <div class="module-name">
        {{ data.name }}
        <div class="button-group">
          <el-dropdown trigger="click" @command="handleSetVesselType">
            <el-button size="small" circle>
              <el-icon><Edit /></el-icon>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="artery">Artery</el-dropdown-item>
                <el-dropdown-item command="vein">Vein</el-dropdown-item>
                <el-dropdown-item command="capillary"
                  >Capillary</el-dropdown-item
                >
                <el-dropdown-item command="undefined" divided
                  >Reset to Default</el-dropdown-item
                >
              </el-dropdown-menu>
            </template>
          </el-dropdown>

          <el-button size="small" circle @click="openAddPortDialog">
            <el-icon><Plus /></el-icon>
          </el-button>
        </div>
      </div>
      <!-- <el-dropdown trigger="click" @command="handleAddPort">
        <el-button size="small" circle>
          <el-icon><Plus /></el-icon>
        </el-button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item
              v-for="port in knownPortOptions"
              :key="port.name"
              :command="port"
              :disabled="portExists(port.name)"
            >
              {{ port.name }} ({{ port.type }})
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div> -->
    </el-card>

    <template v-for="(port, index) in data.ports" :key="port.name" class="port">
      <el-tooltip
        class="box-item"
        effect="dark"
        :content="port.name"
        placement="bottom"
      >
        <Handle
          :id="port.name"
          :ref="'handle_' + port.name"
          :type="port.type === 'in' ? 'target' : 'source'"
          :position="port.type === 'in' ? Position.Left : Position.Right"
          :style="getHandleStyle(index, port)"
          class="port-handle"
        />
      </el-tooltip>
    </template>
  </div>
</template>

<script setup>
import { computed, nextTick, ref, useId } from "vue"
import { Handle, Position, useVueFlow } from "@vue-flow/core"
import { Edit, Plus } from "@element-plus/icons-vue"

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

const emit = defineEmits(["open-port-dialog"])

const id = useId()
const moduleNode = ref(null)

const knownPortOptions = [
  { name: "new_port_A", type: "in" },
  { name: "new_port_B", type: "out" },
  { name: "extra_input", type: "in" },
]

async function openAddPortDialog() {
  emit("open-port-dialog", {
    nodeId: props.id,
    ports: props.data.ports,
  })
}

const vesselTypeClass = computed(() => {
  return props.data.vesselType
    ? `vessel-type-${props.data.vesselType}`
    : "vessel-type-default"
})

function handleSetVesselType(typeCommand) {
  // If the command is the string "undefined", set the value to undefined
  const newType = typeCommand === "undefined" ? undefined : typeCommand
  console.log("Setting vessel type to:", newType)
  updateNodeData(props.id, { vesselType: newType })
}

const portExists = (portName) => {
  return props.data.ports.some((p) => p.name === portName)
}

const rightPortCount = computed(() => {
  return props.data.ports.filter((p) => p.type === "out").length
})

const leftPortCount = computed(() => {
  return props.data.ports.filter((p) => p.type === "in").length
})

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
  const n = port.type === "in" ? leftPortCount.value : rightPortCount.value
  // Space between each port.
  const portSpacing = 16
  const positionIndex = getPositionIndex(props.data.ports, index)

  return {
    top: `${
      portSpacing * (positionIndex - (n - 1) / 2) +
      moduleNode.value?.clientHeight / 2
    }px`,
  }
}

const handleAddPort = async (portToAdd) => {
  if (portExists(portToAdd.name)) {
    return // Don't add duplicates
  }

  // Create a new array with the old ports + the new one
  const newPortsArray = [...props.data.ports, portToAdd]

  // Tell Vue Flow to update this node's data
  // This will cause the component to re-render
  updateNodeData(props.id, { ports: newPortsArray })
  await nextTick()
  updateNodeInternals(props.id)
}
</script>

<style scoped>
.module-node {
  width: 180px;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  position: relative;
}
.module-node.selected {
  /* Use the Element Plus primary color for the border */
  border-color: #409eff;

  /* Add a "focus ring" glow using the primary color */
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.4);
}
.title {
  background: #f9f9f9;
  font-weight: bold;
  padding: 8px;
  border-bottom: 1px solid #eee;
  border-radius: 8px 8px 0 0;
}
.ports {
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.module-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.module-name {
  font-weight: bold;
}

.ports-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* This is still needed from the last step to ensure
  the handle is *above* the card's content, not just unclipped.
*/
:deep(.vue-flow__handle) {
  width: 10px;
  height: 10px;
  border: 2px solid #409eff;
  border-radius: 10px;
  background: #000000;
}

.vessel-type-default.el-card {
  background-color: #ffffff;
}

.vessel-type-artery.el-card {
  background-color: #f1f5fb;
}

.vessel-type-vein.el-card {
  background-color: #ffe7e1;
}

.vessel-type-capillary.el-card {
  background-color: #e9f5f1;
}
</style>
