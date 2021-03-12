import React, { ChangeEvent } from "react";
import { ipcRenderer, remote } from "electron";
const { dialog } = require("electron").remote;
import FormControlLabel from "@material-ui/core/FormControlLabel";
import CheckBox from "@material-ui/core/Checkbox";
import Button from "@material-ui/core/Button";
import fs from "fs";
import { join as pathJoin } from "path";

class App extends React.Component {
  SettingsElement = React.createRef();
  DivAllElement = React.createRef();

  handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    this.setState({
      [e.target.name]: e.target.checked,
    });

    this.save(e.target);
    this.applySettings();
  };

  state = {
    height: window.innerHeight,
    width: window.innerWidth,
    stayConnect: true,
  };

  constructor(props: any) {
    super(props);
    window.onresize = () => {
      this.setState({ height: window.innerHeight, width: window.innerWidth });
    };
  }

  save(target: EventTarget & HTMLInputElement) {
    let settings: any = {
      stayConnect: ((this.state as any).stayConnect as boolean)
    }
    settings[target.name] = target.checked;
    fs.writeFileSync(pathJoin(__dirname + "/../settings.json"), JSON.stringify(settings, null, 4));
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
          <div style={{ paddingLeft: 15 }}>
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
                  let r = dialog.showMessageBoxSync(remote.getCurrentWindow(), { message: "Voulez vous vraiment supprimez vos identifiants ?", buttons: ["Non", "Oui"], cancelId: 0, defaultId: 1, title: "Vraiment ?", type: "question" });
                  if (r === 1)
                    ipcRenderer.send("deletePassword");
                }}
              >
                Supprimer identifiants Discord
               </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default App;
