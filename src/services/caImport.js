import { useVueFlow, MarkerType } from "@vue-flow/core"
import { nextTick } from "vue"
import { ElNotification } from 'element-plus'
import { useBuilderStore } from '../stores/builderStore'

export function useLoadFromConfigFiles() {
    const { nodes, edges, addNodes, setViewport, addEdges } = useVueFlow()
    const PORT_SIDES = ["left", "right", "top", "bottom"]
    const usedPorts = new Map()
    const moduleLookup = new Map()
    const store = useBuilderStore()

    function checkCellMLModulesExist(modules) {
       
        // Check available modules in the store
        store.availableModules.forEach(file => {
        const filename = file.filename

        file.modules.forEach(module => {
            const key = `${module.name}::${filename}`
            moduleLookup.set(key, module)
        })
        })

        // Collect missing modules
        const missingModules = []

        console.log(moduleLookup)
        modules.forEach(module => {
        const key = `${module.module_type}::${module.module_file}`
            if (!moduleLookup.has(key)) {
                missingModules.push(key)
            }
        })

        if (missingModules.length > 0) {
            console.warn("Missing modules:", missingModules)
            return false
        }

    return true
    }

    function randomPortSide() {
        return PORT_SIDES[Math.floor(Math.random() * PORT_SIDES.length)]
    }

    function nextUnusedPort(node, sidePriority) {
        const used = usedPorts.get(node.id) ?? []

        const port = node.data.ports.find(
            p => sidePriority.includes(p.type) && !used.includes(p.uid)
        )

        if (!port) return null

        used.push(port.uid)
        usedPorts.set(node.id, used)

        return port
    }

    function buildPorts(vessel) {
        const ports = []

        if (vessel.inp_vessels) {
            vessel.inp_vessels.split(" ").forEach(name => {
            ports.push({
                uid: crypto.randomUUID(),
                type: randomPortSide(),
                name
            })
            })
        }

        if (vessel.out_vessels) {
            vessel.out_vessels.split(" ").forEach(name => {
            ports.push({
                uid: crypto.randomUUID(),
                type: randomPortSide(),
                name
            })
            })
        }

    return ports
    }

    // get handle id for a given port
    function getHandleId(port) {
        return `port_${port.type}_${port.uid}`
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

            // Build nodes from configFiles data
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

            // create look up table for nodes
            const nodeByName = new Map(
                newNodes.map(node => [node.data.name, node])
            )

            // Add new nodes to the flow
            addNodes(newNodes)

            await nextTick()

            // Add edges from configFiles data
            const newEdges = []

            configFiles.vesselArray.forEach(vessel => {
            if (!vessel.out_vessels) return

            const sourceNode = nodeByName.get(vessel.name)
            if (!sourceNode) return

            vessel.out_vessels.split(" ").forEach(targetName => {
                const targetNode = nodeByName.get(targetName)
                if (!targetNode) return

                const sourcePort = nextUnusedPort(
                    sourceNode,
                    ["right", "bottom", "top", "left"]
                )

                const targetPort = nextUnusedPort(
                    targetNode,
                    ["left", "top", "bottom", "right"]
                )

                if (!targetPort) return

                newEdges.push({
                id: `e_${sourceNode.id}_${targetNode.id}_${crypto.randomUUID()}`,
                source: sourceNode.id,
                target: targetNode.id,
                sourceHandle: getHandleId(sourcePort),
                targetHandle: getHandleId(targetPort),
                type: 'smoothstep',
                markerEnd: MarkerType.ArrowClosed,
                })
            })
            })

            addEdges(newEdges)

            // Populate the port definitions and labels on each module



    } catch (error) {
        ElNotification.error(`Failed to load workflow: ${error.message}`)
    }
    }
        
    return { loadFromConfigFiles }
}

