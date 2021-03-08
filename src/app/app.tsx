import React from "react";
import Settings from "./components/settings";
import TitleBar, { TitleBarButton } from "frameless-titlebar";
import { ipcRenderer } from "electron";

class App extends React.Component {
  SettingsElement = React.createRef();

  constructor(props: any) {
    super(props);
  }
  render() {
    return (
      <div>
        <TitleBar
          title="CostaBot"
          onClose={() => window.close()}
          onMaximize={() => ipcRenderer.send("maximize")}
          onMinimize={() => ipcRenderer.send("minimize")}
        >
          {/* @ts-ignore */}
          <TitleBarButton
            label={
              <img
                src="../static/assets/settings.svg"
                style={{ width: "15px" }}
              ></img>
            }
            theme={{
              active: { background: "#123456", color: "#987654" },
              default: { background: "#666666", color: "#888888" },
              disabledOpacity: 10,
              hover: { background: "#111111", color: "#000000" },
              maxWidth: 100,
            }}
            open={false}
            onClick={(e: any) => {
              e.preventDefault();
              e.stopPropagation();
              (this.SettingsElement.current as any).show();
            }}
          ></TitleBarButton>
        </TitleBar>
        <Settings ref={this.SettingsElement as any}></Settings>
      </div>
    );
  }
}

export default App;
