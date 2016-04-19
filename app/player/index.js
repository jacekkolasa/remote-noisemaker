import {div, button, span, br} from '@cycle/dom'
import {Observable} from 'rx'

export default function main(src) {
  const clickFrom = (selector) =>
    src.DOM.select(selector).events("click").map((e) => true).share()

  const minusClick$ = clickFrom('.minus-button').map(-1)
  const plusClick$ = clickFrom('.plus-button').map(1)

  const volume$ = Observable.merge(minusClick$, plusClick$)
    .startWith(5)
    .scan((acc, x) => acc + x)

  return {
    DOM: Rx.Observable.combineLatest(
      volume$, (volume) =>
        div([
          span(`current volue: ${volume}`),
          br(),
          button('.minus-button', '-'),
          button('.plus-button', '+')
        ])
      )
  }
}