import {div, button, span, br} from '@cycle/dom'
import {Observable} from 'rx'
import {add, compose, curry} from 'ramda'
import {mapTo, limit} from '../utils'
import {volume as volumeExtent} from '../settings'
import Audio from './audio'

function intent(DOM, firebase) {
  const clickFrom = (selector) =>
    DOM.select(selector).events("click").map((e) => true).share()
  return {
    minusClick$: clickFrom('.minus-button').map(-1),
    plusClick$: clickFrom('.plus-button').map(1),
    startStopClick$: clickFrom('.start-stop-button').map(1),
    volumeFromFirebase$: firebase.get('volume').share()
  }
}

const addWithinLimits = compose(limit(volumeExtent), add)

function model(actions) {
  const volumeRelativeChange$ = Observable.merge(
    actions.minusClick$,
    actions.plusClick$
  ).startWith(0)
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
  const volume$ = actions.volumeFromFirebase$
    .map((volume) => volumeRelativeChange$
      .scan(addWithinLimits, volume)
    ).switch()
    .distinctUntilChanged()
    .share()
  const currentVolume$ = volume$.startWith(5)
  // filter out first 'onNext' - to not send the same value back to firebase
  const volumeChange$ = volume$.filter((x, i) => i !== 0)
  const audioToggle$ = actions.startStopClick$
    .startWith(false)
    .scan((acc) => !acc)
  const $state = Observable.combineLatest(
    currentVolume$, audioToggle$, (volume, audioToggle) => ({volume, audioToggle})
  )
  return {
    $state,
    firebaseVolumeOut$: volumeChange$
  }
}

function view(state$) {
  return state$.map(({volume, audioToggle}) =>
    div([
      span(`current volume: ${volume}`),
      br(),
      button('.minus-button', '-'),
      button('.plus-button', '+'),
      br(),
      br(),
      button('.start-stop-button', audioToggle ? 'stop' : 'start')
    ])
  )
}

export default function main(src) {
  const actions = intent(src.DOM, src.firebase)
  const {$state, firebaseVolumeOut$} = model(actions)
  const audioSink = Audio({
    settings$: $state,
    audioContext$: src.audioContext$
  })
  return {
    DOM: view($state),
    firebase: firebaseVolumeOut$
      .map(mapTo('volume')),
    audioGraph: audioSink.audioGraph
  }
}
