"use babel";

import "leaflet";
import {$, View} from "space-pen";

// TODO MapView
// see https://github.com/atom/space-pen for documentation
export default class PreviewView extends View {
  static content() {
    return this.div({
      class: "cartodb-preview native-key-bindings",
      tabindex: -1
    });
  }

  static deserialize(state) {
    return new PreviewView(state);
  }

  constructor(...args) {
    super(...args);
  }

  attached() {
    console.log("attached");
    this.map = L.map($(this.html).find(".cartodb-preview")[0], {
      center: [0, 0],
      scrollWheelZoom: false,
      zoom: 4
    });

    this.map.attributionControl.setPrefix('');

    L.tileLayer("http://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="http://cartodb.com/attributions">CartoDB</a>'
    }).addTo(this.map);
  }

  detached() {
    console.log("detached");
    this.map.remove();
  }

  serialize() {
    return {
      deserializer: "PreviewView"
    }
  }

  getTitle() {
    return "Preview";
  }

  getURI() {
    console.log("getURI");
    return "cartodb://preview/";
  }
};

atom.deserializers.add(PreviewView);
