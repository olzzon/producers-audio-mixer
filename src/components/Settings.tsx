import * as React from 'react';
import { connect } from "react-redux";
import Select from 'react-select';
import WebMidi, { INoteParam, IMidiChannel } from 'webmidi';
import { IAppProps } from './App';


//Utils:
import { saveSettings } from '../utils/SettingsStorage';
import '../assets/css/Settings.css';
import { MixerProtocolPresets, MixerProtocolList } from '../constants/MixerProtocolPresets';
import { any } from 'prop-types';
import { ISettings } from '../reducers/settingsReducer';
import { Store } from 'redux';
import { ChangeEvent } from 'react';


//Set style for Select dropdown component:
const selectorColorStyles = {
    control:
        (styles: any) => ({
            ...styles, backgroundColor: '#676767', color: 'white', border: 0, width: 500, marginLeft: 100
        }
    ),
    option: (styles: any) => {
        return {
            backgroundColor: '#AAAAAA',
            color: 'white'
        };
    },
    singleValue: (styles: any) => ({ ...styles, color: 'white' }),
};

interface IState {
    settings: ISettings,
    selectedProtocol: any
}


class Settings extends React.PureComponent<IAppProps & Store, IState> {
    mixerProtocolList: any;
    mixerProtocolPresets: any;
    selectedProtocol: any;
    midiInputPortList: any;
    midiOutputPortList: any;


    constructor(props: any) {
        super(props);

        this.mixerProtocolList = MixerProtocolList;
        this.mixerProtocolPresets = MixerProtocolPresets;
        this.state = {
            settings: this.props.store.settings[0],
            selectedProtocol: this.mixerProtocolPresets[this.props.store.settings[0].mixerProtocol]
        };
        //Initialise list of Midi ports:
        this.findMidiPorts();
    }

    findMidiPorts = () => {
        WebMidi.enable((err) => {

            if (err) {
                console.log("WebMidi could not be enabled.", err);
            }

            // Viewing available inputs and outputs
            console.log("Midi inputs : ", WebMidi.inputs);
            console.log("Midi outputs : ", WebMidi.outputs);
        });
        this.midiInputPortList = WebMidi.inputs.map((input) => {
            return {"label": input.name, "value": input.name}
        });
        this.midiOutputPortList = WebMidi.outputs.map((output) => {
            return {"label": output.name, "value": output.name}
        });

    }

    handleRemoteMidiInputPort = (selectedOption: any) => {
        var settingsCopy= Object.assign({}, this.state.settings);
        settingsCopy.remoteFaderMidiInputPort = selectedOption.value;
        this.setState(
            {settings: settingsCopy}
        );
    }

    handleRemoteMidiOutputPort = (selectedOption: any) => {
        var settingsCopy = Object.assign({}, this.state.settings);
        settingsCopy.remoteFaderMidiOutputPort = selectedOption.value;
        this.setState(
            {settings: settingsCopy}
        );
    }


    handleMixerMidiInputPort = (selectedOption: any) => {
        var settingsCopy= Object.assign({}, this.state.settings);
        settingsCopy.mixerMidiInputPort = selectedOption.value;
        this.setState(
            {settings: settingsCopy}
        );
    }

    handleMixerMidiOutputPort = (selectedOption: any) => {
        var settingsCopy = Object.assign({}, this.state.settings);
        settingsCopy.mixerMidiOutputPort = selectedOption.value;
        this.setState(
            {settings: settingsCopy}
        );
    }


    handleChange = (event: ChangeEvent<HTMLInputElement>) => {
        var settingsCopy = Object.assign({}, this.state.settings);
        if (event.target.type === "checkbox") {
            (settingsCopy as any)[event.target.name] = !!event.target.checked;
        } else {
            (settingsCopy as any)[event.target.name] = event.target.value;
        }
        this.setState(
            {settings: settingsCopy}
        );
    }


