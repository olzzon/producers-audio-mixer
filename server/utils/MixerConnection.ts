import { store, state } from '../reducers/store'
import { remoteConnections } from '../mainClasses'

//Utils:
import { MixerProtocolPresets } from '../constants/MixerProtocolPresets'
import {
    IMixerProtocol,
    IMixerProtocolGeneric,
    ICasparCGMixerGeometry,
} from '../constants/MixerProtocolInterface'
import { OscMixerConnection } from './mixerConnections/OscMixerConnection'
import { MidiMixerConnection } from './mixerConnections/MidiMixerConnection'
import { QlClMixerConnection } from './mixerConnections/YamahaQlClConnection'
import { SSLMixerConnection } from './mixerConnections/SSLMixerConnection'
import { EmberMixerConnection } from './mixerConnections/EmberMixerConnection'
import { LawoRubyMixerConnection } from './mixerConnections/LawoRubyConnection'
import { StuderMixerConnection } from './mixerConnections/StuderMixerConnection'
import { StuderVistaMixerConnection } from './mixerConnections/StuderVistaMixerConnection'
import { CasparCGConnection } from './mixerConnections/CasparCGConnection'
import { IChannel, IchConnection } from '../reducers/channelsReducer'
import {
    storeFadeActive,
    storeSetOutputLevel,
} from '../reducers/channelActions'
import { SET_FADER_LEVEL } from '../reducers/faderActions'

// FADE_INOUT_SPEED defines the resolution of the fade in ms
// The lower the more CPU
const FADE_INOUT_SPEED = 3

export class MixerGenericConnection {
    store: any
    mixerProtocol: IMixerProtocolGeneric[]
    mixerConnection: any[]
    timer: any
    fadeActiveTimer: any

    constructor() {
        this.updateOutLevels = this.updateOutLevels.bind(this)
        this.updateOutLevel = this.updateOutLevel.bind(this)
        this.fadeInOut = this.fadeInOut.bind(this)
        this.fadeUp = this.fadeUp.bind(this)
        this.fadeDown = this.fadeDown.bind(this)
        this.clearTimer = this.clearTimer.bind(this)
        this.mixerProtocol = []
        this.mixerConnection = []
        // Get mixer protocol
        state.settings[0].mixers.forEach((none: any, index: number) => {
            this.mixerProtocol.push(
                MixerProtocolPresets[
                    state.settings[0].mixers[index].mixerProtocol
                ] || MixerProtocolPresets.sslSystemT
            )
            this.mixerConnection.push({})
            if (this.mixerProtocol[index].protocol === 'OSC') {
                this.mixerConnection[index] = new OscMixerConnection(
                    this.mixerProtocol[index] as IMixerProtocol,
                    index
                )
            } else if (this.mixerProtocol[index].protocol === 'QLCL') {
                this.mixerConnection[index] = new QlClMixerConnection(
                    this.mixerProtocol[index] as IMixerProtocol,
                    index
                )
            } else if (this.mixerProtocol[index].protocol === 'MIDI') {
                this.mixerConnection[index] = new MidiMixerConnection(
                    this.mixerProtocol[index] as IMixerProtocol,
                    index
                )
            } else if (this.mixerProtocol[index].protocol === 'CasparCG') {
                this.mixerConnection[index] = new CasparCGConnection(
                    this.mixerProtocol[index] as ICasparCGMixerGeometry,
                    index
                )
            } else if (this.mixerProtocol[index].protocol === 'EMBER') {
                this.mixerConnection[index] = new EmberMixerConnection(
                    this.mixerProtocol[index] as IMixerProtocol,
                    index
                )
            } else if (this.mixerProtocol[index].protocol === 'LAWORUBY') {
                this.mixerConnection[index] = new LawoRubyMixerConnection(
                    this.mixerProtocol[index] as IMixerProtocol,
                    index
                )
            } else if (this.mixerProtocol[index].protocol === 'STUDER') {
                this.mixerConnection[index] = new StuderMixerConnection(
                    this.mixerProtocol[index] as IMixerProtocol,
                    index
                )
            } else if (this.mixerProtocol[index].protocol === 'VISTA') {
                this.mixerConnection[index] = new StuderVistaMixerConnection(
                    this.mixerProtocol[index] as IMixerProtocol,
                    index
                )
            } else if (this.mixerProtocol[index].protocol === 'SSL') {
                this.mixerConnection[index] = new SSLMixerConnection(
                    this.mixerProtocol[index] as IMixerProtocol,
                    index
                )
            }
        })

        //Setup timers for fade in & out
        this.timer = new Array(state.channels[0].chConnection[0].channel.length)
        this.fadeActiveTimer = new Array(
            state.channels[0].chConnection[0].channel.length
        )
    }

    getPresetFileExtention(): string {
        return this.mixerProtocol[0].presetFileExtension || ''
    }

