"use babel";

import Backbone from "backbone";
import "leaflet";
import {allowUnsafeNewFunction} from "loophole";
import {$, View} from "space-pen";

import "../vendor/cartodb.js/jscrollpane";
import "../vendor/cartodb.js/spin";
import "../vendor/cartodb.js/lzma";
import "../vendor/cartodb.js/html-css-sanitizer-bundle";

import "../vendor/cartodb.js/cartodb";

import "../vendor/cartodb.js/core/config";
import "../vendor/cartodb.js/core/loader";
import "../vendor/cartodb.js/core/log";
import "../vendor/cartodb.js/core/model";
import "../vendor/cartodb.js/core/profiler";
import "../vendor/cartodb.js/core/sanitize";
import "../vendor/cartodb.js/core/template";
import "../vendor/cartodb.js/core/util";
import "../vendor/cartodb.js/core/view";

import "../vendor/cartodb.js/geo/ui/text";
import "../vendor/cartodb.js/geo/ui/annotation";
import "../vendor/cartodb.js/geo/ui/image";
import "../vendor/cartodb.js/geo/ui/share";
import "../vendor/cartodb.js/geo/ui/zoom";
import "../vendor/cartodb.js/geo/ui/zoom_info";
// uses underscore templating
//   see https://discuss.atom.io/t/--template-causes-unsafe-eval-error/9310
allowUnsafeNewFunction(() => require("../vendor/cartodb.js/geo/ui/legend"));
// import "../vendor/cartodb.js/geo/ui/legend";
import "../vendor/cartodb.js/geo/ui/switcher";
import "../vendor/cartodb.js/geo/ui/infowindow";
import "../vendor/cartodb.js/geo/ui/header";
import "../vendor/cartodb.js/geo/ui/search";
import "../vendor/cartodb.js/geo/ui/layer_selector";
import "../vendor/cartodb.js/geo/ui/slides_controller";
import "../vendor/cartodb.js/geo/ui/mobile";
import "../vendor/cartodb.js/geo/ui/tiles_loader";
import "../vendor/cartodb.js/geo/ui/infobox";
import "../vendor/cartodb.js/geo/ui/tooltip";
import "../vendor/cartodb.js/geo/ui/fullscreen";

import "../vendor/cartodb.js/geo/common";
import "../vendor/cartodb.js/geo/layer_definition";
import "../vendor/cartodb.js/geo/geometry";
import "../vendor/cartodb.js/geo/map";
import "../vendor/cartodb.js/geo/sublayer";

import "../vendor/cartodb.js/geo/leaflet/leaflet_base";
import "../vendor/cartodb.js/geo/leaflet/leaflet_tiledlayer";
import "../vendor/cartodb.js/geo/leaflet/leaflet_cartodb_layergroup";
import "../vendor/cartodb.js/geo/leaflet/leaflet_cartodb_layer";
import "../vendor/cartodb.js/geo/leaflet/leaflet";

import "../vendor/cartodb.js/vis/vis";
import "../vendor/cartodb.js/vis/layers";
import "../vendor/cartodb.js/vis/overlays";

import "../vendor/cartodb.js/api/layers";
import "../vendor/cartodb.js/api/vis";

Backbone.setDomLibrary($);

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
    /*
    this.map = L.map($(this.html).find(".cartodb-preview")[0], {
      center: [0, 0],
      // scrollWheelZoom: false,
      zoom: 4
    });

    this.map.attributionControl.setPrefix('');

    // L.tileLayer("http://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png", {
    //   attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="http://cartodb.com/attributions">CartoDB</a>'
    // }).addTo(this.map);

    cartodb
      .createLayer(this.map, "http://documentation.cartodb.com/api/v2/viz/2b13c956-e7c1-11e2-806b-5404a6a683d5/viz.json")
      .addTo(this.map);
    */

    // cartodb.createVis($(this.html).find(".cartodb-preview")[0], "http://documentation.cartodb.com/api/v2/viz/2b13c956-e7c1-11e2-806b-5404a6a683d5/viz.json");
    cartodb.createVis($(this.html).find(".cartodb-preview")[0], "http://wnstnsmth.cartodb.com/api/v2/viz/649eafa8-0901-11e4-99f0-0e10bcd91c2b/viz.json");
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
