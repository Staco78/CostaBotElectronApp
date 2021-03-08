import { app, BrowserWindow, ipcMain, session } from "electron";
import config from "./config.json";
import os from "os";
import keytar from "keytar";
import request from "request";
import { join as pathJoin } from "path";


const keytarService = "costabot-electron-oauth";
const keytarAccount = os.userInfo().username;

let actualWindow: undefined | BrowserWindow;

(async () => {
  let token = await keytar.getPassword(keytarService, keytarAccount);
  if (app.isReady()) {
    createAuthWindow(token);
  } else
    app.on("ready", () => {
      createAuthWindow(token);
    });
})();

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
        if (err) throw err;

        if (JSON.parse(res.body).message === "401: Unauthorized")
          showAuthWindow();
        else createMainWindow();
      }
    );
  } else createMainWindow();
}

function showAuthWindow(): void {
  let win = new BrowserWindow();
  win.webContents.openDevTools();
  win.loadURL(config.discordConnection.redirectUrl);
  let { session } = win.webContents;
  session.webRequest.onBeforeRequest(
    { urls: ["http://localhost:1111/redirect*"] },
    ({ url }) => {
      let { access_token } = getUrlData(url);
      keytar.setPassword(keytarService, keytarAccount, access_token);
      createMainWindow();
      win.destroy();
    }
  );
  win.show();
  actualWindow = win;

}

async function createMainWindow(): Promise<void> {
  await session.defaultSession.loadExtension(
    pathJoin(__dirname, '../react-extension'),
    { allowFileAccess: true }
  )
  let win = new BrowserWindow({
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    frame: false,
    titleBarStyle: "hidden",
    autoHideMenuBar: true,
    darkTheme: true,
    backgroundColor: "#202124",
  });
  win.webContents.openDevTools();
  win.loadFile("index.html");
  actualWindow = win;
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


ipcMain.on("maximize", () => {
  if (actualWindow) {
    if (actualWindow.isMaximized())
      actualWindow.unmaximize();
    else
      actualWindow.maximize();
  }
});

ipcMain.on("minimize", () => {
  if (actualWindow)
    actualWindow.minimize();
});