    loadMixerPreset(presetName: string) {
        //TODO: atm mixer presets only supports first mixer connected to Sisyfos
        this.mixerConnection[0].loadMixerPreset(presetName)
    }

    checkForAutoResetThreshold(channel: number) {
        if (
            state.faders[0].fader[channel].faderLevel <=
            state.settings[0].autoResetLevel / 100
        ) {
            store.dispatch({
                type: SET_FADER_LEVEL,
                channel: channel,
                level: this.mixerProtocol[0].fader.zero,
            })
        }
    }

    updateFadeToBlack() {
        state.faders[0].fader.forEach((channel: any, index: number) => {
            this.updateOutLevel(index)
        })
    }

    updateOutLevels() {
        state.faders[0].fader.forEach((channel: any, index: number) => {
            this.updateOutLevel(index)
            this.updateNextAux(index)
        })
    }

    updateOutLevel(faderIndex: number, fadeTime: number = -1) {
        if (fadeTime === -1) {
            if (state.faders[0].fader[faderIndex].voOn) {
                fadeTime = state.settings[0].voFadeTime
            } else {
                fadeTime = state.settings[0].fadeTime
            }
        }

        state.channels[0].chConnection.forEach(
            (chConnection: IchConnection, mixerIndex: number) => {
                chConnection.channel.forEach(
                    (channel: IChannel, channelIndex: number) => {
                        if (faderIndex === channel.assignedFader) {
                            this.fadeInOut(mixerIndex, channelIndex, fadeTime)
                        }
                    }
                )
            }
        )

        if (remoteConnections) {
            remoteConnections.updateRemoteFaderState(
                faderIndex,
                state.faders[0].fader[faderIndex].faderLevel
            )
        }
    }

    updateInputGain(faderIndex: number) {
        let level = state.faders[0].fader[faderIndex].inputGain
        state.channels[0].chConnection.forEach(
            (chConnection: IchConnection) => {
                chConnection.channel.forEach(
                    (channel: IChannel, channelIndex: number) => {
                        if (faderIndex === channel.assignedFader) {
                            this.mixerConnection[0].updateInputGain(
                                channelIndex,
                                level
                            )
                        }
                    }
                )
            }
        )
    }

    updateInputSelector(faderIndex: number) {
        let inputSelected = state.faders[0].fader[faderIndex].inputSelector
        console.log(faderIndex, inputSelected)
        state.channels[0].chConnection.forEach(
            (chConnection: IchConnection) => {
                chConnection.channel.forEach(
                    (channel: IChannel, channelIndex: number) => {
                        if (faderIndex === channel.assignedFader) {
                            this.mixerConnection[0].updateInputSelector(
                                channelIndex,
                                inputSelected
                            )
                        }
                    }
                )
            }
        )
    }

    updatePflState(channelIndex: number) {
        this.mixerConnection[0].updatePflState(channelIndex)
    }

    updateMuteState(faderIndex: number) {
        state.channels[0].chConnection.forEach(
            (chConnection: IchConnection) => {
                chConnection.channel.forEach(
                    (channel: IChannel, channelIndex: number) => {
                        if (faderIndex === channel.assignedFader) {
                            this.mixerConnection[0].updateMuteState(
                                channelIndex,
                                state.faders[0].fader[faderIndex].muteOn
                            )
                        }
                    }
                )
            }
        )
    }

    updateAMixState(faderIndex: number) {
        state.channels[0].chConnection.forEach(
            (chConnection: IchConnection) => {
                chConnection.channel.forEach(
                    (channel: IChannel, channelIndex: number) => {
                        if (faderIndex === channel.assignedFader) {
                            this.mixerConnection[0].updateAMixState(
                                channelIndex,
                                state.faders[0].fader[faderIndex].amixOn
                            )
                        }
                    }
                )
            }
        )
    }

    updateNextAux(faderIndex: number) {
        let level = 0
        if (state.faders[0].fader[faderIndex].pstOn) {
            level = state.faders[0].fader[faderIndex].faderLevel
        } else if (state.faders[0].fader[faderIndex].pstVoOn) {
            level =
                (state.faders[0].fader[faderIndex].faderLevel *
                    (100 - state.settings[0].voLevel)) /
                100
        }
        state.channels[0].chConnection.forEach(
            (chConnection: IchConnection) => {
                chConnection.channel.forEach(
                    (channel: IChannel, channelIndex: number) => {
                        if (faderIndex === channel.assignedFader) {
                            this.mixerConnection[0].updateNextAux(
                                channelIndex,
                                level
                            )
                        }
                    }
                )
            }
        )
    }

