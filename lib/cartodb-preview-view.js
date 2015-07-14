"use babel";

import path from "path";

import {CompositeDisposable, File} from "atom";
import * as cartodb from "./cartodb";
import "leaflet";
import {$, View} from "space-pen";

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
    this.urlTemplate = null;
    this.center = state.center || [0, 0];
    this.zoom = state.zoom || 4;
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
      center: this.center,
      scrollWheelZoom: false,
      zoom: this.zoom
    });

    this.leaflet.attributionControl.setPrefix('');
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

    this.mapLayer = L.tileLayer(this.urlTemplate)
      .addTo(this.leaflet);
  }
};

atom.deserializers.add(CartodbPreviewView);