    handleProtocolChange = (selectedOption: any) => {
        var settingsCopy= Object.assign({}, this.state.settings);
        settingsCopy.mixerProtocol = selectedOption.value;
        this.setState({selectedProtocol: this.mixerProtocolPresets[settingsCopy.mixerProtocol]})
        this.setState(
            {settings: settingsCopy}
        );
    }

    handleNumberOfChannels = (index: number, event: any) => {
        var settingsCopy= Object.assign({}, this.state.settings);
        settingsCopy.numberOfChannelsInType[index] = event.target.value;
        this.setState(
            {settings: settingsCopy}
        );
    }

    handleShowChannel = (index: number, event: any) => {
        this.props.dispatch({
            type:'SHOW_CHANNEL',
            channel: index,
            showChannel: event.target.checked
        });
    }

    handleShowAllChannels = () => {
        this.props.store.channels[0].channel.map((channel: any, index: number) => {
            this.props.dispatch({
                type:'SHOW_CHANNEL',
                channel: index,
                showChannel: true
            });
        });
    }


    handleHideAllChannels = () => {
        this.props.store.channels[0].channel.map((channel: any, index: number) => {
            this.props.dispatch({
                type:'SHOW_CHANNEL',
                channel: index,
                showChannel: false
            });
        });
    }

    handleSave = () => {
        let settingsCopy= Object.assign({}, this.state.settings);
        settingsCopy.showSettings = false;

        saveSettings(settingsCopy);
        location.reload();
    }

    handleCancel = () => {
        location.reload();
    }

    renderChannelTypeSettings = () => {
        return (
            <div className="settings-show-channel-selection">
                <div className="settings-header">
                    NUMBER OF CHANNELTYPES:
                </div>
                {this.state.selectedProtocol.channelTypes.map((item: any, index: number) => {
                    return <React.Fragment>
                        <label className="settings-input-field">
                            Number of { item.channelTypeName } :
                            <input name="numberOfChannelsInType" type="text" value={this.state.settings.numberOfChannelsInType[index]} onChange={(event) => this.handleNumberOfChannels(index, event)} />
                        </label>
                        <br/>
                    </React.Fragment>
                })}
            </div>
        )
    }

    renderShowChannelsSelection = () => {
        return (
            <div className="settings-show-channel-selection">
                <div className="settings-header">
                    SHOW/HIDE FADERS:
                </div>
                <button className="settings-channels-button"
                    onClick=
                        {() => {
                            this.handleShowAllChannels();
                        }}
                >
                    ALL CHANNELS
                </button>
                <button className="settings-channels-button"
                    onClick=
                        {() => {
                            this.handleHideAllChannels();
                        }}
                >
                    NO CHANNELS
                </button>
                {this.props.store.channels[0].channel.map((channel: any, index: number) => {
                        return <div key={index}>
                            {channel.label != "" ? channel.label : ("CH " + (index + 1)) }
                            <input
                                type="checkbox"
                                checked={this.props.store.channels[0].channel[index].showChannel }
                                onChange={(event) => this.handleShowChannel(index, event)}
                            />
                        </div>
                    })
                }
            </div>
        )
    }


    renderMixerMidiSettings = () => {
        return (
            <div>
                <div className="settings-header">
                    MIXER MIDI SETTINGS:
                </div>
                <div className="settings-input-field">
                    Mixer Midi Input Port :
                </div>
                <Select
                    styles={selectorColorStyles}
                    value={{label: this.state.settings.mixerMidiInputPort, value: this.state.settings.mixerMidiInputPort}}
                    onChange={this.handleMixerMidiInputPort}
                    options={this.midiInputPortList}
                />
                <br/>
                <div className="settings-input-field">
                    Mixer Midi Output Port :
                </div>
                <Select
                    styles={selectorColorStyles}
                    value={{label: this.state.settings.mixerMidiOutputPort, value: this.state.settings.mixerMidiOutputPort}}
                    onChange={this.handleMixerMidiOutputPort}
                    options={this.midiOutputPortList}
                />
                <br/>
            </div>
        )
    }

