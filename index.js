"use babel";

import url from "url";

import CartodbPreviewView from "./lib/cartodb-preview-view";
import linter from "./lib/linter";
import tileMillExport from "./lib/tilemill-export";

const show = function show() {
  if (!(atom.config.get("cartodb.username") && atom.config.get("cartodb.apiKey"))) {
    atom.notifications.addWarning("Your CartoDB username and API key are missing. Please check the CartoDB package settings.");

    return;
  }

  let projectFilename;

  if (atom.workspace.getActiveTextEditor()) {
    projectFilename = atom.workspace.getActiveTextEditor().getPath();
  } else {
    projectFilename = atom.project.getDirectories()
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
  }).done(previewView => {
    if (previewView instanceof CartodbPreviewView) {
      previousActivePane && previousActivePane.activate();
    }
  });
};

export default {
  activate: state => {
    atom.commands.add("atom-workspace", {
      "cartodb:preview": show,
      "cartodb:tilemill-export": tileMillExport
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

      return new CartodbPreviewView({
        filename: pathname
      });
    });
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
