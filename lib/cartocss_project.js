"use babel";

import path from "path";

import {CompositeDisposable, File} from "atom";
import express from "express";
import portfinder from "portfinder";
import tessera from "tessera";
import tilelive from "tilelive";
import tileliveCache from "tilelive-cache";

import MapProject from "./model";
import loadModules from "./modules";


// loadModules(tileliveCache(tilelive));
loadModules(tilelive);

export default class CartoCSSProject extends MapProject {
  static deserialize(state) {
    return new CartoCSSProject(state);
  }

  constructor(state) {
    super(state);

    this.serial = 0;
  }

  dispose() {
    super.dispose();
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

    // watch the main project file (MML)
    this.changeListeners.add(this.projectFile.onDidChange(this.projectDidChange.bind(this)));

    this.projectFile
      .read(false)
      .then(JSON.parse)
      .then(mml => {
        // TODO watch referenced files?
        mml.Stylesheet.forEach(f => {
          this.changeListeners.add(new File(path.join(options.path, f)).onDidChange(this.projectDidChange.bind(this)));
        });

        // TODO set center / zoom (but only on first load)
      });

    console.log("uri:", `carto+file://${this.projectFile.getPath()}`)

    const app = express();
    app.use(tessera(tilelive, `carto+file://${this.projectFile.getPath()}`));

    portfinder.getPort((err, port) => {
      if (err) {
        throw err;
      }

      this.server = app.listen(port, () => {
        console.log("Listening at http://%s:%d/", this.server.address().address, this.server.address().port);

        this.layers = [`http://localhost:${port}/{z}/{x}/{y}.png?serial=${this.serial++}`];
      });

      this.changeListeners.add({
        dispose: () => this.server.close()
      })
    });

    this.changing = false;
  };
}

atom.deserializers.add(CartoCSSProject);
