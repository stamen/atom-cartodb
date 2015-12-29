"use babel";

import assert from "assert";

import {CompositeDisposable, File} from "atom";

import * as actions from "./actions";
import makeStore from "./store";

export default class MapProject {
  static deserialize(state) {
    return new MapProject(state);
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
      deserializer: this.constructor.name,
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

    this.disposables.add(pane.onDidChangeFlexScale(flexScale => {
      this.dispatch(actions.setFlexScale(flexScale));
    }));

    this.disposables.add(pane.onDidChangeActiveItem(item => {
      if (item === this) {
        this.dispatch(actions.setActive());
      }
    }));
  }

  projectDidChange() {
    throw new Error("projectDidChange must be implemented.");
  };
}

atom.deserializers.add(MapProject);
