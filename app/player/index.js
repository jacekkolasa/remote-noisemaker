import {div, button, span} from '@cycle/dom'
import isolate from '@cycle/isolate'
import {Observable} from 'rx'
import {compose, curry, identity} from 'ramda'
import {mapTo, addWithinLimits} from '../utils'
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

function model({actions, volume$, counterToggle$}) {
  const audioToggle$ = actions.startStopClick$
    .startWith(false)
    .scan((acc) => !acc)

  const volumeFadedOut$ = counterToggle$
    // select only 'turn on' events
    .filter(({counterToggle}) => counterToggle === true)
    .withLatestFrom(
      volume$,
      ({value:fadeoutTime}, volume) => {
        const fadeoutStep = volume / fadeoutTime / 4
        return Observable.timer(0, 250)
          .map((x, i) => volume - fadeoutStep * i)
          .takeWhile((volume) => volume >= 0)
    }
  ).switch()
    .share()

  const volumeMerged$ = Observable.merge(volume$, volumeFadedOut$)
    .distinctUntilChanged()

  const state$ = Observable.combineLatest(
    volumeMerged$,
    audioToggle$,
    (volume, audioToggle) => ({volume, audioToggle})
  )

  // volumeChange$ is propagated to firebase.
  // this is actually used to set the proper value of volume
  // when fadeOut is turned on (outputs to firebase and then it updates the volume$)
  // without it, after fadeOut clicking -/+ could reset the volume to old position immediately
  // making sudden loud noise
  const volumeChange$ = volume$
    // filter out first 'onNext' - to not send the first 'startWith' value back to firebase
    .filter((x, i) => i !== 0)
    // add faded out values
    .merge(volumeFadedOut$)

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
        potentiometer,
        button('.start-stop-button', `${audioToggle ? 'stop' : 'play'}`)
      ])
  )
}

export default function main({DOM, firebase, counterToggle$, audioContext$}) {
  const actions = intent(DOM, firebase, counterToggle$)

  const potentiometerProps$ = actions.volumeFromFirebase$
    .map((value) => ({
      valueStart: value,
      reduceFn: addWithinLimits(volumeExtent)
    }))
  const potentiometerSink = isolate(Potentiometer)({
    DOM,
    props$: potentiometerProps$
  })
  const valueChangeAction$ = potentiometerSink.valueChangeAction$
  const potentiometerVDom$ = potentiometerSink.DOM

  const {state$, firebaseVolumeOut$} = model({
    actions,
    volume$: valueChangeAction$,
    counterToggle$
  })

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
