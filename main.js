'use strict';

// Import modules
const electron = require('electron');
const windowStateKeeper = require('electron-window-state');
const app = electron.app;
const BrowserWindow = electron.BrowserWindow;

// Load environmental variables
require('dotenv').load();

if (process.env.NODE_ENV === 'development') {
  let hotReloadServer = require('hot-reload-server');
  let webpackConfig = require('./webpack.config.dev');
  hotReloadServer(webpackConfig, {
    publicPath: '/dist'
  }).start();
}

// Create a variable to hold the window
let mainWindow = null;


// TBD
//var win32 = process.platform === 'win32';

/*if (win32) {
  var winColor = require('windows-titlebar-color');
  console.log(winColor)
}*/



app.on('ready', function() {
  let mainWindowState = windowStateKeeper({
    defaultWidth: 1280,
    defaultHeight: 1024
  });
  // creates a new browser window
  mainWindow = new BrowserWindow({
    icon: './app/assets/images/n-48.png',
    x: mainWindowState.x,
    y: mainWindowState.y,
    width: mainWindowState.width,
    height: mainWindowState.height,
    frame: true,
    show: false,
    resizable: true,
  });
  mainWindowState.manage(mainWindow);
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.show();
  });
  // load the file
  if (process.env.NODE_ENV === 'production') {
    mainWindow.loadURL('file://' + __dirname + '/index_prod.html');
  } else {
    mainWindow.loadURL('file://' + __dirname + '/index.html');
  }
  
  // Register window events
  mainWindow.on('closed', function() {
    mainWindow.destroy();
    app.quit();
  });
  mainWindow.once('ready-to-show', () => {
    mainWindow.focus();
  });
  electron.Menu.setApplicationMenu(null);
});