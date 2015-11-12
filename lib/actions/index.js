"use babel";

import Leaflet from "leaflet";

// convert to a consistent internal representation to avoid repeated updates
function makeLatLng(point) {
  if (Array.isArray(point)) {
    return new Leaflet.LatLng(point[0], point[1]);
  }

  if (!(point instanceof Leaflet.LatLng) &&
      point.lat != null &&
      point.lng != null) {
    return new Leaflet.LatLng(point.lat, point.lng);
  }

  return point;
}

export const SET_ACTIVE = "SET_ACTIVE";
export function setActive() {
  return {
    type: SET_ACTIVE
  };
}

export const SET_CENTER = "SET_CENTER";
export function setCenter(center) {
  return {
    type: SET_CENTER,
    center: makeLatLng(center)
  };
}

export const SET_ERROR = "SET_ERROR";
export function setError(error) {
  return {
    type: SET_ERROR,
    error
  };
}

export const SET_FLEX_SCALE = "SET_FLEX_SCALE";
export function setFlexScale(flexScale) {
  return {
    type: SET_FLEX_SCALE,
    flexScale
  };
}

export const SET_LAYERS = "SET_LAYERS";
export function setLayers(layers) {
  return {
    type: SET_LAYERS,
    layers
  };
}

export const SET_VIEW = "SET_VIEW";
export function setView(center, zoom) {
  return {
    type: SET_VIEW,
    center: makeLatLng(center),
    zoom
  };
}

export const SET_ZOOM = "SET_ZOOM";
export function setZoom(zoom) {
  return {
    type: SET_ZOOM,
    zoom
  };
}
