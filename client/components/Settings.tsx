import * as React from 'react'
import { connect } from 'react-redux'
import Select from 'react-select'
import WebMidi from 'webmidi'
import { IAppProps } from './App'

//Utils:
import '../assets/css/Settings.css'
import { ISettings } from '../../server/reducers/settingsReducer'
import { Store } from 'redux'
import { ChangeEvent } from 'react'
import { SOCKET_SAVE_SETTINGS } from '../../server/constants/SOCKET_IO_DISPATCHERS'
import { storeShowSettings } from '../../server/reducers/settingsActions'

//Set style for Select dropdown component:
const selectorColorStyles = {
    control: (styles: any) => ({
        ...styles,
        backgroundColor: '#676767',
        color: 'white',
        border: 0,
        width: 500,
        marginLeft: 100,
    }),
    option: (styles: any) => {
        return {
            backgroundColor: '#AAAAAA',
            color: 'white',
        }
    },
    singleValue: (styles: any) => ({ ...styles, color: 'white' }),
}

interface IState {
    settings: ISettings
}

class Settings extends React.PureComponent<IAppProps & Store, IState> {
    selectedProtocol: any
    midiInputPortList: any
    midiOutputPortList: any

    constructor(props: any) {
        super(props)

        this.state = {
            settings: this.props.store.settings[0],
        }
        //Initialise list of Midi ports:
        this.findMidiPorts()
    }

    findMidiPorts = () => {
        WebMidi.enable((err) => {
            if (err) {
                console.log('WebMidi could not be enabled.', err)
            }

            // Viewing available inputs and outputs
            console.log('Midi inputs : ', WebMidi.inputs)
            console.log('Midi outputs : ', WebMidi.outputs)
        })
        this.midiInputPortList = WebMidi.inputs.map((input) => {
            return { label: input.name, value: input.name }
        })
        this.midiOutputPortList = WebMidi.outputs.map((output) => {
            return { label: output.name, value: output.name }
        })
    }

    handleRemoteMidiInputPort = (selectedOption: any) => {
        let settingsCopy = Object.assign({}, this.state.settings)
        settingsCopy.remoteFaderMidiInputPort = selectedOption.value
        this.setState({ settings: settingsCopy })
    }

    handleRemoteMidiOutputPort = (selectedOption: any) => {
        let settingsCopy = Object.assign({}, this.state.settings)
        settingsCopy.remoteFaderMidiOutputPort = selectedOption.value
        this.setState({ settings: settingsCopy })
    }

    handleMixerMidiInputPort = (selectedOption: any) => {
        let settingsCopy = Object.assign({}, this.state.settings)
        settingsCopy.mixers[0].mixerMidiInputPort = selectedOption.value
        this.setState({ settings: settingsCopy })
    }

    handleMixerMidiOutputPort = (selectedOption: any) => {
        let settingsCopy = Object.assign({}, this.state.settings)
        settingsCopy.mixers[0].mixerMidiOutputPort = selectedOption.value
        this.setState({ settings: settingsCopy })
    }

    handleChange = (event: ChangeEvent<HTMLInputElement>) => {
        let settingsCopy = Object.assign({}, this.state.settings)
        if (event.target.type === 'checkbox') {
            ;(settingsCopy as any)[event.target.name] = !!event.target.checked
        } else {
            ;(settingsCopy as any)[event.target.name] = event.target.value
        }
        this.setState({ settings: settingsCopy })
    }

    handleNumberOfMixers = (event: ChangeEvent<HTMLInputElement>) => {
        let settingsCopy = Object.assign({}, this.state.settings)
        settingsCopy.numberOfMixers = parseInt(event.target.value) || 1
        settingsCopy = this.setNumberOfMixers(settingsCopy)
        this.setState({ settings: settingsCopy })
    }

    setNumberOfMixers = (settings: any) => {
        console.log(settings.mixers)
        let mixers = settings.mixers.map((mixer: any, index: number) => {
            if (index < settings.numberOfMixers) {
                return mixer
            }
        })

        settings.mixers = []
        for (let i = 0; i < settings.numberOfMixers; i++) {
            if (settings.mixers[i] === undefined) {
                settings.mixers.push(JSON.parse(JSON.stringify(mixers[0])))
            } else {
                settings.mixers.push(mixers[i])
            }
        }
        return settings
    }

    handleMixerChange = (
        event: ChangeEvent<HTMLInputElement>,
        mixerIndex: number
    ) => {
        let settingsCopy = Object.assign({}, this.state.settings)
        if (event.target.type === 'checkbox') {
            ;(settingsCopy.mixers[mixerIndex] as any)[
                event.target.name
            ] = !!event.target.checked
        } else {
            ;(settingsCopy.mixers[mixerIndex] as any)[event.target.name] =
                event.target.value
        }
        this.setState({ settings: settingsCopy })
    }

    handleProtocolChange = (selectedOption: any, mixerIndex: number) => {
        let settingsCopy = Object.assign({}, this.state.settings)
        settingsCopy.mixers[mixerIndex].mixerProtocol = selectedOption.value
        window.mixerProtocol =
            window.mixerProtocolPresets[
                settingsCopy.mixers[mixerIndex].mixerProtocol
            ]
        this.setState({ settings: settingsCopy })
    }

