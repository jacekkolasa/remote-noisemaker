import {div, button, span, br} from '@cycle/dom'
import {Observable} from 'rx'

export default function main(src) {
  const clickFrom = (selector) =>
    src.DOM.select(selector).events("click").map((e) => true).share()

  const minusClick$ = clickFrom('.minus-button').map(-1)
  const plusClick$ = clickFrom('.plus-button').map(1)

  const volumeRelativeChange$ = Observable
    .merge(minusClick$, plusClick$)
    .startWith(0)

  const volumeFromFirebase$ = src.firebase.get('volume')
    .share()

  /**
   * volumeFromFirebase$:
   * --5-------------------------2---
   *
   * volumeRelativeChange$:
   * ------ -1 -------+1-- -1 -------
   *
   * volume$:
   * --5-----4---------5----4----2---
   */
  const volume$ = volumeFromFirebase$
    .map((volume) => volumeRelativeChange$
      .scan((acc, change) => acc + change, volume)
    ).switch()
    .distinctUntilChanged()
    .share()

  const volumeToDOM$ = volume$.startWith(5)
  const volumeChange$ = volume$.filter((x, i) => i !== 0)

  return {
    DOM: Rx.Observable.combineLatest(
      volumeToDOM$, (volume) =>
        div([
          span(`current volue: ${volume}`),
          br(),
          button('.minus-button', '-'),
          button('.plus-button', '+')
        ])
    ),
    firebase: volumeChange$.map((volume) => ({
        volume
      })
    )
  }
}