import React from "react";

export default class DivAll extends React.Component {
  constructor(props: { default: boolean }) {
    super(props);

    if (props.default != undefined)
      this.state = {
        active: props.default,
      };
    else
      this.state = {
        active: true,
      };
  }

  show() {
    this.setState({ active: true });
  }

  hide() {
    this.setState({ active: false });
  }

  render() {
    return (
      <div
        className={
          (this.state as any).active
            ? "visible display-block"
            : "hidden display-none"
        }
      >
        <h1>iaqshdhoqdddddd</h1>
        <h1>dqhidhioqo</h1>
      </div>
    );
  }
}
