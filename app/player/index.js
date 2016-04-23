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
  return {
    currentVolume$,
    firebaseVolumeOut$: volumeChange$
  }
}

function view(state$) {
  return state$.map((volume) =>
    div([
      span(`current volume: ${volume}`),
      br(),
      button('.minus-button', '-'),
      button('.plus-button', '+')
    ])
  )
}

export default function main(src) {
  const actions = intent(src.DOM, src.firebase)
  const {currentVolume$, firebaseVolumeOut$} = model(actions)
  const audioSink = Audio({
    volume$: currentVolume$,
    audioContext$: src.audioContext$
  })
  return {
    DOM: view(currentVolume$),
    firebase: firebaseVolumeOut$
      .map(mapTo('volume')),
    audioGraph: audioSink.audioGraph
  }
}
