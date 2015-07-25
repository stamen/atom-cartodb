"use babel";

import path from "path";

import {CompositeDisposable, File} from "atom";
import * as cartodb from "./cartodb";
import "leaflet";
import "./l.control.geosearch";
import "./l.geosearch.provider.nominatim";
import NProgress from "nprogress";
import request from "request";
import {$, View} from "space-pen";

import ErrorControl from "./l.control.error";
import ShowLocationControl from "./l.control.showlocation";
import ShowUrlControl from "./l.control.showurl";
import ShowZoomControl from "./l.control.showzoom";

// see https://github.com/atom/space-pen for documentation
export default class CartodbPreviewView extends View {
  static content() {
    return this.div({
      class: "cartodb-preview native-key-bindings",
      tabindex: -1
    });
  }

  static deserialize(state) {
    return new CartodbPreviewView(state);
  }

  initialize(state) {
    this.changeListeners = new CompositeDisposable();

    this.projectFile = new File(state.filename);
    this.project = null;
    this.mapLayer = null;
    this.leaflet = null;
    this.errorControl = null;
    this.urlTemplate = null;
    this.center = state.center || [24.6071, -31.4648];
    this.zoom = state.zoom || 3;
    this.changing = false;

    this.projectDidChange();
  }

  projectDidChange() {
    if (this.changing) {
      return;
    }

    this.changing = true;

    // dispose and clear all change listeners
    this.changeListeners.dispose();
    this.changeListeners = new CompositeDisposable();

    const options = {
      path: path.dirname(this.projectFile.getPath())
    };

    // watch the main project file
    this.changeListeners.add(this.projectFile.onDidChange(this.projectDidChange.bind(this)));

    // load the project and convert to JSON
    this.projectFile
      .read(false)
      .then(function(project) {
        // watch all related files
        cartodb.getCartoCssFiles(project, options).forEach((f) => {
          this.changeListeners.add(new File(f).onDidChange(this.projectDidChange.bind(this)));
        });

        // convert to JSON
        this.project = cartodb.compile(project, options);

        return this.project;
      }.bind(this))
      .then((project) => {
        // send it to CartoDB for conversion to a URL template
        return new Promise((resolve, reject) => {
          return cartodb.getUrlTemplate(this.project, {
            path: path.dirname(this.projectfile)
          }, (err, urlTemplate) => {
            if (err) {
              return reject(err);
            }

            return resolve(urlTemplate);
          });
        });
      })
      .then(function(urlTemplate) {
        console.log("Updated URL template:", urlTemplate);
        this.urlTemplate = urlTemplate;

        // TODO retina tiles
      }.bind(this))
      .then(this.updateMap.bind(this))
      .catch((err) => {
        console.error(err);
        throw err;
      })
      .finally(function() {
        this.changing = false;
      }.bind(this));
  };

  destroy() {
    this.changeListeners.dispose();
  }

  attached() {
    this.leaflet = L.map($(this.html).find(".cartodb-preview")[0], {
      attributionControl: false,
      center: this.center,
      scrollWheelZoom: false,
      zoom: this.zoom,
    });

    new ShowUrlControl({
      position: "bottomleft"
    }).addTo(this.leaflet);

    new ShowLocationControl({
      position: "bottomleft"
    }).addTo(this.leaflet);

    new ShowZoomControl({
      position: "bottomleft"
    }).addTo(this.leaflet);

    new L.Control.GeoSearch({
      provider: new L.GeoSearch.Provider.Nominatim(),
      showMarker: false
    }).addTo(this.leaflet);

    NProgress.configure({
      parent: ".cartodb-preview"
    });
  }

  detached() {
    this.leaflet.remove();
  }

  serialize() {
    return {
      deserializer: "CartodbPreviewView",
      filename: this.projectFile.getPath(),
      center: this.leaflet && this.leaflet.getCenter(),
      zoom: this.leaflet && this.leaflet.getZoom()
    }
  }

  getTitle() {
    return "Preview";
  }

  getURI() {
    return `cartodb://preview${this.projectFile.getPath()}`;
  }

  updateMap() {
    if (!this.leaflet) {
      console.warn("Cannot update a nonexistent map; is this view attached?");
      return;
    }

    // remove existing tile layer
    if (this.mapLayer) {
      this.leaflet.removeLayer(this.mapLayer);
    }

    // remove existing error control
    if (this.errorControl) {
      this.leaflet.removeControl(this.errorControl);
      this.errorControl = null;
    }

    this.mapLayer = L.tileLayer(this.urlTemplate)
      .addTo(this.leaflet);

    // only pick up the first error
    this.mapLayer.once("tileerror", (evt) => {
      console.log("url:", evt.url);

      return request.get({
        json: true,
        uri: evt.url
      }, (err, rsp, body) => {
        if (err) {
          console.warn(err);
          return;
        }

        if (body.errors) {
          console.log(body.errors.join("\n\n"));

          this.errorControl = new ErrorControl(body.errors.join("\n\n")).addTo(this.leaflet);

          return;
        }

        console.warn(rsp.statusCode, body);
      });
    });

    this.mapLayer.on("loading", (evt) => {
      NProgress.start();
    });

    this.mapLayer.on("tileload", (evt) => {
      NProgress.inc();
    });

    this.mapLayer.on("load", (evt) => {
      NProgress.done();
    });
  }
};

atom.deserializers.add(CartodbPreviewView);
