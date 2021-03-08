import React from "react";

class Settings extends React.Component {
    constructor(props: any) {
        super(props);
        (this.state as any) = { active: false };
    }

    show() {
        this.setState({ active: true });
    }

    hide() {
        this.setState({ active: false });
    }

    render() {
        return (
            <div className={(this.state as any).active ? "visible" : "hidden"}>
                <p>coucou</p>
            </div>
        )
    }
}

export default Settings;