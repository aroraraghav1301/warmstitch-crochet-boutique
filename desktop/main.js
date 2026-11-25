const { app, BrowserWindow, shell } = require("electron");
const path = require("path");

const SITE = "https://warmstitch-boutique.vercel.app";

function isExternal(url) {
  return /^(upi|tel|mailto|whatsapp|intent):/i.test(url);
}

app.setAppUserModelId("com.warmstitch.boutique");

function createWindow() {
  const win = new BrowserWindow({
    width: 1180,
    height: 820,
    minWidth: 420,
    minHeight: 620,
    title: "WarmStitch",
    icon: path.join(__dirname, "icon.ico"),
    autoHideMenuBar: true,
    backgroundColor: "#FAF7F2",
    webPreferences: {
      partition: "persist:warmstitch",
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadURL(SITE);

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  win.webContents.on("will-navigate", (event, url) => {
    if (isExternal(url)) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  return win;
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => app.quit());
