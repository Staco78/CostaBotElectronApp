import React, { ChangeEvent } from "react";
import { ipcRenderer, remote } from "electron";
const { dialog } = require("electron").remote;
import FormControlLabel from "@material-ui/core/FormControlLabel";
import CheckBox from "@material-ui/core/Checkbox";
import Button from "@material-ui/core/Button";
import fs from "fs";
import { join as pathJoin } from "path";
import { exec } from "child_process";
import os from "os";

import getAppdataPath from "appdata-path";

const appDataPath = getAppdataPath("CostaBot");
const settingsPath = pathJoin(appDataPath + "/settings.json");

class App extends React.Component {
  SettingsElement = React.createRef();
  DivAllElement = React.createRef();

  handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    this.setState(
      {
        [e.target.name]: e.target.checked,
      },
      () => {
        this.save();
        this.applySettings();
      }
    );
  };

  state = {
    height: window.innerHeight,
    width: window.innerWidth,
    stayConnect: JSON.parse(fs.readFileSync(settingsPath) as any).stayConnect,
    dlPath: JSON.parse(fs.readFileSync(settingsPath) as any).dlPath,
  };

  constructor(props: any) {
    super(props);
    window.onresize = () => {
      this.setState({ height: window.innerHeight, width: window.innerWidth });
    };
  }

  save() {
    let settings: any = {
      stayConnect: (this.state as any).stayConnect as boolean,
      dlPath: (this.state as any).dlPath as string,
    };
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 4));
  }

  applySettings() {
    ipcRenderer.send("reloadSettings");
  }

  render() {
    return (
      <div
        style={{
          overflow: "hidden",
          height: (this.state as any).height,
          width: (this.state as any).width,
        }}
      >
        <div>
          <div style={{ color: "white", textAlign: "center" }}>
            <h1>Paramètres</h1>
          </div>
          <br />
          <div style={{ paddingLeft: 15, paddingRight: 15 }}>
            <fieldset
              style={{
                border: "1px solid silver",
                borderRadius: 5,
                width: "max-content",
              }}
            >
              <legend>Connection à Discord</legend>
              <div>
                <FormControlLabel
                  label="Se souvenir de moi pendant 7 jours"
                  control={
                    <CheckBox
                      name="stayConnect"
                      checked={(this.state as any).stayConnect}
                      onChange={this.handleChange}
                      style={{ color: "white" }}
                      color="default"
                    ></CheckBox>
                  }
                ></FormControlLabel>
              </div>
              <div>
                <Button
                  variant="outlined"
                  color="default"
                  style={{ borderColor: "red", color: "red" }}
                  onClick={() => {
                    let r = dialog.showMessageBoxSync(
                      remote.getCurrentWindow(),
                      {
                        message:
                          "Voulez vous vraiment supprimez vos identifiants ?",
                        buttons: ["Non", "Oui"],
                        cancelId: 0,
                        defaultId: 1,
                        title: "Vraiment ?",
                        type: "question",
                        noLink: true,
                      }
                    );
                    if (r === 1) ipcRenderer.send("deletePassword");
                  }}
                >
                  Supprimer identifiants Discord
                </Button>
              </div>
            </fieldset>
            <br />
            <fieldset
              style={{
                border: "1px solid silver",
                borderRadius: 5,
                width: "max-content",
              }}
            >
              <legend>Téléchargement Youtube</legend>
              <div>
                <p
                  style={{
                    fontSize: "smaller",
                    color: "darkgray",
                    marginBlockEnd: 0,
                  }}
                >
                  Emplacement de téléchargement:
                </p>
                <div
                  style={{ display: "inline-block", verticalAlign: "middle" }}
                >
                  <h4 style={{ marginBlock: 0, float: "left" }}>
                    {(this.state as any).dlPath}
                  </h4>
                  <Button
                    style={{
                      borderColor: "white",
                      color: "white",
                      float: "left",
                      height: 20,
                      marginLeft: 10,
                      top: 2,
                    }}
                    variant="outlined"
                    color="default"
                    onClick={() => {
                      let r = dialog.showOpenDialogSync(
                        remote.getCurrentWindow(),
                        {
                          defaultPath: (this.state as any).dlPath,
                          properties: ["openDirectory"],
                        }
                      );
                      if (r !== undefined) {
                        this.setState({ dlPath: r[0] }, () => {
                          this.save();
                          this.applySettings();
                        });
                      }
                    }}
                  >
                    Modifier
                  </Button>
                  <Button
                    style={{
                      borderColor: "white",
                      color: "white",
                      float: "left",
                      height: 20,
                      marginLeft: 10,
                      top: 2,
                    }}
                    variant="outlined"
                    color="default"
                    onClick={() => {
                      let cmd = "";
                      switch (os.platform()) {
                        case "win32":
                          cmd = "explorer " + (this.state as any).dlPath;
                          break;
                        case "linux":
                          cmd = "nautilus " + (this.state as any).dlPath;
                          break;
                        case "darwin":
                          cmd = "open " + (this.state as any).dlPath;
                          break;
                        default:
                          dialog.showErrorBox(
                            "Pas disponible sur votre plateforme",
                            "Cette fonctionnalité n'est pas (encore) disponible sur votre plateforme"
                          );
                          break;
                      }
                      exec(cmd);
                    }}
                  >
                    Ouvrir
                  </Button>
                </div>
              </div>
            </fieldset>
          </div>
        </div>
      </div>
    );
  }
}

export default App;
