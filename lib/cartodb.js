"use babel";

import url from "url";

import PreviewView from "./preview-view"

const createCartoDBPreviewView = function createCartoDBPreviewView(state) {
  return new PreviewView(state);
};

const isPreviewView = function isPreviewView(object) {
  return object instanceof PreviewView;
};

/*
atom.deserializers.add({
  name: "PreviewView",
  deserialize: (state) => {
    if (state.constructor === Object) {
      return createCartoDBPreviewView(state);
    }
  }
});
*/

const show = function show() {
  console.log("show");

  // if (!atom.workspace.getActiveTextEditor()) {
  //   console.log("no editor active");
  //   return;
  // }

  console.log("creating panes");

  const previousActivePane = atom.workspace.getActivePane(),
    uri = "cartodb://preview/";

  atom.workspace.open(uri, {
    activatePane: false,
    searchAllPanes: true,
    split: "right"
  }).done((previewView) => {
    if (isPreviewView(previewView)) {
      previousActivePane && previousActivePane.activate();
    }
  });
};

const isCartoDBProject = function isCartoDBProject() {
  const files = atom.project.getDirectories()
    .map((x) => x.getEntriesSync())
    .reduce((a, b) => a.concat(b), [])
    .filter((x) => x.isFile())
    .map((x) => x.getBaseName());

  return files.some((x) => x === "project.json");
};

export default {
  activate: (state) => {
    console.log("activate");

    if (isCartoDBProject()) {
      console.log("This appears to be a CartoDB project");

      let opened = false;

      if (atom.workspace.getActiveTextEditor()) {
        opened = true;
        show();
      }

      atom.workspace.onDidAddTextEditor((evt) => {
        if (!opened) {
          opened = true;
          show();
        }
      });
    }

    atom.commands.add("atom-workspace", {
      "cartodb:show": show
    });

    atom.workspace.addOpener((uriToOpen) => {
      let protocol, host;

      try {
        ({protocol, host} = url.parse(uriToOpen));
      } catch (err) {
        return;
      }

      console.log("protocol:", protocol);

      if (protocol !== "cartodb:") {
        return;
      }

      return createCartoDBPreviewView();
    });
  }
};
