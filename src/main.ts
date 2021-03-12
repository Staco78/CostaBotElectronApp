import { app, BrowserWindow, dialog, Menu, session, Tray, ipcMain } from "electron";
import { Settings } from "./utils";
import config from "./config.json";
import os from "os";
import keytar from "keytar";
import request from "request";
import { join as pathJoin } from "path";
import { lookup as DnsLookup } from "dns";
import fs from "fs";

let settings: Settings = JSON.parse(fs.readFileSync(pathJoin(__dirname + "/../settings.json")) as any);

const keytarService = "costabot-electron-oauth";
const keytarAccount = os.userInfo().username;

app.on("window-all-closed", () => { });
let startingWindow: BrowserWindow | undefined | null;
let tray: Tray | null = null;
let started: boolean = false;
let menu: Menu | undefined;

app.on("ready", () => showStartingWindow());
checkInternet((internetConnection: boolean) => {
  if (internetConnection) start();
  else {
    if (startingWindow) startingWindow.destroy();
    dialog.showErrorBox(
      "Pas de connection Internet",
      "Veuillez vous connecter à Internet pour lancer l'application !"
    );
    app.quit();
  }
  tray = new Tray(pathJoin(__dirname + "/../static/assets/logo.ico"));
  menu = Menu.buildFromTemplate([
    { label: "Montrer", click: () => start(), enabled: false },
    { label: "Fermer", role: "quit" },
  ]);
  tray.setContextMenu(menu);
});

async function start() {
  if (settings.stayConnect) {
    let token = await keytar.getPassword(keytarService, keytarAccount);
    if (app.isReady()) {
      createAuthWindow(token);
    } else
      app.on("ready", () => {
        createAuthWindow(token);
      });
  } else {
    if (app.isReady()) {
      createAuthWindow(null);
    } else
      app.on("ready", () => {
        createAuthWindow(null);
      });
  }
}

async function showStartingWindow() {
  await app.whenReady();
  startingWindow = new BrowserWindow({
    height: 400,
    width: 250,
    frame: false,
    closable: false,
    resizable: false,
    backgroundColor: "#202124",
    titleBarStyle: "hidden",
    autoHideMenuBar: true,
  });
  startingWindow.loadFile(pathJoin(__dirname + "/loading.html"));
  startingWindow.show();
}

function createAuthWindow(token: string | null): void {
  if (token) {
    request(
      {
        uri: `${config.discordApi}/users/@me`,
        headers: {
          Authorization: "Bearer " + token,
        },
        method: "GET",
      },
      (err, res) => {
        if (startingWindow) startingWindow.destroy();
        startingWindow = null;
        if (err) throw err;
        res.body = JSON.parse(res.body);
        if (res.body.message === "401: Unauthorized") showAuthWindow();
        else createMainWindow();
      }
    );
  } else showAuthWindow();
}

function showAuthWindow(): void {
  let win = new BrowserWindow({
    icon: pathJoin(__dirname + "/../static/assets/img/logo.ico"),
  });
  win.webContents.openDevTools();
  win.loadURL(config.discordConnection.redirectUrl);
  let { session } = win.webContents;
  session.webRequest.onBeforeRequest(
    { urls: ["http://localhost:1111/redirect*"] },
    ({ url }) => {
      let { access_token } = getUrlData(url);
      if (settings.stayConnect)
        keytar.setPassword(keytarService, keytarAccount, access_token);
      createMainWindow();
      win.destroy();
    }
  );
  if (startingWindow) startingWindow.destroy();
  startingWindow = null;
  win.show();
}

async function createMainWindow(): Promise<void> {
  if (startingWindow) startingWindow.destroy();
  startingWindow = null;
  if (menu)
    if (menu.items.find((i) => i.label === "Montrer"))
      //@ts-ignore
      menu.items.find((i) => i.label === "Montrer").enabled = false;
  if (started) return;
  started = true;
  await session.defaultSession.loadExtension(
    pathJoin(__dirname, "../react-extension"),
    { allowFileAccess: true }
  );
  let win = new BrowserWindow({
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
    },
    icon: pathJoin(__dirname + "/../static/assets/logo.ico"),
    autoHideMenuBar: true,
    darkTheme: true,
    backgroundColor: "#202124",
    title: "CostaBot",
  });
  win.on("close", () => {
    if (win.webContents.isDevToolsOpened()) {
      win.webContents.closeDevTools();
    }
  });
  win.on("closed", () => {
    started = false;
    if (menu)
      if (menu.items.find((i) => i.label === "Montrer"))
        //@ts-ignore
        menu.items.find((i) => i.label === "Montrer").enabled = true;
  });
  win.webContents.openDevTools();
  win.loadFile(pathJoin(__dirname + "/index.html"));
}

function getUrlData(url: string): any {
  url = url.split("#")[1];
  let x = url.split("&");
  (x as any) = x.map((a) => a.split("="));
  let r: any = {};
  x.forEach((a) => {
    r[a[0]] = a[1];
  });
  return r;
}

function checkInternet(cb: CallableFunction) {
  DnsLookup("google.com", (err: any) => {
    if (err && err.code == "ENOTFOUND") {
      cb(false);
    } else {
      cb(true);
    }
  });
}


ipcMain.on("reloadSettings", () => {
  settings = JSON.parse(fs.readFileSync(pathJoin(__dirname + "/../settings.json")) as any);
  if (!settings.stayConnect)
    keytar.deletePassword(keytarService, keytarAccount);
});

ipcMain.on("deletePassword", () => {
  keytar.deletePassword(keytarService, keytarAccount);
});