    handleNumberOfChannels = (
        mixerIndex: number,
        index: number,
        event: any
    ) => {
        let settingsCopy = Object.assign({}, this.state.settings)
        settingsCopy.mixers[mixerIndex].numberOfChannelsInType[index] =
            parseInt(event.target.value) || 1
        this.setState({ settings: settingsCopy })
    }

    handleSave = () => {
        let settingsCopy = Object.assign({}, this.state.settings)
        settingsCopy.showSettings = false
        window.socketIoClient.emit(SOCKET_SAVE_SETTINGS, settingsCopy)
        location.reload()
    }

    handleCancel = () => {
        this.props.dispatch(storeShowSettings())
    }

    renderChannelTypeSettings = (mixerIndex: number) => {
        return (
            <div className="settings-show-channel-selection">
                {window.mixerProtocolPresets[
                    this.state.settings.mixers[mixerIndex].mixerProtocol
                ].channelTypes.map((item: any, index: number) => {
                    return (
                        <React.Fragment>
                            <label className="settings-input-field">
                                Number of {item.channelTypeName} :
                                <input
                                    name="numberOfChannelsInType"
                                    type="text"
                                    value={
                                        this.state.settings.mixers[mixerIndex]
                                            .numberOfChannelsInType[index]
                                    }
                                    onChange={(event) =>
                                        this.handleNumberOfChannels(
                                            mixerIndex,
                                            index,
                                            event
                                        )
                                    }
                                />
                            </label>
                            <br />
                        </React.Fragment>
                    )
                })}
            </div>
        )
    }

    renderMixerMidiSettings = () => {
        return (
            <div>
                <div className="settings-header">MIXER MIDI SETTINGS:</div>
                <div className="settings-input-field">
                    Mixer Midi Input Port :
                </div>
                <Select
                    styles={selectorColorStyles}
                    value={{
                        label: this.state.settings.mixers[0].mixerMidiInputPort,
                        value: this.state.settings.mixers[0].mixerMidiInputPort,
                    }}
                    onChange={this.handleMixerMidiInputPort}
                    options={this.midiInputPortList}
                />
                <br />
                <div className="settings-input-field">
                    Mixer Midi Output Port :
                </div>
                <Select
                    styles={selectorColorStyles}
                    value={{
                        label: this.state.settings.mixers[0]
                            .mixerMidiOutputPort,
                        value: this.state.settings.mixers[0]
                            .mixerMidiOutputPort,
                    }}
                    onChange={this.handleMixerMidiOutputPort}
                    options={this.midiOutputPortList}
                />
                <br />
            </div>
        )
    }

    renderMixerSettings = () => {
        return (
            <div>
                {this.state.settings.mixers.map(
                    (mixer: any, mixerIndex: number) => {
                        return (
                            <React.Fragment>
                                <div className="settings-header">
                                    MIXER {mixerIndex + 1} SETTINGS:
                                </div>

                                <Select
                                    styles={selectorColorStyles}
                                    value={{
                                        label:
                                            window.mixerProtocolPresets[
                                                mixer.mixerProtocol
                                            ].label,
                                        value: mixer.mixerProtocol,
                                    }}
                                    onChange={(event) =>
                                        this.handleProtocolChange(
                                            event,
                                            mixerIndex
                                        )
                                    }
                                    options={window.mixerProtocolList}
                                />
                                <br />
                                <label className="settings-input-field">
                                    MIXER IP :
                                    <input
                                        name="deviceIp"
                                        type="text"
                                        value={mixer.deviceIp}
                                        onChange={(event) =>
                                            this.handleMixerChange(
                                                event,
                                                mixerIndex
                                            )
                                        }
                                    />
                                </label>
                                <br />
                                <label className="settings-input-field">
                                    MIXER PORT :
                                    <input
                                        name="devicePort"
                                        type="text"
                                        value={mixer.devicePort}
                                        onChange={(event) =>
                                            this.handleMixerChange(
                                                event,
                                                mixerIndex
                                            )
                                        }
                                    />
                                </label>
                                <br />
                                <label className="settings-input-field">
                                    LOCAL MIXER IP:
                                    <input
                                        name="localIp"
                                        type="text"
                                        value={mixer.localIp}
                                        onChange={(event) =>
                                            this.handleMixerChange(
                                                event,
                                                mixerIndex
                                            )
                                        }
                                    />
                                </label>
                                <br />
                                <label className="settings-input-field">
                                    LOCAL MIXER PORT :
                                    <input
                                        name="localOscPort"
                                        type="text"
                                        value={mixer.localOscPort}
                                        onChange={(event) =>
                                            this.handleMixerChange(
                                                event,
                                                mixerIndex
                                            )
                                        }
                                    />
                                </label>
                                <br />
                                <label className="settings-input-field">
                                    PROTOCOL LATENCY :
                                    <input
                                        name="protocolLatency"
                                        type="text"
                                        value={mixer.protocolLatency}
                                        onChange={(event) =>
                                            this.handleMixerChange(
                                                event,
                                                mixerIndex
                                            )
                                        }
                                    />
                                </label>
                                <br />
                                <label className="settings-input-field">
                                    NUMBER OF AUX :
                                    <input
                                        name="numberOfAux"
                                        type="text"
                                        value={mixer.numberOfAux}
                                        onChange={(event) =>
                                            this.handleMixerChange(
                                                event,
                                                mixerIndex
                                            )
                                        }
                                    />
                                </label>
                                <br />
                                <label className="settings-input-field">
                                    NEXT SEND AUX NR.:
                                    <input
                                        name="nextSendAux"
                                        type="text"
                                        value={mixer.nextSendAux}
                                        onChange={(event) =>
                                            this.handleMixerChange(
                                                event,
                                                mixerIndex
                                            )
                                        }
                                    />
                                </label>
                                <br />
                                {window.mixerProtocol.protocol === 'MIDI'
                                    ? this.renderMixerMidiSettings()
                                    : ''}
                                <br />
                                {this.renderChannelTypeSettings(mixerIndex)}
                                <br />
                            </React.Fragment>
                        )
                    }
                )}
            </div>
        )
    }

