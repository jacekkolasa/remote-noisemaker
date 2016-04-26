import {div, button, span, br} from '@cycle/dom'
import isolate from '@cycle/isolate'
import {Observable} from 'rx'
import {add, compose, curry, identity} from 'ramda'
import {mapTo, limit} from '../utils'
import {volume as volumeExtent} from '../settings'
import Audio from './audio'
import Potentiometer from '../common/potentiometer'

function intent(DOM, firebase) {
  const clickFrom = (selector) =>
    DOM.select(selector).events("click").map(true).share()
  return {
    startStopClick$: clickFrom('.start-stop-button'),
    volumeFromFirebase$: firebase.get('volume')
      .distinctUntilChanged()
      .startWith(5)
      .share()
  }
}

const addWithinLimits = compose(limit(volumeExtent), add)

function model({actions, valueChangeAction$}) {
  // filter out first 'onNext' - to not send the first 'startWith' value back to firebase
  const volumeChange$ = valueChangeAction$.filter((x, i) => i !== 0)
  const audioToggle$ = actions.startStopClick$
    .startWith(false)
    .scan((acc) => !acc)
  const state$ = Observable.combineLatest(
    valueChangeAction$, audioToggle$, (volume, audioToggle) => ({volume, audioToggle})
  )
  return {
    state$,
    firebaseVolumeOut$: volumeChange$
  }
}

function view(state$, potentiometerVDom$) {
  return Observable.combineLatest(
    state$,
    potentiometerVDom$,
    ({volume, audioToggle}, potentiometer) =>
      div([
        span(`current volume: ${volume}`),
        br(),
        potentiometer,
        button('.start-stop-button', audioToggle ? 'stop' : 'start')
      ])
  )
}

export default function main({DOM, firebase, audioContext$}) {
  const actions = intent(DOM, firebase)

  const potentiometerProps$ = actions.volumeFromFirebase$
    .map((value) => ({
      valueStart: value,
      reduceFn:addWithinLimits
    }))
  const potentiometerSink = isolate(Potentiometer)({
    DOM,
    props$: potentiometerProps$
  })
  const valueChangeAction$ = potentiometerSink.valueChangeAction$
  const potentiometerVDom$ = potentiometerSink.DOM

  const {state$, firebaseVolumeOut$} = model({actions, valueChangeAction$})

  const audioSink = Audio({
    settings$: state$,
    audioContext$: audioContext$
  })

  return {
    DOM: view(state$, potentiometerVDom$),
    firebase: firebaseVolumeOut$
      .map(mapTo('volume')),
    audioGraph: audioSink.audioGraph
  }
}
