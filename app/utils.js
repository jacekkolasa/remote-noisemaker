import {curry} from 'ramda'

export const mapTo = curry(
  (propName, val) => ({[propName]: val})
)
