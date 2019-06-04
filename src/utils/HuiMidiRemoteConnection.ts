//Node Modules:
import os from 'os'; // Used to display (log) network addresses on local machine
import WebMidi, { INoteParam, IMidiChannel } from 'webmidi';

//Utils:
import { IRemoteProtocol,
    RemoteFaderPresets,
    IMidiSendMessage,
    MidiSendTypes,
    IMidiReceiveMessage,
    MidiReceiveTypes } from '../constants/RemoteFaderPresets';
import { IMixerProtocol, MixerProtocolPresets } from '../constants/MixerProtocolPresets';



export class HuiMidiRemoteConnection {
    store: any;
    remoteProtocol: IRemoteProtocol;
    midiReceiveTypes = MidiReceiveTypes;
    mixerProtocol: any;
    midiInput: any;
    midiOutput:any;
    activeHuiChannel: number = 0;

    constructor() {
        this.convertFromRemoteLevel = this.convertFromRemoteLevel.bind(this);
        this.convertToRemoteLevel = this.convertToRemoteLevel.bind(this);
        this.updateRemoteFaderState = this.updateRemoteFaderState.bind(this);

        this.store = window.storeRedux.getState();
        const unsubscribe = window.storeRedux.subscribe(() => {
            this.store = window.storeRedux.getState();
        });

        this.remoteProtocol = RemoteFaderPresets.hui;
        this.mixerProtocol = MixerProtocolPresets[this.store.settings[0].mixerProtocol]  || MixerProtocolPresets.genericMidi;


        WebMidi.enable((err) => {

            if (err) {
                console.log("Remote MidiController connection could not be enabled.", err);
            }

            this.midiInput = WebMidi.getInputByName(this.store.settings[0].remoteFaderMidiInputPort);
            this.midiOutput = WebMidi.getOutputByName(this.store.settings[0].remoteFaderMidiOutputPort);

            if (this.midiInput && this.midiOutput ) {
                console.log("Remote Midi Controller connected on port")
                console.log("Midi input :", this.store.settings[0].remoteFaderMidiInputPort)
                console.log("Midi output :", this.store.settings[0].remoteFaderMidiOutputPort)

                this.setupRemoteFaderConnection();
            } else {
                console.log("Remote Midi Controller not found or not configured.")
            }
        });
    }

    setupRemoteFaderConnection() {
        this.midiInput.addListener(this.midiReceiveTypes[this.remoteProtocol.fromRemote.CHANNEL_FADER_LEVEL.type], undefined,
            (message: any) => {
                if (message.data[1] < 9) {
                    //Fader changed:
                    console.log("Received Fader message (" + message.data + ").");
                    window.storeRedux.dispatch({
                        type:'SET_FADER_LEVEL',
                        channel: message.data[1],
                        level: this.convertFromRemoteLevel(message.data[2])
                    });
                    window.mixerConnection.updateOutLevel(message.data[1]);
                    this.updateRemoteFaderState(message.data[1], this.convertFromRemoteLevel(message.data[2]))
                } else if (message.data[1] = 15) {
                    if (message.data[2]<9) {
                        //Set active channel for next midi message:
                        this.activeHuiChannel = message.data[2];
                    } else if (message.data[2] && message.data[2] === 65) {
                        //SELECT button - toggle PGM ON/OFF
                        window.storeRedux.dispatch({
                            type:'TOGGLE_PGM',
                            channel: this.activeHuiChannel
                        });
                        window.mixerConnection.updateOutLevel(this.activeHuiChannel);
                        this.updateRemotePgmPstPfl(this.activeHuiChannel);
                    } else if (message.data[2] && message.data[2] === 67) {
                        //SOLO button - toggle PFL ON/OFF
                        window.storeRedux.dispatch({
                            type:'TOGGLE_PFL',
                            channel: this.activeHuiChannel
                        });
                        window.mixerConnection.updateOutLevel(this.activeHuiChannel);
                        this.updateRemotePgmPstPfl(this.activeHuiChannel);
                    }
                }
            }
        );
        //for testing:
        this.midiInput.addListener('noteon', "all",
            (error: any) => {
                console.log("Received 'noteon' message (" + error.note.name + error.note.octave + ").");
            }
        );

    }

    convertToRemoteLevel(level: number) {

        let oldMin = this.mixerProtocol.fader.min;
        let oldMax = this.mixerProtocol.fader.max;
        let newMin = this.remoteProtocol.fader.min;
        let newMax = this.remoteProtocol.fader.max;

        let indexLevel = (level/(oldMax-oldMin)) * (newMax-newMin)
        let newLevel = newMin + indexLevel;
        return newLevel //convert from mixer min-max to remote min-max
    }

    convertFromRemoteLevel(level: number) {

        let oldMin = this.remoteProtocol.fader.min;
        let oldMax = this.remoteProtocol.fader.max;
        let newMin = this.mixerProtocol.fader.min;
        let newMax = this.mixerProtocol.fader.max;

        let indexLevel = (level/(oldMax-oldMin)) * (newMax-newMin)
        let newLevel = newMin + indexLevel;

        return newLevel //convert from mixer min-max to remote min-max
    }

    updateRemoteFaderState(channelIndex: number, outputLevel: number) {
        if (!this.midiOutput) { return };
        console.log("Send fader update :", "Channel index : ", channelIndex, "OutputLevel : ", this.convertToRemoteLevel(outputLevel))
        this.midiOutput.sendControlChange(
            (channelIndex),
            this.convertToRemoteLevel(outputLevel),
            1
        );
        this.midiOutput.sendControlChange(
            (32+channelIndex),
            0,
            1
        );
        this.updateRemotePgmPstPfl(channelIndex)

    }

    updateRemotePgmPstPfl(channelIndex: number) {
        if (!this.midiOutput) { return };
        //Update SELECT button:
        this.midiOutput.sendControlChange(
            12,
            channelIndex,
            1
        );
        this.midiOutput.sendControlChange(
            44,
            1 + (64*this.store.channels[0].channel[channelIndex].pgmOn),
            1
        );

        //Update SOLO button:
        this.midiOutput.sendControlChange(
            12,
            channelIndex,
            1
        );
        this.midiOutput.sendControlChange(
            44,
            3 + (64*this.store.channels[0].channel[channelIndex].pflOn),
            1
        );
    }
}

