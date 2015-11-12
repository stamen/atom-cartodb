"use babel";

import * as actions from "../actions";

const INITIAL_STATE = {};

export default function rootReducer(state = INITIAL_STATE, action) {
  switch (action.type) {
  case actions.SET_ACTIVE:
    return {
      ...state,
      active: (state.active || 0) + 1
    };

  case actions.SET_CENTER:
    return {
      ...state,
      center: action.center
    };

  case actions.SET_ERROR:
    return {
      ...state,
      error: action.error
    };

  case actions.SET_FLEX_SCALE:
    return {
      ...state,
      flexScale: action.flexScale
    };

  case actions.SET_LAYERS:
    return {
      ...state,
      layers: action.layers
    };

  case actions.SET_VIEW:
    return {
      ...state,
      center: action.center,
      zoom: action.zoom
    };

  case actions.SET_ZOOM:
    return {
      ...state,
      zoom: action.zoom
    };

  default:
    return state;
  }
}
