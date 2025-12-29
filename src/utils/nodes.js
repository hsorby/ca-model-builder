export function generateUniqueModuleName(moduleData, allNodes) {
const existingNames = new Set(allNodes.map((node) => node.data.name))
    let finalName = moduleData.name
    let counter = 1

    while (existingNames.has(finalName)) {
      finalName = `${moduleData.name}_${counter}`
      counter++
    }

    return finalName
  }