    renderRemoteControllerSettings = () => {
        return (
            <div>
                <div className="settings-header">
                    REMOTE CONTROLLER SETTINGS:
                </div>
                <label className="settings-input-field">
                    ENABLE REMOTE CONTROLLER:
                    <input
                        type="checkbox"
                        name="enableRemoteFader"
                        checked={this.state.settings.enableRemoteFader}
                        onChange={this.handleChange}
                    />
                </label>
                <br/>
                <div className="settings-input-field">
                    Remote Midi Input Port :
                </div>
                <Select
                    styles={selectorColorStyles}
                    value={{label: this.state.settings.remoteFaderMidiInputPort, value: this.state.settings.remoteFaderMidiInputPort}}
                    onChange={this.handleRemoteMidiInputPort}
                    options={this.midiInputPortList}
                />
                <br/>
                <div className="settings-input-field">
                    Remote Midi Output Port :
                </div>
                <Select
                    styles={selectorColorStyles}
                    value={{label: this.state.settings.remoteFaderMidiOutputPort, value: this.state.settings.remoteFaderMidiOutputPort}}
                    onChange={this.handleRemoteMidiOutputPort}
                    options={this.midiOutputPortList}
                />
                <br/>
            </div>
        )
    }

    render() {
        return (
            <div className="settings-body">
                <div className="settings-header">
                    MIXER SETTINGS:
                </div>

                <Select
                    styles={selectorColorStyles}
                    value={{label: this.mixerProtocolPresets[this.state.settings.mixerProtocol].label, value: this.state.settings.mixerProtocol}}
                    onChange={this.handleProtocolChange}
                    options={this.mixerProtocolList}
                />
                <br/>
                <label className="settings-input-field">
                    LOCAL IP :
                    <input name="localIp" type="text" value={this.state.settings.localIp} onChange={this.handleChange} />
                </label>
                <br/>
                <label className="settings-input-field">
                    LOCAL PORT :
                    <input name="localOscPort" type="text" value={this.state.settings.localOscPort} onChange={this.handleChange} />
                </label>
                <br/>
                <label className="settings-input-field">
                    FADE TIME IN ms :
                    <input name="fadeTime" type="text" value={this.state.settings.fadeTime} onChange={this.handleChange} />
                </label>
                <br/>
                <label className="settings-input-field">
                    MIXER IP :
                    <input name="deviceIp" type="text" value={this.state.settings.deviceIp} onChange={this.handleChange} />
                </label>
                <br/>
                <label className="settings-input-field">
                    MIXER PORT :
                    <input name="devicePort" type="text" value={this.state.settings.devicePort} onChange={this.handleChange} />
                </label>
                <br/>
                <label className="settings-input-field">
                    SHOW PFL CONTROLS:
                    <input
                        type="checkbox"
                        name="showPfl"
                        checked={this.state.settings.showPfl}
                        onChange={this.handleChange}
                    />
                </label>
                <br/>
                {this.state.selectedProtocol.protocol === "MIDI" ? this.renderMixerMidiSettings() : ""}
                <br/>
                {this.renderChannelTypeSettings()}
                <br/>
                {this.renderShowChannelsSelection()}
                <br/>
                {this.renderRemoteControllerSettings()}
                <br/>
                <button
                    className="settings-cancel-button"
                    onClick=
                        {() => {
                            this.handleCancel();
                        }}
                >
                    CANCEL
                </button>
                <button
                    className="settings-save-button"
                    onClick=
                        {() => {
                            this.handleSave();
                        }}
                >
                    SAVE SETTINGS
                </button>
            </div>
        )
    }
}

const mapStateToProps = (state: any): IAppProps => {
    return {
        store: state
    }
}

export default connect<any, any>(mapStateToProps)(Settings) as any;
