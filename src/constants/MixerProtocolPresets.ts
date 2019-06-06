import { ArdourMaster } from './mixerProtocols/ardourMaster';
import { Reaper } from './mixerProtocols/reaper';
import { ReaperMaster } from './mixerProtocols/reaperMaster';
import { BehringerXrMaster } from './mixerProtocols/behringerXrMaster';
import { BehringerXrClient } from './mixerProtocols/behringerXrClient';
import { MidasMaster } from './mixerProtocols/midasMaster';
import { MidasClient } from './mixerProtocols/midasClient';
import { GenericMidi } from './mixerProtocols/genericMidi';
import { CasparCGMaster } from './mixerProtocols/casparCGMaster';

export interface IMixerProtocolGeneric {
    protocol: string,
    label: string,
    mode: string
    fader: {
        min: number
        max: number
        zero: number
        step: number
        fadeTime: number
    },
    meter: {
        min: number,
        max: number,
        zero: number,
        test: number,
    }
}

export interface IMixerProtocol extends IMixerProtocolGeneric{
    leadingZeros: boolean,
    pingCommand: Array<IMessageProtocol>,
    pingTime: number,
    initializeCommands: Array<IMessageProtocol>,
    fromMixer: {
        CHANNEL_FADER_LEVEL: string,
        CHANNEL_OUT_GAIN: string,
        CHANNEL_VU: string,
        CHANNEL_NAME: string,
        GRP_OUT_GAIN: string,
        GRP_VU: string,
        GRP_NAME: string,
        PFL: string
    },
    toMixer: {
        CHANNEL_FADER_LEVEL: string,
        CHANNEL_OUT_GAIN: string,
        GRP_OUT_GAIN: string,
        PFL_ON: IMessageProtocol,
        PFL_OFF: IMessageProtocol
    }
}

export interface ChannelLayerPair {
    channel: number
    layer: number
}

export interface ICasparCGMixerGeometryFile {
    label?: string,
    channelLabels?: string[],
    PGM_CHANNEL_FADER_LEVEL: Array<ChannelLayerPair[]>,
    MONITOR_CHANNEL_FADER_LEVEL: Array<ChannelLayerPair[]>
} 

export interface ICasparCGMixerGeometry extends IMixerProtocolGeneric {
    studio: string,
    leadingZeros: boolean,
    pingTime: number,
    fromMixer: {
        CHANNEL_FADER_LEVEL: string,
        CHANNEL_OUT_GAIN: string,
        CHANNEL_VU: string,
    },
    toMixer: {
        PGM_CHANNEL_FADER_LEVEL: Array<ChannelLayerPair[]>,
        MONITOR_CHANNEL_FADER_LEVEL: Array<ChannelLayerPair[]>,
    }
    channelLabels?: string[]
}

interface IMessageProtocol {
    oscMessage: string,
    value: any,
    type: string
}

export const MixerProtocolPresets: { [key: string]: IMixerProtocolGeneric } = Object.assign({
    ardourMaster: ArdourMaster,
    reaper: Reaper,
    reaperMaster: ReaperMaster,
    behringerxrmaster: BehringerXrMaster,
    behringerxrclient: BehringerXrClient,
    midasMaster: MidasMaster,
    midasClient: MidasClient,
    genericMidi: GenericMidi
}, CasparCGMaster !== undefined ? {
    casparCGMaster: CasparCGMaster
} : {});


export const MixerProtocolList = Object.getOwnPropertyNames(MixerProtocolPresets).map((preset) => {
    return {
        value: preset,
        label: MixerProtocolPresets[preset].label
    };
});
