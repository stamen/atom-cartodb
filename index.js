"use babel";

import url from "url";

import CartodbPreviewView from "./lib/cartodb-preview-view";
import linter from "./lib/linter";

const show = function show() {
  const projectFile = atom.project.getDirectories()
    .map((x) => x.getEntriesSync())
    .reduce((a, b) => a.concat(b), [])
    .filter((x) => x.isFile())
    .filter((x) => x.getBaseName() === "project.yml")
    .shift(),
    previousActivePane = atom.workspace.getActivePane(),
    uri = "cartodb://preview" + projectFile.getPath();

  atom.workspace.open(uri, {
    activatePane: false,
    searchAllPanes: true,
    split: "right"
  }).done((previewView) => {
    if (previewView instanceof CartodbPreviewView) {
      previousActivePane && previousActivePane.activate();
    }
  });
};

export default {
  activate: (state) => {
    atom.commands.add("atom-workspace", {
      "cartodb:preview": show
    });

    atom.workspace.addOpener((uriToOpen) => {
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
    }
  },

  provideLinter: linter
};
