import Cycle from '@cycle/core'
import {label, h1, h2, p, div, makeDOMDriver} from '@cycle/dom'
import {Observable} from 'rx'
import Firebase from 'firebase'
import {makeFirebaseDriver} from 'cycle-firebase'
import makeAudioGraphDriver from 'cycle-audio-graph'

import Player from './player'
import Counter from './counter'

function main({DOM, firebase, audioContext$}) {
  const counterSinks = Counter({
    DOM
  })
  const counterVTree$ = counterSinks.DOM
  const counterToggle$ = counterSinks.outputAction$
  const playerSinks = Player({
    DOM,
    firebase,
    audioContext$,
    counterToggle$
  })
  const playerVTree$ = playerSinks.DOM
  const playerFirebase$ = playerSinks.firebase
  const playerAudioGraph$ = playerSinks.audioGraph

  return {
    DOM: Observable.combineLatest(
      playerVTree$, counterVTree$,
      (player, counter) =>
        div('.main', [
          h1('Remote Noisemaker'),
          h2('To help putting the newborn to sleep...'),
          p(`Start the app on two machines, possible on the cell phone near children's bed
          and on your computer in the other room. The volume of the noise can be controlled
          by either of the machines.
          `),
          player,
          h2('When the baby is asleep fire a slow fadeout'),
          counter
        ])
    ),
    firebase: Observable.combineLatest(
      playerFirebase$, (playerFirebase) => {
        return playerFirebase;
      }
    ),
    audioGraph: playerAudioGraph$
  }
}

const ref = new Firebase("https://remote-noisemaker.firebaseIO.com")
const audioContext = new AudioContext()
Cycle.run(main, {
  firebase: makeFirebaseDriver(ref),
  DOM: makeDOMDriver('#app'),
  audioGraph: makeAudioGraphDriver({
    audioContext,
    output: audioContext.destination
  }),
  audioContext$: () => Observable.of(audioContext)
})