    updateThreshold(faderIndex: number) {
        let level = state.faders[0].fader[faderIndex].threshold
        state.channels[0].chConnection.forEach(
            (chConnection: IchConnection) => {
                chConnection.channel.forEach(
                    (channel: IChannel, channelIndex: number) => {
                        if (faderIndex === channel.assignedFader) {
                            this.mixerConnection[0].updateThreshold(
                                channelIndex,
                                level
                            )
                        }
                    }
                )
            }
        )
    }
    updateRatio(faderIndex: number) {
        let level = state.faders[0].fader[faderIndex].ratio
        state.channels[0].chConnection.forEach(
            (chConnection: IchConnection) => {
                chConnection.channel.forEach(
                    (channel: IChannel, channelIndex: number) => {
                        if (faderIndex === channel.assignedFader) {
                            this.mixerConnection[0].updateRatio(
                                channelIndex,
                                level
                            )
                        }
                    }
                )
            }
        )
    }
    updateDelayTime(faderIndex: number) {
        let delayTime = state.faders[0].fader[faderIndex].delayTime
        state.channels[0].chConnection.forEach(
            (chConnection: IchConnection) => {
                chConnection.channel.forEach(
                    (channel: IChannel, channelIndex: number) => {
                        if (faderIndex === channel.assignedFader) {
                            this.mixerConnection[0].updateDelayTime(
                                channelIndex,
                                delayTime
                            )
                        }
                    }
                )
            }
        )
    }
    updateLow(faderIndex: number) {
        let level = state.faders[0].fader[faderIndex].low
        state.channels[0].chConnection.forEach(
            (chConnection: IchConnection) => {
                chConnection.channel.forEach(
                    (channel: IChannel, channelIndex: number) => {
                        if (faderIndex === channel.assignedFader) {
                            this.mixerConnection[0].updateLow(
                                channelIndex,
                                level
                            )
                        }
                    }
                )
            }
        )
    }
    updateLoMid(faderIndex: number) {
        let level = state.faders[0].fader[faderIndex].loMid
        state.channels[0].chConnection.forEach(
            (chConnection: IchConnection) => {
                chConnection.channel.forEach(
                    (channel: IChannel, channelIndex: number) => {
                        if (faderIndex === channel.assignedFader) {
                            this.mixerConnection[0].updateLoMid(
                                channelIndex,
                                level
                            )
                        }
                    }
                )
            }
        )
    }
    updateMid(faderIndex: number) {
        let level = state.faders[0].fader[faderIndex].mid
        state.channels[0].chConnection.forEach(
            (chConnection: IchConnection) => {
                chConnection.channel.forEach(
                    (channel: IChannel, channelIndex: number) => {
                        if (faderIndex === channel.assignedFader) {
                            this.mixerConnection[0].updateMid(
                                channelIndex,
                                level
                            )
                        }
                    }
                )
            }
        )
    }
    updateHigh(faderIndex: number) {
        let level = state.faders[0].fader[faderIndex].high
        state.channels[0].chConnection.forEach(
            (chConnection: IchConnection) => {
                chConnection.channel.forEach(
                    (channel: IChannel, channelIndex: number) => {
                        if (faderIndex === channel.assignedFader) {
                            this.mixerConnection[0].updateHigh(
                                channelIndex,
                                level
                            )
                        }
                    }
                )
            }
        )
    }

    updateAuxLevel(channelIndex: number, auxSendIndex: number) {
        let channel = state.channels[0].chConnection[0].channel[channelIndex]
        if (channel.auxLevel[auxSendIndex] > -1) {
            this.mixerConnection[0].updateAuxLevel(
                channelIndex,
                auxSendIndex,
                channel.auxLevel[auxSendIndex]
            )
        }
    }

    updateChannelName(channelIndex: number) {
        this.mixerConnection[0].updateChannelName(channelIndex)
    }

    injectCommand(command: string[]) {
        this.mixerConnection[0].injectCommand(command)
    }

    updateChannelSettings(
        channelIndex: number,
        setting: string,
        value: string
    ) {
        if (this.mixerProtocol[0].protocol === 'CasparCG') {
            this.mixerConnection[0].updateChannelSetting(
                channelIndex,
                setting,
                value
            )
        }
    }

    clearTimer(channelIndex: number) {
        clearInterval(this.timer[channelIndex])
    }

    delayedFadeActiveDisable(channelIndex: number) {
        this.fadeActiveTimer[channelIndex] = setTimeout(() => {
            store.dispatch(storeFadeActive(channelIndex, false))
        }, state.settings[0].mixers[0].protocolLatency)
    }

