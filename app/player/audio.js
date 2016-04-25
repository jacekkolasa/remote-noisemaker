import {Observable} from 'rx'
import {volume as volumeExtent} from '../settings'

// All 'DB' symbols in this file mean decibells, not database
const minimalPositiveDB = -30
const maxValDB = 0

function getDB(volume, {min, max}) {
  if (volume === 0) {
    return -Infinity
  }
  return minimalPositiveDB + ((volume / (max - min)) * (maxValDB - minimalPositiveDB))
}


/**
 * @function calibrateVolume
 * @description transform input volume value so it correspond how human ear perceives it
 * for example, on scale given scale from min=0, max=10, minimalPositiveDB = -30, the value in decibells would be:
 * 0 - -Infinity dB
 * 1 - -30 dB
 * 2 - -27 dB
 * 3 - -23 dB
 * 4 - -20 dB
 * ...
 * 9 - -3  dB
 * 10- 0   dB
 * note that 0 volume is special, as it represents no signal, meaning -Infinity dB
 *
 * @param {Number} volume, representing the visible to user value (subjective scale)
 * @param {Object} volume range
 *  @param min minimum volume value
 *  @param max maximum volume value
 *
 * @return {Number} value between 0 and 1 by which the signal should be multiplied
 *    to reduce the subjective sense of loudness by aforementioned dB values
 */
function calibratedVolume(volume, {min, max}) {
  const reducedInDecibells = getDB(volume, {min, max})
  return Math.pow(10, reducedInDecibells / 10)
}

function getNoiseBuffer(audioContext, volume) {
  const {sampleRate} = audioContext
  const buffer = audioContext.createBuffer(1, sampleRate * 2, sampleRate)
  const output = buffer.getChannelData(0)
  const calibratedVolumeMultiplier = calibratedVolume(volume, volumeExtent)
  for (var i = 0; i <= output.length; i++) {
    output[i] = (Math.random() * 2 - 1) * calibratedVolumeMultiplier //(10 - volume)
  }
  return buffer;
}

export default function main({settings$, audioContext$}) {
  const graph$ =
    Observable.combineLatest(
      audioContext$, settings$,
      (audioContext, {volume, audioToggle}) => {
        const {currentTime} = audioContext
        const buffer = getNoiseBuffer(audioContext, volume)
        return {
          0: ['gain', 'output', {gain: 0.06}],
          1: ['bufferSource', 'output', {
            buffer,
            loop: true,
            startTime: currentTime,
            stopTime: audioToggle ? null : currentTime
          }]
        }
    })
  return {
    audioGraph: graph$
  }
}
