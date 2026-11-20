/* eslint global-require: off, no-console: off */

import path from 'path';
import fs from 'fs';
import { app, BrowserWindow, shell, Menu, Tray } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import { registerIpcHandlers } from './main/ipcHandlers';

export default class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

let mainWindow: BrowserWindow | null = null;
let tray = null;

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

if (
  process.env.NODE_ENV === 'development' ||
  process.env.DEBUG_PROD === 'true'
) {
  app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');
}

const installExtensions = async () => {
  if (!process.env.UPGRADE_EXTENSIONS) return;
  try {
    const installer = require('electron-devtools-installer');
    const extensions = ['REACT_DEVELOPER_TOOLS'];

    await installer.default(
      extensions.map((name) => installer[name]),
      true
    );
  } catch (err: unknown) {
    console.warn(
      'Notice: React Developer Tools extension could not be downloaded/installed:',
      (err as Error)?.message || err
    );
  }
};

const createWindow = async () => {
  if (
    process.env.NODE_ENV === 'development' ||
    process.env.DEBUG_PROD === 'true'
  ) {
    await installExtensions();
  }

  const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../assets');

  const getAssetPath = (...paths: string[]): string => {
    return path.join(RESOURCES_PATH, ...paths);
  };

  const trayMenu: Electron.Menu = Menu.buildFromTemplate([
    {
      label: 'Show App',
      click() {
        mainWindow.show();
      },
    },
    {
      label: 'Quit',
      click() {
        mainWindow.close();
      },
    },
  ]);

  const h = 500;
  let w = 400;
  const icon = getAssetPath('icon.png');
  const webPreferences = {
    nodeIntegration: false,
    contextIsolation: true,
    preload: path.join(__dirname, 'preload.js'),
  };

  if (process.env.NODE_ENV === 'production') {
    mainWindow = new BrowserWindow({
      show: false,
      width: w,
      minWidth: w,
      maxWidth: w,
      height: h,
      maxHeight: h,
      minHeight: h,
      icon,
      webPreferences,
    });
  } else {
    w = 1000;
    mainWindow = new BrowserWindow({
      show: false,
      width: w,
      minWidth: w,
      maxWidth: w,
      height: h,
      maxHeight: h,
      minHeight: h,
      icon,
      webPreferences,
    });
  }

  if (
    process.env.NODE_ENV === 'development' ||
    process.env.DEBUG_PROD === 'true'
  ) {
    mainWindow.webContents.openDevTools();
  }

  if (process.env.NODE_ENV === 'development') {
    const loadDevUrl = () => {
      if (!mainWindow) return;
      mainWindow.loadURL('http://localhost:3000').catch(() => {
        setTimeout(loadDevUrl, 1000);
      });
    };
    loadDevUrl();
  } else {
    const prodPath = path.join(__dirname, '../dist/renderer/index.html');
    const fallbackPath = path.join(__dirname, 'index.html');
    const indexPath = fs.existsSync(prodPath) ? prodPath : fallbackPath;
    mainWindow.loadURL(`file://${indexPath}`);
  }

  // @TODO: Use 'ready-to-show' event
  //        https://github.com/electron/electron/blob/master/docs/api/browser-window.md#using-ready-to-show-event
  mainWindow.webContents.on('did-finish-load', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  mainWindow.on('minimize', () => {
    if (tray) {
      mainWindow.hide();
    }
    tray = new Tray(getAssetPath('icon.png'));

    tray.on('double-click', () => {
      mainWindow.show();
    });

    tray.setContextMenu(trayMenu);
    tray.setToolTip(app.name || 'microsoft-teams-instances-manager');
    mainWindow.hide();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.removeMenu();

  // Open urls in the user's browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Remove this if your app does not use auto updates
  // eslint-disable-next-line
  new AppUpdater();
};

/**
 * Add event listeners...
 */

app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app
  .whenReady()
  .then(() => {
    registerIpcHandlers();
    return createWindow();
  })
  .catch(console.log);

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) createWindow();
});

function sendStatusToWindow(text) {
  log.info(text);
  mainWindow.webContents.send('message', text);
}

autoUpdater.on('checking-for-update', () => {
  sendStatusToWindow('Checking for update...');
});
autoUpdater.on('update-available', () => {
  sendStatusToWindow('Update available.');
});
autoUpdater.on('update-not-available', () => {
  sendStatusToWindow('Update not available.');
});
autoUpdater.on('error', (err) => {
  sendStatusToWindow(`Error in auto-updater. ${err}`);
});
autoUpdater.on('download-progress', (progressObj) => {
  let logMessage = `Download speed: ${progressObj.bytesPerSecond}`;
  logMessage = `${logMessage} - Downloaded ${progressObj.percent}%`;
  logMessage = `${logMessage} (${progressObj.transferred}/${progressObj.total})`;
  sendStatusToWindow(logMessage);
});
autoUpdater.on('update-downloaded', () => {
  sendStatusToWindow('Update downloaded');
});
