import {
  app,
  BrowserWindow,
  dialog,
  Menu,
  session,
  Tray,
  ipcMain,
  Notification,
} from "electron";
import { Settings } from "./utils";
import config from "./config.json";
import os from "os";
import keytar from "keytar";
import request from "request";
import { join as pathJoin } from "path";
import { lookup as DnsLookup } from "dns";
import fs from "fs";
import WebSocket from "ws";
import ytdl from "ytdl-core";
import sanitize from "sanitize-filename";
import preStart from "./preStart";
import getAppdataPath from "appdata-path";
import { exec } from "child_process";

showStartingWindow();

const appDataPath = getAppdataPath("CostaBot");
const settingsPath = pathJoin(appDataPath + "/settings.json");

if (!fs.existsSync(appDataPath)) fs.mkdirSync(appDataPath, { recursive: true });

checkInternet((internetConnection: boolean) => {
  if (internetConnection) preStart(settingsPath).then(() => start());
  else {
    if (startingWindow) startingWindow.destroy();
    dialog.showErrorBox(
      "Pas de connection Internet",
      "Veuillez vous connecter à Internet pour lancer l'application !"
    );
    app.quit();
  }
  (async () => {
    await app.whenReady();
    tray = new Tray(pathJoin(__dirname + "/../static/assets/logo.ico"));
    menu = Menu.buildFromTemplate([
      { label: "Montrer", click: () => start(), enabled: false },
      { label: "Fermer", role: "quit" },
    ]);
    tray.setContextMenu(menu);
  })();
});

let settings: Settings;

const keytarService = "costabot-electron-oauth";
const keytarAccount = os.userInfo().username;

app.on("window-all-closed", () => {});
let startingWindow: BrowserWindow | undefined | null;
let tray: Tray | null = null;
let started: boolean = false;
let menu: Menu | undefined;

async function start() {
  settings = JSON.parse(fs.readFileSync(settingsPath) as any);
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
        else createMainWindow(res.body.id);
      }
    );
  } else showAuthWindow();
}

function showAuthWindow(): void {
  let win = new BrowserWindow({
    icon: pathJoin(__dirname + "/../static/assets/img/logo.ico"),
  });
  if (config.debug) win.webContents.openDevTools();
  win.loadURL(config.discordConnection.redirectUrl);
  let { session } = win.webContents;
  session.webRequest.onBeforeRequest(
    { urls: ["http://localhost:1111/redirect*"] },
    ({ url }) => {
      let { access_token } = getUrlData(url);
      if (settings.stayConnect)
        keytar.setPassword(keytarService, keytarAccount, access_token);
      request(
        {
          uri: `${config.discordApi}/users/@me`,
          headers: {
            Authorization: "Bearer " + access_token,
          },
          method: "GET",
        },
        (err, res) => {
          if (err) throw err;
          res.body = JSON.parse(res.body);
          createMainWindow(res.body.id);
        }
      );
      win.destroy();
    }
  );
  if (startingWindow) startingWindow.destroy();
  startingWindow = null;
  win.show();
  win.maximize();
}

async function createMainWindow(id: string): Promise<void> {
  app.on("window-all-closed", () => {
    new Notification({
      title: "Application en arrière plan",
      body: "L'application s'éxécute maintenant en arrière-plan",
      silent: true,
      icon: pathJoin(__dirname + "/../static/assets/logo.ico"),
      timeoutType: "default",
    }).show();
  });
  botConnection(id);
  if (startingWindow) startingWindow.destroy();
  startingWindow = null;
  if (menu)
    if (menu.items.find((i) => i.label === "Montrer"))
      //@ts-ignore
      menu.items.find((i) => i.label === "Montrer").enabled = false;
  if (started) return;
  started = true;

  if (config.debug)
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
  if (config.debug) win.webContents.openDevTools();
  win.loadFile(pathJoin(__dirname + "/index.html"));
  win.maximize();
}

