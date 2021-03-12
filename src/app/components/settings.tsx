import React from "react";
import Checkbox from "@material-ui/core/Checkbox";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import Button from "@material-ui/core/Button";
import fs from "fs";
import { join as pathJoin } from "path";

export default class Settings extends React.Component {
  settings: { stayConnect: boolean };
  onClose: CallableFunction;
  constructor(props: { default: boolean; onClose: CallableFunction }) {
    super(props);
    this.onClose = props.onClose;
    this.settings = JSON.parse(
      fs.readFileSync(pathJoin(__dirname + "/../settings.json")).toString()
    );
    if (props.default)
      this.state = {
        active: props.default,
        stayConnect: this.settings.stayConnect,
      };
    else
      this.state = {
        active: false,
        stayConnect: this.settings.stayConnect,
      };
    this.handleChange = this.handleChange.bind(this);
  }

  reloadSettings() {
    this.settings = JSON.parse(
      fs.readFileSync(pathJoin(__dirname + "/../settings.json")).toString()
    );
    this.setState({
      stayConnect: this.settings.stayConnect
    });
  }

  save() {
    fs.writeFileSync(
      pathJoin(__dirname + "/../settings.json"),
      JSON.stringify(
        {
          stayConnect: (this.state as any).stayConnect,
        },
        null,
        4
      )
    );
  }

  cancel() {
    this.settings = JSON.parse(
      fs.readFileSync(pathJoin(__dirname + "/../settings.json")).toString()
    );
    this.setState({
      stayConnect: this.settings.stayConnect,
    });
  }

  show() {
    this.setState({ active: true });
    this.reloadSettings();
  }

  hide() {
    this.setState({ active: false });
    this.reloadSettings();
  }

  handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    this.setState({ [event.target.name]: event.target.checked });
  }

  render() {
    return (
      <div
        className={
          (this.state as any).active
            ? "visible display-block"
            : "hidden display-none"
        }
        style={{ paddingLeft: 15 }}
      >
        <div style={{ textAlign: "center" }}>
          <h1>Réglages</h1>
        </div>
        <br />
        <div style={{ color: "white" }}>
          <FormControlLabel
            control={
              <Checkbox
                style={{ color: "white" }}
                checked={(this.state as any).stayConnect}
                onChange={this.handleChange}
                color="default"
                name="stayConnect"
                inputProps={{ "aria-label": "primary checkbox" }}
              ></Checkbox>
            }
            label="Se souvenir de moi pendant 7 jours"
          ></FormControlLabel>
        </div>
        <div style={{ textAlign: "right" }}>
          <Button
            variant="outlined"
            color="default"
            style={{ borderColor: "red", color: "red" }}
            onClick={() => {
              this.cancel();
              this.onClose();
              this.reloadSettings();
            }}
          >
            Annuler
          </Button>
          <Button
            variant="outlined"
            color="default"
            style={{ borderColor: "green", color: "green", marginLeft: 15, marginRight: 15 }}
            onClick={() => {
              this.save();
              this.onClose();
              this.reloadSettings();
            }}
          >
            Enregister
          </Button>
        </div>
      </div>
    );
  }
}
