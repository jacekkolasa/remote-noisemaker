import {add, curry, compose} from 'ramda'

export const mapTo = curry(
  (propName, val) => ({[propName]: val})
)

export const limit = curry(({min, max}, val) => {
  return Math.min(Math.max(min, val), max)
})

export const addWithinLimits = (extent) => compose(limit(extent), add)
