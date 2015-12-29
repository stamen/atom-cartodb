"use babel";

import path from "path";

import {CompositeDisposable, File} from "atom";

import * as cartodb from "./cartodb";
import MapProject from "./model";

export default class CartoDBProject extends MapProject {
  static deserialize(state) {
    return new CartoDBProject(state);
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

atom.deserializers.add(CartoDBProject);
