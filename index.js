const {ipcRenderer, shell} = require('electron')

var pageTitle = ""

onload = () => {
  webview = document.getElementById('webview')
  webview2 = document.getElementById('webview2')

  webview.addEventListener('new-window', async (e) => {
    const protocol = require('url').parse(e.url).protocol
    if (protocol === 'http:' || protocol === 'https:') {
      await shell.openExternal(e.url)
    }
  })

  // Detect new notifications by the page title, e.g. (1) Facebook - means 1 new notification
  webview2.addEventListener("page-title-updated", (e) => {
    if (e.title.includes('(') && pageTitle != e.title && pageTitle != "" && e.title != "Facebook") {
      let re = /\((.*)\)/
      let notificationNumber = e.title.match(re)[1]
      // Show notification
      ipcRenderer.send('show-notification', notificationNumber)
    }
    pageTitle = e.title.trim()
  })

  document.addEventListener('DOMContentLoaded', updateContent)
}

// Buttons clicks
document.querySelector('.js-home-action').addEventListener('click', (event) => {
  webview.loadURL('https://m.facebook.com/')
})
document.querySelector('.js-back-action').addEventListener('click', (event) => {
  webview.goBack()
})
document.querySelector('.js-forward-action').addEventListener('click', (event) => {
  webview.goForward()
})
document.querySelector('.js-refresh-action').addEventListener('click', (event) => {
  updateContent()
})
document.querySelector('.js-openout-action').addEventListener('click', async (event) => {
  var url = webview.getURL()
  url = url.replace('//m.', '//')
  await shell.openExternal(url)
})
document.querySelector('.js-settings-action').addEventListener('click', (event) => {
  ipcRenderer.send('show-menu')
})
document.querySelector('.js-quit-action').addEventListener('click', (event) => {
  window.close()
})

ipcRenderer.on('show-notification-page', () => {
  webview.loadURL('https://m.facebook.com/notifications.php?no_hist=1')
})

const updateContent = () => {
  webview.reloadIgnoringCache()
}

const checkNotifications = () => {
  webview2.reloadIgnoringCache()
}

// Check for notifications every 2 minutes
const time = 2 * 60 * 1000
setInterval(checkNotifications, time)