    fadeInOut(mixerIndex: number, channelIndex: number, fadeTime: number) {
        let faderIndex =
            state.channels[0].chConnection[mixerIndex].channel[channelIndex]
                .assignedFader
        if (
            !state.faders[0].fader[faderIndex].pgmOn &&
            !state.faders[0].fader[faderIndex].voOn &&
            state.channels[0].chConnection[mixerIndex].channel[channelIndex]
                .outputLevel === 0
        ) {
            return
        }
        //Clear Old timer or set Fade to active:
        if (
            state.channels[0].chConnection[mixerIndex].channel[channelIndex]
                .fadeActive
        ) {
            clearInterval(this.fadeActiveTimer[channelIndex])
            this.clearTimer(channelIndex)
        }
        store.dispatch(storeFadeActive(channelIndex, true))
        if (
            state.faders[0].fader[faderIndex].pgmOn ||
            state.faders[0].fader[faderIndex].voOn
        ) {
            this.fadeUp(mixerIndex, channelIndex, fadeTime, faderIndex)
        } else {
            this.fadeDown(mixerIndex, channelIndex, fadeTime)
        }
    }

    fadeUp(
        mixerIndex: number,
        channelIndex: number,
        fadeTime: number,
        faderIndex: number
    ) {
        let outputLevel =
            state.channels[0].chConnection[mixerIndex].channel[channelIndex]
                .outputLevel
        let targetVal = state.faders[0].fader[faderIndex].faderLevel

        if (state.faders[0].fader[faderIndex].voOn) {
            targetVal = (targetVal * (100 - state.settings[0].voLevel)) / 100
        }
        const step: number =
            (targetVal - outputLevel) / (fadeTime / FADE_INOUT_SPEED)
        const dispatchResolution: number =
            this.mixerProtocol[mixerIndex].FADE_DISPATCH_RESOLUTION * step
        let dispatchTrigger: number = 0
        this.clearTimer(channelIndex)

        if (targetVal < outputLevel) {
            this.timer[channelIndex] = setInterval(() => {
                outputLevel += step
                dispatchTrigger += step

                if (dispatchTrigger > dispatchResolution) {
                    this.mixerConnection[mixerIndex].updateFadeIOLevel(
                        channelIndex,
                        outputLevel
                    )
                    store.dispatch(
                        storeSetOutputLevel(channelIndex, outputLevel)
                    )
                    dispatchTrigger = 0
                }

                if (outputLevel <= targetVal) {
                    outputLevel = targetVal
                    this.mixerConnection[mixerIndex].updateFadeIOLevel(
                        channelIndex,
                        outputLevel
                    )
                    this.clearTimer(channelIndex)

                    store.dispatch(
                        storeSetOutputLevel(channelIndex, outputLevel)
                    )
                    this.delayedFadeActiveDisable(channelIndex)
                    return true
                }
            }, FADE_INOUT_SPEED)
        } else {
            this.timer[channelIndex] = setInterval(() => {
                outputLevel += step
                dispatchTrigger += step
                this.mixerConnection[mixerIndex].updateFadeIOLevel(
                    channelIndex,
                    outputLevel
                )

                if (dispatchTrigger > dispatchResolution) {
                    store.dispatch(
                        storeSetOutputLevel(channelIndex, outputLevel)
                    )
                    dispatchTrigger = 0
                }

                if (outputLevel >= targetVal) {
                    outputLevel = targetVal
                    this.mixerConnection[mixerIndex].updateFadeIOLevel(
                        channelIndex,
                        outputLevel
                    )
                    this.clearTimer(channelIndex)
                    store.dispatch(
                        storeSetOutputLevel(channelIndex, outputLevel)
                    )
                    this.delayedFadeActiveDisable(channelIndex)
                    return true
                }
            }, FADE_INOUT_SPEED)
        }
    }

    fadeDown(mixerIndex: number, channelIndex: number, fadeTime: number) {
        let outputLevel =
            state.channels[0].chConnection[mixerIndex].channel[channelIndex]
                .outputLevel
        const step = outputLevel / (fadeTime / FADE_INOUT_SPEED)
        const dispatchResolution: number =
            this.mixerProtocol[mixerIndex].FADE_DISPATCH_RESOLUTION * step
        let dispatchTrigger: number = 0

        this.clearTimer(channelIndex)

        this.timer[channelIndex] = setInterval(() => {
            outputLevel -= step
            dispatchTrigger += step
            this.mixerConnection[mixerIndex].updateFadeIOLevel(
                channelIndex,
                outputLevel
            )

            if (dispatchTrigger > dispatchResolution) {
                store.dispatch(storeSetOutputLevel(channelIndex, outputLevel))
                dispatchTrigger = 0
            }

            if (outputLevel <= 0) {
                outputLevel = 0
                this.mixerConnection[mixerIndex].updateFadeIOLevel(
                    channelIndex,
                    outputLevel
                )
                this.clearTimer(channelIndex)
                store.dispatch(storeSetOutputLevel(channelIndex, outputLevel))
                this.delayedFadeActiveDisable(channelIndex)
                return true
            }
        }, FADE_INOUT_SPEED)
    }
}
