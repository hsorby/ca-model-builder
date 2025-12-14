import { useVueFlow } from "@vue-flow/core"
import { nextTick } from "vue"
import { ElNotification } from 'element-plus'

export function useLoadFromConfigFiles() {
    const { nodes, edges, addNodes, setViewport } = useVueFlow()
    
    function checkCellMLModulesExist(modules) {
        // Placeholder function: In a real implementation, this would check the module store.
        // For now, we assume all modules exist.
        return true
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

