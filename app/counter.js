import {div, button, span, br} from '@cycle/dom'
import {Observable} from 'rx'
import {addWithinLimits} from './utils'
import Potentiometer from './common/potentiometer'
import {add, compose} from 'ramda'

function intent(DOM) {
  return {
    startCounterClick$: DOM.select('.counter').events('click').map(true).share(),
    valueStart$: Observable.just(30) // seconds of fadeOut
  }
}

function model(actions) {
  const toggleAction$ = actions.startCounterClick$
    .startWith(false)
    .scan((acc) => !acc)
  const outputAction$ = 
    toggleAction$
    .withLatestFrom(
      actions.value$,
      (counterToggle, value) => ({value, counterToggle})
    )
  const stateDOM$ = Observable.combineLatest(
    toggleAction$,
    actions.value$,
    (toggle, value) => ({toggle, value})
  )
  return {
    stateDOM$,
    outputAction$
  }
}

function view(state$, potentioneterVDom$) {
  return Observable.combineLatest(
    state$, potentioneterVDom$,
    ({toggle, value}, potentiometer) =>
      div([
        button('.counter', `${toggle ? 'stop' : 'start'} fadeout` ),
        span('.valuee', `${value}`),
        potentiometer
      ])
    )
}

export default function main({DOM}) {
  const actions = intent(DOM)

  const potentionmeterProps$ = actions.valueStart$
    .map((value) => ({
      valueStart: value,
      reduceFn: addWithinLimits({min: 1, max: 100})
    }))
  const potentioneterSink = Potentiometer({
    DOM,
    props$: potentionmeterProps$
  })
  const valueOut$ = potentioneterSink.valueChangeAction$
  const potentioneterVDom$ = potentioneterSink.DOM

  const {stateDOM$, outputAction$} = model({
    value$: valueOut$,
    ...actions
  })

  return {
    DOM: view(stateDOM$, potentioneterVDom$),
    outputAction$
  }
}