    render() {
        return (
            <div className="settings-body">
                <div className="settings-header">GENERIC SETTINGS:</div>
                <label className="settings-input-field">
                    FADE TIME :
                    <input
                        name="fadeTime"
                        type="text"
                        value={this.state.settings.fadeTime}
                        onChange={this.handleChange}
                    />
                    ms
                </label>
                <br />
                <label className="settings-input-field">
                    VOICE OVER FADE TIME :
                    <input
                        name="voFadeTime"
                        type="text"
                        value={this.state.settings.voFadeTime}
                        onChange={this.handleChange}
                    />
                    ms
                </label>
                <br />
                <label className="settings-input-field">
                    VOICE OVER DIM :
                    <input
                        name="voLevel"
                        type="text"
                        value={this.state.settings.voLevel}
                        onChange={this.handleChange}
                    />
                    %
                </label>
                <br />
                <label className="settings-input-field">
                    AUTORESET LEVEL :
                    <input
                        name="autoResetLevel"
                        type="text"
                        value={this.state.settings.autoResetLevel}
                        onChange={this.handleChange}
                    />
                    %
                </label>
                <br />
                <label className="settings-input-field">
                    NUMBER OF FADERS :
                    <input
                        name="numberOfFaders"
                        type="text"
                        value={this.state.settings.numberOfFaders}
                        onChange={this.handleChange}
                    />
                </label>
                <br />
                <label className="settings-input-field">
                    NUMBER OF MIXERS :
                    <input
                        name="numberOfMixers"
                        type="text"
                        value={this.state.settings.numberOfMixers}
                        onChange={this.handleNumberOfMixers}
                    />
                </label>
                <br />
                <label className="settings-input-field">
                    PAGE LENGTH:
                    <input
                        name="pageLength"
                        type="text"
                        value={this.state.settings.pageLength}
                        onChange={this.handleChange}
                    />
                </label>
                <br />
                <label className="settings-input-field">
                    AUTOMATION MODE:
                    <input
                        type="checkbox"
                        name="automationMode"
                        checked={this.state.settings.automationMode}
                        onChange={this.handleChange}
                    />
                </label>
                <br />
                <label className="settings-input-field">
                    EQ-COMP-AUX IN CH.STRIP:
                    <input
                        type="checkbox"
                        name="offtubeMode"
                        checked={this.state.settings.offtubeMode}
                        onChange={this.handleChange}
                    />
                </label>
                <br />
                <label className="settings-input-field">
                    SHOW PFL CONTROLS:
                    <input
                        type="checkbox"
                        name="showPfl"
                        checked={this.state.settings.showPfl}
                        onChange={this.handleChange}
                    />
                </label>
                <br />
                <label className="settings-input-field">
                    ENABLE PAGES:
                    <input
                        type="checkbox"
                        name="enablePages"
                        checked={this.state.settings.enablePages}
                        onChange={this.handleChange}
                    />
                </label>
                <br />
                <label className="settings-input-field">
                    CHANNEL STRIP FOLLOWS PFL:
                    <input
                        type="checkbox"
                        name="chanStripFollowsPFL"
                        checked={this.state.settings.chanStripFollowsPFL}
                        onChange={this.handleChange}
                    />
                </label>
                <br />

                {this.renderMixerSettings()}
                <button
                    className="settings-cancel-button"
                    onClick={() => {
                        this.handleCancel()
                    }}
                >
                    CANCEL
                </button>
                <button
                    className="settings-save-button"
                    onClick={() => {
                        this.handleSave()
                    }}
                >
                    SAVE SETTINGS
                </button>
            </div>
        )
    }
}

const mapStateToProps = (state: any, t: any): IAppProps => {
    return {
        store: state,
        t: t,
    }
}

export default connect<any, any>(mapStateToProps)(Settings) as any
