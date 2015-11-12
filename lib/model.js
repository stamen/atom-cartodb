"use babel";

import assert from "assert";
import path from "path";

import {CompositeDisposable, File} from "atom";

import * as actions from "./actions";
import * as cartodb from "./cartodb";
import makeStore from "./store";

export default class CartoDBModel {
  static deserialize(state) {
    return new CartoDBModel(state);
  }

  constructor(state) {
    this.projectFile = new File(state.filename);

    this.store = makeStore({
      center: state.center || [51.505, -0.09],
      zoom: state.zoom || 13,
      layers: state.layers || [],
    });

    this.changeListeners = new CompositeDisposable();
    this.changing = false;
    this.disposables = new CompositeDisposable();

    this.projectDidChange();
  }

  serialize() {
    return {
      deserializer: "CartoDBModel",
      filename: this.projectFile.getPath(),
      center: this.center,
      zoom: this.zoom,
      layers: this.layers,
    }
  }

  dispose() {
    return this.disposables.dispose();
  }

  getTitle() {
    return `Preview: ${this.projectFile.getBaseName()}`;
  }

  getURI() {
    return `cartodb://preview${this.projectFile.getPath()}`;
  }

  getState() {
    return this.store.getState();
  }

  dispatch(action) {
    return this.store.dispatch.apply(this.store, arguments);
  }

  get center() {
    return this.getState().center;
  }

  set center(center) {
    this.dispatch(actions.setCenter(center));
  }

  get error() {
    return this.getState().error;
  }

  set error(error) {
    this.dispatch(actions.setError(error));
  }

  get layers() {
    return this.getState().layers;
  }

  set layers(layers) {
    this.dispatch(actions.setLayers(layers));
  }

  get zoom() {
    return this.getState().zoom;
  }

  set zoom(zoom) {
    this.dispatch(actions.setZoom(zoom));
  }

  setPane(pane) {
    // block unsupported behavior
    assert.ok(this.pane == null, "Cannot reset pane.");

    this.pane = pane;

    this.disposables.add(pane.onDidChangeFlexScale((flexScale) => {
      this.dispatch(actions.setFlexScale(flexScale));
    }));

    this.disposables.add(pane.onDidChangeActiveItem((item) => {
      if (item === this) {
        this.dispatch(actions.setActive());
      }
    }));
  }

  projectDidChange() {
    if (this.changing) {
      return;
    }

    this.changing = true;

    // dispose and clear all change listeners
    this.changeListeners.dispose();
    this.changeListeners = new CompositeDisposable();
    this.disposables.add(this.changeListeners);

    const options = {
      path: path.dirname(this.projectFile.getPath())
    };

    // watch the main project file
    this.changeListeners.add(this.projectFile.onDidChange(this.projectDidChange.bind(this)));

    // watch the layer catalog
    this.changeListeners.add(new File(path.join(options.path, "layers.yml")).onDidChange(this.projectDidChange.bind(this)));

    // load the project and convert to JSON
    this.projectFile
      .read(false)
      .then(project => {
        // watch all related files
        cartodb.getCartoCssFiles(project, options)
          .forEach(f => this.changeListeners.add(new File(f).onDidChange(this.projectDidChange.bind(this))));

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
        // TODO switch to TileJSON
        this.layers = [urlTemplate];

        // clear active errors
        this.error = null;
      })
      .catch(err => {
        if (err.body && Array.isArray(err.body.errors)) {
          this.error = err.body.errors.map(x => x.replace(/Error: /, "")).join("\n").replace(/\n/g, "<br>\n");
        } else {
          console.error(err);
          this.error = err.stack;
        }
      })
      .then(() => this.changing = false);
  };
}

atom.deserializers.add(CartoDBModel);
