import Cycle from '@cycle/core'
import {div, makeDOMDriver} from '@cycle/dom'
import {Observable} from 'rx'
import Firebase from 'firebase'
import {makeFirebaseDriver} from 'cycle-firebase'
import makeAudioGraphDriver from 'cycle-audio-graph'

import Player from './player'

function main({DOM, firebase, audioContext$}) {
  const playerSinks = Player({
    DOM,
    firebase,
    audioContext$
  })
  const playerVTree$ = playerSinks.DOM
  const playerFirebase$ = playerSinks.firebase
  const playerAudioGraph$ = playerSinks.audioGraph

  return {
    DOM: Observable.combineLatest(
      playerVTree$, (player) =>
        div('.main', [
          player
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
