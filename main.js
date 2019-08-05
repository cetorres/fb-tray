const {app, BrowserWindow, Menu, Notification, ipcMain, dialog, shell, Tray} = require('electron')
const path = require('path')
const Store = require('./store.js')
const assetsDirectory = path.join(__dirname, 'assets')

let tray = undefined
let window = undefined
let contextMenu = undefined
let newNotification = false
let silentNotification = false
const minWindowSize = { width: 380, height: 680 }

// Don't show the app in the doc
app.dock.hide()

// User preferences
const store = new Store({
  configName: 'user-preferences',
  defaults: {
    alwaysOnTop: false,
    openWindowOnStart: true,
    openAppOnStartUp: false,
    windowBounds: minWindowSize,
    silentNotification: false
  }
})

app.on('ready', () => {
  createTray()
  createWindow()
  setAppAutoLaunch()
})

// Quit the app when the window is closed
app.on('window-all-closed', () => {
  app.quit()
})

const setAppAutoLaunch = () => {
  const openAppOnStartUp = store.get('openAppOnStartUp')
  const appFolder = path.dirname(process.execPath)
  const exeName = path.basename(process.execPath)

  app.setLoginItemSettings({
    openAtLogin: openAppOnStartUp,
    path: appFolder,
    args: [
      '--processStart', `"${exeName}"`,
      '--process-start-args', `"--hidden"`
    ]
  })
}

const createTray = () => {
  tray = new Tray(path.join(assetsDirectory, 'iconTemplate.png'))
  tray.on('right-click', showMenu)
  tray.on('double-click', toggleWindow)
  tray.on('click', function (event) {
    toggleWindow()
  })

  var alwaysOnTop = store.get('alwaysOnTop')
  var openWindowOnStart = store.get('openWindowOnStart')
  var openAppOnStartUp = store.get('openAppOnStartUp')
  silentNotification = store.get('silentNotification')

  contextMenu = Menu.buildFromTemplate([
    {
      label: 'Always on top', type: 'checkbox', checked: alwaysOnTop, click: function (menuItem, browserWindow, event) {
        alwaysOnTop = !alwaysOnTop
        store.set('alwaysOnTop', alwaysOnTop)
        menuItem.checked = alwaysOnTop
        window.setAlwaysOnTop(alwaysOnTop)
      }
    },
    {
      label: 'Show window on start', type: 'checkbox', checked: openWindowOnStart, click: function (menuItem, browserWindow, event) {
        openWindowOnStart = !openWindowOnStart
        store.set('openWindowOnStart', openWindowOnStart)
        menuItem.checked = openWindowOnStart
      }
    },
    {
      label: 'Launch at login', type: 'checkbox', checked: openAppOnStartUp, click: function (menuItem, browserWindow, event) {
        openAppOnStartUp = !openAppOnStartUp
        store.set('openAppOnStartUp', openAppOnStartUp)
        menuItem.checked = openAppOnStartUp
        setAppAutoLaunch()
      }
    },
    {
      label: 'Silent notifications', type: 'checkbox', checked: silentNotification, click: function (menuItem, browserWindow, event) {
        silentNotification = !silentNotification
        store.set('silentNotification', silentNotification)
        menuItem.checked = silentNotification
      }
    },
    { label: 'Reset window size', click: function () {
        resetWindowSize()
      }
    },
    { type: 'separator' },
    { label: 'About', click: function () {
          const options = {
            type: 'info',
            buttons: ['Close', 'Visit Website'],
            defaultId: 0,
            title: 'About fb-tray',
            message: `fb-tray ${app.getVersion()}`,
            detail: 'Facebook on your icon tray.\nCopyright (c) 2019 Carlos E. Torres'
          }
          dialog.showMessageBox(null, options, (response) => {
            if (response == 1) {
              shell.openExternal('https://cetorres.com')
            }
          })
      }
    },
    { label: 'Quit', click: function () {
        window.close()
      }
    }
  ])

}

const showMenu = () => {
  tray.popUpContextMenu(contextMenu)
}

const getWindowPosition = () => {
  const windowBounds = window.getBounds()
  const trayBounds = tray.getBounds()

  // Center window horizontally below the tray icon
  const x = Math.round(trayBounds.x + (trayBounds.width / 2) - (windowBounds.width / 2))
  const y = Math.round(trayBounds.y + trayBounds.height)

  return {x: x, y: y}
}

const createWindow = () => {
  let { width, height } = store.get('windowBounds')
  let alwaysOnTop = store.get('alwaysOnTop')
  let openWindowOnStart = store.get('openWindowOnStart')

  window = new BrowserWindow({
    alwaysOnTop: alwaysOnTop,
    width: width,
    height: height,
    minWidth: minWindowSize.width,
    minHeight: minWindowSize.height,
    show: false,
    frame: false,
    movable: false,
    fullscreenable: false,
    resizable: true,
    transparent: true,
    webPreferences: {
      nodeIntegration: true,
      backgroundThrottling: true,
      webviewTag: true,
      preload: path.join(__dirname, 'preload.js')
    }
  })
  window.loadURL(`file://${path.join(__dirname, 'index.html')}`)

  // Save window size
  window.on('resize', () => {
    let { width, height } = window.getBounds()
    store.set('windowBounds', { width, height })

    const position = getWindowPosition()
    window.setPosition(position.x, position.y, false)
  })

  // Hide the window when it loses focus
  window.on('blur', () => {
    let alwaysOnTop = store.get('alwaysOnTop')

    if (!window.webContents.isDevToolsOpened()) {
      if (!alwaysOnTop)
        window.hide()
    }
  })

  // On window ready
  window.once('ready-to-show', () => {
    if (openWindowOnStart) {
      showWindow()
    }
  })

  // window.openDevTools({mode: 'detach'})
}

const changeTrayIcon = () => {
  if (!newNotification) {
    tray.setImage(path.join(assetsDirectory, 'iconTemplate.png'))
  }
  else {
    tray.setImage(path.join(assetsDirectory, 'iconOrange.png'))
  }
}

const toggleWindow = () => {
  if (window.isVisible()) {
    window.hide()
  } else {
    if (newNotification) {
      window.webContents.send('show-notification-page')
      newNotification = false
    }
    showWindow()
  }
  changeTrayIcon()
}

const showWindow = () => {
  const position = getWindowPosition()
  window.setPosition(position.x, position.y, false)
  window.show()
  window.focus()
}

const resetWindowSize = () => {
  store.set('windowBounds', minWindowSize)
  window.setSize(minWindowSize.width, minWindowSize.height, false)
  showWindow()
}

ipcMain.on('show-window', () => {
  showWindow()
})

ipcMain.on('show-menu', () => {
  showMenu()
})

ipcMain.on('console-log', (event, message) => {
  console.log(message)
})

ipcMain.on('show-notification', (event, number) => {
  newNotification = true
  changeTrayIcon()
  let s = parseInt(number) > 1 ? 's' : ''
  let not = new Notification({
    title: 'fb-tray',
    subtitle: 'Facebook',
    body: `You have ${number} new notification${s}.`,
    silent: silentNotification,
    sound: 'Hero'
  }).addListener('click', () => {
    window.webContents.send('show-notification-page')
    showWindow()
    newNotification = false
    changeTrayIcon()
  }).show()
})
