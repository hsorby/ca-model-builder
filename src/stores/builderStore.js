import { defineStore } from 'pinia'
import { ref, computed }from 'vue'

// 'builder' is the store's ID
export const useBuilderStore = defineStore('builder', () => {
  // --- STATE ---
  
  // Holds the *definitions* loaded from your file
  const availableModules = ref([]); 
  
  // Holds the *instances* of modules placed on the workbench
  // We'll add x/y coordinates and a unique ID
  const workbenchModules = ref([]);

  // Holds the connections between module ports
  const connections = ref([]);

  // (You'll also add your 'units' data here)
  const units = ref(null);


  // --- ACTIONS ---

  /**
   * Called after you parse your module definition file.
   * @param {Array} modules - The array of module objects.
   */
  function setAvailableModules(modules) {
    availableModules.value = modules;
  }

  /**
   * Adds a new file and its modules to the list.
   * If the file already exists, it will be replaced.
   */
  function addModuleFile(payload) {
    // payload is { filename: 'moduleFileA.cellml', modules: [...] }
    const existingFile = this.availableModules.find(
      (f) => f.filename === payload.filename
    )

    if (existingFile) {
      // Replace existing file's modules
      existingFile.modules = payload.modules
    } else {
      // Add new file to the list
      this.availableModules.push(payload)
    }
  }

  /**
   * Called when a module is dropped onto the workbench.
   * @param {string} moduleName - The name of the module to add.
   * @param {object} position - { x, y } coordinates from the drop event.
   */
  function addModuleToWorkbench(moduleName, position) {
    // Find the base definition
    const moduleDef = availableModules.value.find(m => m.name === moduleName);
    
    if (moduleDef) {
      // Create a new *instance* for the workbench
      const newModuleInstance = {
        ...moduleDef, // Copy properties like name, ports
        id: `instance_${Date.now()}`, // Give it a unique ID
        x: position.x,
        y: position.y,
      };
      
      workbenchModules.value.push(newModuleInstance);
      console.log("Added to workbench:", newModuleInstance);
    }
  }
  
  /**
   * Called when a module is dragged *on* the workbench.
   * @param {string} moduleId - The unique ID of the module instance.
   * @param {object} position - The new { x, y } coordinates.
   */
  function moveModule(moduleId, position) {
    const module = workbenchModules.value.find(m => m.id === moduleId);
    if (module) {
      module.x = position.x;
      module.y = position.y;
    }
  }
  
  // --- GETTERS (computed) ---
  // (We don't need any yet, but they would go here)


  return {
    // State
    availableModules,
    workbenchModules,
    connections,
    units,

    // Actions
    addModuleFile,
    setAvailableModules,
    addModuleToWorkbench,
    moveModule
  }
})
