"use babel";

import path from "path";

import abaculus from "abaculus";
import {File} from "atom";
import tilelive from "tilelive";
import tileliveCartoDB from "tilelive-cartodb";
import tileliveHttp from "tilelive-http";

import * as cartodb from "./cartodb";

// register
tileliveCartoDB(tilelive);
tileliveHttp(tilelive);

export default function generatePreview(evt) {
  if (!(atom.config.get("cartodb.username") && atom.config.get("cartodb.apiKey"))) {
    return Promise.reject(new Error("Username and/or API key are missing."));
  }

  let projectFilenames = [evt.target.dataset.path].filter(x => !!x);

  if (projectFilenames.length === 0 &&
      atom.workspace.getActiveTextEditor() &&
      atom.workspace.getActiveTextEditor().getGrammar().scopeName === "source.yaml") {
    projectFilenames = [atom.workspace.getActiveTextEditor().getPath()];
  }

  if (projectFilenames.length === 0) {
    projectFilenames = atom.project.getDirectories()
      .map(x => x.getEntriesSync())
      .reduce((a, b) => a.concat(b), [])
      .filter(x => x.isFile())
      // avoid reading all files by filtering on filename
      .filter(x => [".yml"].indexOf(path.extname(x.getBaseName())) >= 0)
      // TODO use grammars to further filter (assumes that we create a
      // Grammar that uniquely identifies CartoDB projects)
      .map(x => x.getPath());
  }

  if (projectFilenames.length === 0) {
    return Promise.reject(new Error("Could not find any CartoDB styles in the project root."));
  }

  return Promise.all(projectFilenames.map(projectFilename => {
    const options = {
      path: path.dirname(projectFilename)
    };

    return new File(projectFilename)
      .read(false)
      .then(project => {
        return new Promise((resolve, reject) => {
          project = cartodb.compile(project, options);

          return cartodb.getUrlTemplate(project, options, err => {
            if (err) {
              return reject(new Error("Could not fetch URL template."));
            }

            return tilelive.load(`cartodb://${atom.config.get("cartodb.username")}:${atom.config.get("cartodb.apiKey")}@/${project.name}`, function(err, source) {
              if (err) {
                return reject(err);
              }

              return abaculus({
                zoom: 10,
                scale: 1,
                center: {
                  x: -122.3294,
                  y: 47.6036,
                  w: 1024,
                  h: 768
                },
                getTile: source.getTile.bind(source)
              }, (err, image, headers) => {
                if (err) {
                  return reject(err);
                }

                const imagePath = path.join(path.dirname(projectFilename), `${path.basename(projectFilename, ".yml")}.png`);

                new File(imagePath)
                  .write(image)
                  .then(() => {
                      atom.workspace.open(imagePath);
                  });
              });
            });
          });
        });
      });
  }));
};
