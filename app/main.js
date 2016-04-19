import Cycle from '@cycle/core'
import {div, makeDOMDriver} from '@cycle/dom'
import {Observable} from 'rx'

import Player from './player'

function main(src) {
  const playerSinks = Player({
    DOM: src.DOM
  })
  const playerVTree$ = playerSinks.DOM

  return {
    DOM: Observable.combineLatest(
      playerVTree$, (player) =>
        div('.main', [
          player
        ])
    )
  }
}

Cycle.run(main, {
  DOM: makeDOMDriver('#app')
})
