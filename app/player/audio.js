import {Observable} from 'rx'

function getNoiseBuffer(audioContext, volume) {
  const {sampleRate} = audioContext
  const buffer = audioContext.createBuffer(1, sampleRate * 2, sampleRate)
  const output = buffer.getChannelData(0)
  for (var i = 0; i <= output.length; i++) {
    output[i] = (Math.random() * 2 - 1) / (4 * volume) //(10 - volume)
  }
  return buffer;
}

export default function main({volume$, audioContext$}) {
  const graph$ =
    Observable.combineLatest(audioContext$, volume$, (audioContext, volume) => {
      const {currentTime} = audioContext
      const buffer = getNoiseBuffer(audioContext, volume)
      return {
        0: ['gain', 'output', {gain: 0.06}],
        1: ['bufferSource', 'output', {
          buffer,
          loop: true,
          startTime: currentTime,
          stopTime: currentTime + 1
        }]
      }
    })
  return {
    audioGraph: graph$
  }
}
