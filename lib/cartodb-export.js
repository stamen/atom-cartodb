"use babel";

import path from "path";

import {File} from "atom";

import * as cartodb from "./cartodb";

export default function cartodbExport(evt) {
  let projectFilename = evt.target.dataset.path;

  if (atom.workspace.getActiveTextEditor() &&
      [".yml"].indexOf(path.extname(atom.workspace.getActiveTextEditor().getPath())) >= 0) {
    projectFilename = projectFilename || atom.workspace.getActiveTextEditor().getPath();
  }

  projectFilename = projectFilename || atom.project.getDirectories()
    .map(x => x.getEntriesSync())
    .reduce((a, b) => a.concat(b), [])
    .filter(x => x.isFile())
    .filter(x => x.getBaseName() === "project.yml")
    .map(x => x.getPath())
    .shift();

  if (!projectFilename) {
    atom.notifications.addWarning("Could not find project.yml in the project root.");

    return;
  }

  const options = {
    path: path.dirname(projectFilename)
  };

  return new File(projectFilename)
    .read(false)
    .then(project => {
      return new Promise((resolve, reject) => {
        project = cartodb.compile(project, options);

        var jsonPath = path.join(path.dirname(projectFilename), `${path.basename(projectFilename, ".yml")}.json`);

        new File(jsonPath)
          .write(JSON.stringify(project, null, 2))
          .then(() => {
              atom.workspace.open(jsonPath);
          });
      });
    })
    .catch(err => {
      console.error(err);
      throw err;
    });
};
