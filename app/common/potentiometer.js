import {div, button, span, br} from '@cycle/dom'
import {Observable} from 'rx'

function intent(DOM) {
  const clickFrom = (selector) =>
    DOM.select(selector).events("click").share()
  return Observable.merge(
    clickFrom('.minus-button').map(-1),
    clickFrom('.plus-button').map(1)
  ).share()
}

function model(relativeChange$, props$) {
  return props$
    .map(({valueStart, reduceFn}) => relativeChange$
      .startWith(0)
      .scan(reduceFn, valueStart)
    ).switch()
}

function view() {
  return Observable.of(true)
    .map(() =>
      div([
        button('.minus-button', '-'),
        button('.plus-button', '+')
      ])
    )
}

export default function main({DOM, props$}) {
  const relativeChange$ = intent(DOM)
  const state$ = model(relativeChange$, props$)
  return {
    DOM: view(),
    valueChangeAction$: state$
  }
}