import * as React from "react";
import { observer } from "mobx-react";
import { observable, action } from "mobx";
import { MainState } from "./state";
import { ConfigFileNetIface } from "./interfaces";
import { TZSelect } from "./tz_select";
import { STUB } from "./just_a_stub";
import * as Select from "react-select";

interface MainProps {
  mobx: MainState;
  ws: WebSocket;
}

interface FormState {
  timezone?: null | string;
  email?: null | string;
  pass?: null | string;
  server?: null | string;
}

@observer
export class Main extends React.Component<MainProps, FormState> {
  constructor(props: MainProps) {
    super(props);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.handleTZChange = this.handleTZChange.bind(this);
    this.handleEmailChange = this.handleEmailChange.bind(this);
    this.handlePassChange = this.handlePassChange.bind(this);
    this.handleServerChange = this.handleServerChange.bind(this);
    this.state = { timezone: null, email: null, pass: null, server: null };
  }

  handleSubmit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    let mainState = this.props.mobx;
    let fullFile = mainState.configuration;

    let email = this.state.email;
    let pass = this.state.pass;
    let server = this.state.server;
    let tz = this.state.timezone;

    if (tz) {
      fullFile.configuration.timezone = tz;
    } else {
      console.error("Timezone is invalid");
      return;
    }

    if (email && pass && server) {
      mainState.uploadCreds(email, pass, server);
    } else {
      console.error("Email, Password, or Server is incomplete")
      return;
    }

    // upload config file.
    mainState.uploadConfigFile(fullFile);
    mainState.tryLogIn();
  }

  // Handles the various input boxes.
  handleTZChange(optn: Select.Option) {
    let timezone = (optn.value || "").toString();
    console.log("Hi?" + timezone);
    this.setState({ timezone: timezone });
  }
  handleEmailChange(event: any) {
    this.setState({ email: (event.target.value || "") });
  }
  handlePassChange(event: any) {
    this.setState({ pass: (event.target.value || "") });
  }
  handleServerChange(event: any) {
    this.setState({ server: (event.target.value || "") });
  }

  buildNetworkConfig(config: { [name: string]: ConfigFileNetIface }) {
    return <fieldset>
      <label htmlFor="network">
        Network
        </label>
      {
        Object.keys(config)
          .map((ifaceName) => {
            let iface = config[ifaceName];
            switch (iface.type) {
              // Wireless interfaces need two input boxes
              case "wireless":
                return <fieldset key={ifaceName}>
                  <label htmlFor={ifaceName}>
                    {ifaceName}
                  </label>
                  <button type="button"
                    onClick={() => { this.props.mobx.scan(ifaceName) } }>
                    Scan for WiFi </button>
                  <Select value="Pick an SSID"
                    options={this.props.mobx.ssids.map(x => ({ value: x, label: x }))} />
                  <input type="text" placeholder="Wifi SSID" />
                  <input type="password" placeholder="Wifi Key" />

                </fieldset>;

              // wired interfaces just need a enabled/disabled button
              case "wired":
                return <fieldset key={ifaceName}>
                  <label htmlFor={ifaceName}>
                    {ifaceName}
                  </label>
                  <button type="button"
                    onClick={() => {
                      // Enable this interface.
                      this.props.mobx.updateInterface(ifaceName, { default: "dhcp" });
                    } }>
                    Enable {ifaceName}
                  </button>
                </fieldset>;
            }
          })
      }
    </fieldset>

  }


  render() {
    let mainState = this.props.mobx;

    return <div className="container">
      <h1>Configure your FarmBot</h1>

      <h1 hidden={mainState.connected}> Good Luck!! </h1>


      {/* Only display if the bot is connected */}
      <div hidden={!mainState.connected} className={`col-md-offset-3 col-md-6
        col-sm-8 col-sm-offset-2`}>

        <div className="widget">

          <div className="widget-header">
            <h5> Logs </h5>
            <i className="fa fa-question-circle widget-help-icon">
              <div className="widget-help-text">
                {`Log messages from your bot`}
              </div>
            </i>
          </div>

          <div className="widget-content">
            {this.props.mobx.logs[this.props.mobx.logs.length - 1].message}
          </div>
        </div>
        {/* Bot */}
        <div className="widget">
          <div className="widget-header">
            <h5>Bot</h5>
            <i className="fa fa-question-circle widget-help-icon">
              <div className="widget-help-text">
                Bot configuration.
                </div>
            </i>
          </div>
          <div className="widget-content">
            {/* timezone */}
            <TZSelect callback={this.handleTZChange}
              current={this.props.mobx.configuration.configuration.timezone} />

            {/* Network */}
            {this.buildNetworkConfig(mainState.configuration.network ? mainState.configuration.network.interfaces : STUB)}
          </div>
        </div>



        <form onSubmit={this.handleSubmit}>
          {/* App */}
          <div className="widget">
            <div className="widget-header">
              <h5>Web App</h5>
              <i className="fa fa-question-circle widget-help-icon">
                <div className="widget-help-text">
                  Farmbot Application Configuration
                </div>
              </i>
            </div>

            <div className="widget-content">

              <fieldset>
                <label htmlFor="email">
                  Email
                </label>
                <input type="email" id="email"
                  onChange={this.handleEmailChange} />
              </fieldset>

              <fieldset>
                <label htmlFor="password">
                  Password
                </label>
                <input type="password"
                  onChange={this.handlePassChange} />
              </fieldset>

              <fieldset>
                <label htmlFor="url">
                  Server:
                </label>
                <input type="url" id="url"
                  onChange={this.handleServerChange} />
              </fieldset>

              {/* Submit our web app credentials, and config file. */}
              <button type="submit">Try to Log In</button>

            </div>
          </div>
        </form>
      </div>
    </div>
  }
}
