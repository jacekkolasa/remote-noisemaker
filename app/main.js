import Cycle from '@cycle/core'
import {div, makeDOMDriver} from '@cycle/dom'
import {Observable} from 'rx'
import Firebase from 'firebase'
import {makeFirebaseDriver} from 'cycle-firebase'

import Player from './player'

function main(src) {
  const playerSinks = Player({
    DOM: src.DOM,
    firebase: src.firebase
  })
  const playerVTree$ = playerSinks.DOM
  const playerFirebase$ = playerSinks.firebase

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
    )
  }
}

const ref = new Firebase("https://remote-noisemaker.firebaseIO.com")
Cycle.run(main, {
  firebase: makeFirebaseDriver(ref),
  DOM: makeDOMDriver('#app')
})
