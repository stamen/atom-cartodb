"use babel";

import path from "path";

import {CompositeDisposable, File} from "atom";
import * as cartodb from "./cartodb";
import "leaflet";
import "./l.control.geosearch";
import "./l.geosearch.provider.nominatim";
import NProgress from "nprogress";
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
    }, () => {
      return this.div({
        outlet: "mapView"
      });
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
      .then(project => {
        // watch all related files
        cartodb.getCartoCssFiles(project, options).forEach(f => {
          this.changeListeners.add(new File(f).onDidChange(this.projectDidChange.bind(this)));
        });

        // convert to JSON
        this.project = cartodb.compile(project, options);

        return this.project;
      })
      .then(project => {
        // send it to CartoDB for conversion to a URL template
        return new Promise((resolve, reject) => {
          return cartodb.getUrlTemplate(this.project, {
            path: path.dirname(this.projectfile),
            scale: window.devicePixelRatio
          }, (err, urlTemplate) => {
            if (err) {
              return reject(err);
            }

            return resolve(urlTemplate);
          });
        });
      })
      .then(urlTemplate => {
        console.log("Updated URL template:", urlTemplate);
        this.urlTemplate = urlTemplate;
      })
      .then(this.updateMap.bind(this))
      .catch(err => {
        console.log("Failed to get URL template:", err);

        if (err && err.body && Array.isArray(err.body.errors)) {
          this.errorControl.displayError(err.body.errors.map(x => x.replace(/Error: /, "")).join("\n").replace(/\n/g, "<br>\n"));
        }
      })
      .finally(() => {
        this.changing = false;
      });
  };

  destroy() {
    this.changeListeners.dispose();
  }

  attached() {
    this.leaflet = L.map(this.mapView[0], {
      attributionControl: false,
      center: this.center,
      scrollWheelZoom: false,
      zoom: this.zoom,
    });

    this.errorControl = new ErrorControl({
      position: "bottomleft"
    }).addTo(this.leaflet);

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

    // TODO this doesn't always display in the right place
    NProgress.configure({
      parent: ".pane.active .leaflet-container"
    });

    this.projectDidChange();
  }

  detached() {
    if (this.leaflet) {
      this.leaflet.remove();
    }
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
    return `Preview: ${this.projectFile.getBaseName()}`;
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

    this.mapLayer = L.tileLayer(this.urlTemplate)
      .addTo(this.leaflet);

    this.mapLayer.on("loading", evt => NProgress.start());
    this.mapLayer.on("tileload", evt => NProgress.inc());
    this.mapLayer.on("load", evt => NProgress.done());
  }
};

atom.deserializers.add(CartodbPreviewView);
