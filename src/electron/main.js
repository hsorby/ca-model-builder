import { app, BrowserWindow } from "electron"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
// This variable will be set by vite-plugin-electron
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"]

function createWindow() {
  // Create the browser window.
  const win = new BrowserWindow({
    width: 1440,
    height: 1080,
    webPreferences: {
      // If you're using a preload script, specify it here
      // preload: path.join(__dirname, 'preload.js'),
    },
  })

  if (VITE_DEV_SERVER_URL) {
    // 1. Development: Load the Vite dev server URL
    win.loadURL(VITE_DEV_SERVER_URL)
    // Optional: Open dev tools
    win.webContents.openDevTools()
  } else {
    // 2. Production: Load the index.html file
    win.loadFile(path.join(__dirname, "..", "..", "dist", "index.html"))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.whenReady().then(createWindow)

// Quit when all windows are closed, except on macOS
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit()
  }
})
