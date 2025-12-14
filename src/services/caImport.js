import { useVueFlow } from "@vue-flow/core"
import { nextTick } from "vue"
import { ElNotification } from 'element-plus'

export function useLoadFromConfigFiles() {
    const { nodes, edges, addNodes, setViewport } = useVueFlow()

    const PORT_SIDES = ["left", "right", "top", "bottom"]
    
    function checkCellMLModulesExist(modules) {
        // For now, we assume all modules exist.
        return true
    }

    function randomPortSide() {
        return PORT_SIDES[Math.floor(Math.random() * PORT_SIDES.length)]
    }

    function buildPorts(vessel) {
        const ports = []

        if (vessel.inp_vessels) {
            vessel.inp_vessels.split(" ").forEach(name => {
            ports.push({
                uid: crypto.randomUUID(),
                type: randomPortSide(),
                label: name,
            })
            })
        }

        if (vessel.out_vessels) {
            vessel.out_vessels.split(" ").forEach(name => {
            ports.push({
                uid: crypto.randomUUID(),
                type: randomPortSide(),
                label: name,
            })
            })
        }

    return ports
    }


    async function loadFromConfigFiles(configFiles) {

        await nextTick()

        try {
            // Ensure CellML modules are present within the module store
            if (!checkCellMLModulesExist(configFiles.moduleConfig)) {
                throw new Error("One or more CellML modules are missing from the module store.")
            }

            // Clear existing flow
            nodes.value = []
            edges.value = []
            setViewport({ x: 0, y: 0, zoom: 1 })

            let idCounter = 0

            //const compLabel = moduleData.componentName 
            //const filePart = moduleData.sourceFile 
            //const label = filePart ? `${compLabel} — ${filePart}` : compLabel

            // Build nodes and connections from configFiles data
            const newNodes = configFiles.vesselArray.map((vessel, index) => ({
                id: `dndnode_${idCounter++}`,
                type: "moduleNode",
                position: { x: index * 200, y: 100 }, 
                data: {
                    ...vessel,
                    name: vessel.name,
                    label: vessel.name,
                    ports: buildPorts(vessel),
                },
            }))

            // Add new nodes to the flow
            addNodes(newNodes)

        } catch (error) {
            ElNotification.error(`Failed to load workflow: ${error.message}`)
        }
        }
        
    return { loadFromConfigFiles }
}

