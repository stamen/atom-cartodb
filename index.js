"use babel";

import path from "path";
import url from "url";

import {Provider} from "react-redux";
import React from "react";
import ReactDOM from "react-dom";

import cartodbExport from "./lib/cartodb-export";
import Preview from "./lib/components/preview";
import linter from "./lib/linter";
import Model from "./lib/model";
import tileMillExport from "./lib/tilemill-export";


atom.views.addViewProvider(Model, model => {
  const container = document.createElement("div");
  container.className = "cartodb-preview native-key-bindings";
  container.tabIndex = "-1";

  ReactDOM.render(
    <Provider store={model.store}>
      <Preview />
    </Provider>,
    container
  );

  return container;
});

const show = function show(evt) {
  if (!(atom.config.get("cartodb.username") && atom.config.get("cartodb.apiKey"))) {
    atom.notifications.addWarning("Your CartoDB username and API key are missing. Please check the CartoDB package settings.");

    return;
  }

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

  const previousActivePane = atom.workspace.getActivePane(),
    uri = `cartodb://preview${projectFilename}`;

  let split = null;

  if (previousActivePane.items.length > 0) {
    // only split if there are items open
    split = "right";
  }

  atom.workspace.open(uri, {
    activatePane: false,
    searchAllPanes: true,
    split: split
  }).done(model => {
    model.pane = atom.workspace.paneForItem(model);
  });
};

export default {
  activate: state => {
    atom.commands.add("atom-workspace", {
      "cartodb:preview": show,
      "cartodb:cartodb-export": cartodbExport,
      "cartodb:tilemill-export": tileMillExport,
    });

    atom.workspace.addOpener(uriToOpen => {
      let protocol, host, pathname;

      try {
        ({protocol, host, pathname} = url.parse(uriToOpen));
      } catch (err) {
        return;
      }

      if (protocol !== "cartodb:") {
        return;
      }

      return new Model({
        filename: pathname
      });
    });

    // attach the associated pane with the model (for activity / size tracking purposes)
    atom.workspace
      .getPaneItems()
      .filter(x => x instanceof Model)
      .forEach(x => x.setPane(atom.workspace.paneForItem(x)));
  },

  config: {
    apiKey: {
      title: "API Key",
      description: "CartoDB API Key",
      type: "string",
      default: ""
    },
    username: {
      title: "Username",
      description: "CartoDB User Name (e.g. {username}.cartodb.com)",
      type: "string",
      default: ""
    }
  },

  provideLinter: linter
};