async function botConnection(id: string) {
  let ws = new WebSocket(config.botUrl, {
    headers: { Authorization: id },
  });
  ws.on("close", (c, r) => {
    if (
      dialog.showMessageBoxSync({
        title: "Connection au bot interrompue",
        message: "La connection a CostaBot a été interrompu",
        buttons: ["Réessayer", "Quitter"],
        cancelId: 1,
        defaultId: 1,
        noLink: true,
        type: "error",
        detail: `Code ${c} ${r}`,
      }) === 0
    )
      botConnection(id);
    else app.quit();
  });
  ws.on("error", (err) => {
    dialog.showErrorBox(err.name, err.message);
  });
  ws.on("message", (data) => {
    let mess = JSON.parse(data.toString());
    switch (mess.action) {
      case "dl":
        dl(mess.videoId, mess.format);
        break;

      default:
        break;
    }
  });
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

async function dl(id: string, format: "audio" | "video") {
  let link = `https://youtube.com/watch?v=${id}`;
  let title = (await ytdl.getBasicInfo(link)).videoDetails.title;

  let _ = new Notification({
    title: "Téléchargement en cours",
    body: `La vidéo ${title} est en cours de téléchargement`,
    silent: true,
    icon: pathJoin(__dirname + "/../static/assets/logo.ico"),
    timeoutType: "default",
  })
    .on("click", () => {
      let cmd = "";
      switch (os.platform()) {
        case "win32":
          cmd = "explorer " + settings.dlPath;
          break;
        case "linux":
          cmd = "nautilus " + settings.dlPath;
          break;
        case "darwin":
          cmd = "open " + settings.dlPath;
          break;
        default:
          break;
      }
      exec(cmd);
    })
    .show();

  if (!fs.existsSync(settings.dlPath))
    fs.mkdirSync(settings.dlPath, { recursive: true });

  if (format === "audio") {
    ytdl(link, {
      filter: "audioonly",
      quality: "highestaudio",
    })
      .pipe(
        fs.createWriteStream(
          `${settings.dlPath}\\${sanitize(`${title} (audio).mp4`)}`
        )
      )
      .on("finish", () => {
        new Notification({
          title: "Vidéo téléchargé avec succès",
          body: `La vidéo ${title} a été téléchargé`,
          silent: false,
          icon: pathJoin(__dirname + "/../static/assets/logo.ico"),
          timeoutType: "default",
        })
          .on("click", () => {
            let cmd = "";
            switch (os.platform()) {
              case "win32":
                cmd = `explorer ${settings.dlPath}\\${sanitize(
                  `${title} (audio).mp4`
                )}`;
                break;
              case "linux":
                cmd = `nautilus ${settings.dlPath}\\${sanitize(
                  `${title} (audio).mp4`
                )}`;
                break;
              case "darwin":
                cmd = `open ${settings.dlPath}\\${sanitize(
                  `${title} (audio).mp4`
                )}`;
                break;
              default:
                break;
            }
            exec(cmd);
          })
          .show();
      })
      .on("error", console.log);
  } else if (format === "video") {
    ytdl(link, {
      filter: "audioandvideo",
      quality: "highestaudio",
    })
      .pipe(
        fs.createWriteStream(
          `${settings.dlPath}\\${sanitize(`${title} (video).mp4`)}`
        )
      )
      .on("finish", () => {
        new Notification({
          title: "Vidéo téléchargé avec succès",
          body: `La vidéo ${title} a été téléchargé`,
          silent: false,
          icon: pathJoin(__dirname + "/../static/assets/logo.ico"),
          timeoutType: "default",
        })
          .on("click", () => {
            let cmd = "";
            switch (os.platform()) {
              case "win32":
                cmd = `explorer ${settings.dlPath}\\${sanitize(
                  `${title} (video).mp4`
                )}`;
                break;
              case "linux":
                cmd = `nautilus ${settings.dlPath}\\${sanitize(
                  `${title} (video).mp4`
                )}`;
                break;
              case "darwin":
                cmd = `open ${settings.dlPath}\\${sanitize(
                  `${title} (video).mp4`
                )}`;
                break;
              default:
                break;
            }
            exec(cmd);
          })
          .show();
      })
      .on("error", console.log);
  }
}

ipcMain.on("reloadSettings", () => {
  settings = JSON.parse(fs.readFileSync(settingsPath) as any);
  if (!settings.stayConnect)
    keytar.deletePassword(keytarService, keytarAccount);
});

ipcMain.on("deletePassword", () => {
  keytar.deletePassword(keytarService, keytarAccount);
});
