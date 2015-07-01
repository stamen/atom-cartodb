"use babel";

import assert from "assert";
import fs from "fs";
import path from "path";
import url from "url";
import util from "util";

import request from "request";
import yaml from "js-yaml";

import PreviewView from "./preview-view"


const createCartoDBPreviewView = function createCartoDBPreviewView(state) {
  return new PreviewView(state);
};

const isPreviewView = function isPreviewView(object) {
  return object instanceof PreviewView;
};

const compile = function compile(project, options, callback) {
  options.path = options.path || process.cwd();

  console.log("path:", options.path);

  var project = yaml.safeLoad(project);

  delete project._layer_default;
  delete project._options_default;

  try {
    project.layergroup.layers = project.layergroup.layers.map(function(layer) {
      if (["mapnik", "cartodb"].indexOf(layer.type) < 0) {
        return layer;
      }

      assert.ok(layer.name, "A layer must have a name.");

      var cartoCssFile = layer.options.cartocss_file || util.format("styles/%s.mss", layer.name);

      layer.options.cartocss = fs.readFileSync(path.join(options.path,
                                                         cartoCssFile), "utf8");

      delete layer.options.cartocss_file;

      return layer;
    });
  } catch (err) {
    return callback(err);
  }

  return callback(null, project);
};

const updateNamedMap = function updateNamedMap(config, callback) {
  // create (w/o name)
  // return request.post({
  // update
  return request.put({
    body: config,
    qs: {
      api_key: ""
    },
    json: true,
    uri: `https://stamen-org.cartodb.com/api/v1/map/named/${config.name}`
  }, function(err, rsp, body) {
    if (err) {
      return console.warn(err.stack);
    }

    switch(true) {
    case rsp.statusCode === 200:
      console.log(rsp.statusCode, body);
      return callback(null, rsp, body);

    case rsp.statusCode >= 400 && rsp.statusCode < 500:
      console.log(`we did something wrong (${rsp.statusCode}):`, body);
      return callback(rsp);

    case rsp.statusCode >= 500:
      console.log(`CartoDB did something wrong (${rsp.statusCode}):`, body);
      return callback(rsp);

    default:
      console.log(`something unexpected happened (${rsp.statusCode}):`, body);
      return callback(rsp);
    }
  });
};

const instantiateNamedMap = function instantiateNamedMap(name, callback) {
  // instantiate
  return request.post({
    body: {}, // required lest no Content-Type (which CartoDB requires)
    qs: {
      api_key: ""
    },
    json: true,
    uri: `https://stamen-org.cartodb.com/api/v1/map/named/${name}`
  }, function(err, rsp, body) {
    if (err) {
      return console.warn(err.stack);
    }

    switch(true) {
    case rsp.statusCode === 200:
      console.log(rsp.statusCode, body);
      return callback(null, rsp, body);

    case rsp.statusCode >= 400 && rsp.statusCode < 500:
      console.log(`we did something wrong (${rsp.statusCode}):`, body);
      return callback(rsp);

    case rsp.statusCode >= 500:
      console.log(`CartoDB did something wrong (${rsp.statusCode}):`, body);
      return callback(rsp);

    default:
      console.log(`something unexpected happened (${rsp.statusCode}):`, body);
      return callback(rsp);
    }
  });
};

const show = function show() {
  console.log("show");

  // if (!atom.workspace.getActiveTextEditor()) {
  //   console.log("no editor active");
  //   return;
  // }

  const projectFile = atom.project.getDirectories()
    .map((x) => x.getEntriesSync())
    .reduce((a, b) => a.concat(b), [])
    .filter((x) => x.isFile())
    .filter((x) => x.getBaseName() === "project.yml")
    .shift();

  projectFile
    .read(false)
    .then(function(project) {
      return compile(project, {
        path: path.dirname(projectFile.getPath())
      }, function(err, projectJSON) {
        if (err) {
          return console.warn(err.stack);
        }

        console.log("project JSON:", projectJSON);

        return updateNamedMap(projectJSON, function(err, rsp, body) {
          if (err) {
            console.warn(err.statusCode, err.body);
            return console.warn(err.stack);
          }

          return instantiateNamedMap(projectJSON.name, function(err, rsp, body) {
            if (err) {
              if (Array.isArray(err.body.errors)) {
                // gather up distinct errors
                const errors = {};

                err.body.errors.forEach(function(e) {
                  e.split("\n").forEach(function(line) {
                    errors[line] = true;
                  });
                });

                console.log(errors);

                Object.keys(errors).forEach(function(line) {
                  let parts = line.split(":", 3),
                      layerIdx = parts.shift().replace("style", "") | 0,
                      row = parts.shift() | 0,
                      col = parts.shift().split(" ", 2)[0] | 0,
                      spaces = "";

                  for (var i = 0; i < col; i++) {
                    spaces += " ";
                  }

                  const layersWithCartoCSS = projectJSON.layergroup.layers.filter((x) => x.options.cartocss),
                    layerWithError = layersWithCartoCSS[layerIdx];

                  console.log("Layer with error:", layerWithError);

                  layerWithError.options.cartocss.split("\n").forEach(function(l, i) {
                    if (i >= row - 4 || i <= row + 4) {
                      console.log(l);
                      if (i === row - 1) {
                        console.log(spaces + "^");
                      }
                    }
                  });
                });

                return;
              }

              console.warn(err.statusCode, err.body);
            }

            console.log(rsp.statusCode, body);
          });
        });
      });
    })
    .catch(function(err) {
      throw err;
    });

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

  return files.some((x) => x === "project.yml");
};

export default {
  activate: (state) => {
    console.log("activate");

/*
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
*/

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
  },

  provideLinter: () => {
    console.log("provideLinter");
    return {
      // TODO use carto.js for syntax checking
      // grammarScopes: ["source.css.mss", "source.yaml"],
      // run it through CartoDB for syntax checking
      grammarScopes: ["source.yaml"],
      scope: "file",
      lintOnFly: false,
      lint: (textEditor) => {
        console.log("Linting the contents of", textEditor);

        if (path.basename(textEditor.getPath()) !== "project.yml") {
          return [];
        }

        // either source.yaml or source.css.mss
        console.log(textEditor.getGrammar().scopeName);
        return new Promise((resolve, reject) => {
          return compile(textEditor.getText(), {
            path: path.dirname(textEditor.getPath())
          }, function(err, projectJSON) {
            if (err) {
              return console.warn(err.stack);
            }

            console.log("project JSON:", projectJSON);

            return updateNamedMap(projectJSON, function(err, rsp, body) {
              if (err) {
                console.warn(err.statusCode, err.body);
                return console.warn(err.stack);
              }

              return instantiateNamedMap(projectJSON.name, function(err, rsp, body) {
                if (err) {
                  if (Array.isArray(err.body.errors)) {
                    console.log("Errors:", err.body.errors);

                    // gather up distinct errors
                    const errors = {};

                    err.body.errors.forEach(function(e) {
                      e.replace(/Error: /, "").split("\n").forEach(function(line) {
                        errors[line] = true;
                      });
                    });

                    console.log(errors);

                    const messages = Object.keys(errors).map(function(line) {
                      let parts = line.split(":", 3),
                          layerIdx = parts.shift().replace("style", "") | 0,
                          row = parts.shift() | 0,
                          col = parts.shift().split(" ", 2)[0] | 0,
                          message = line.replace(/.*style\d+:\d+:\d+ (.*)/, "$1"),
                          spaces = "";

                      for (var i = 0; i < col; i++) {
                        spaces += " ";
                      }

                      const layersWithCartoCSS = projectJSON.layergroup.layers.filter((x) => x.options.cartocss),
                        layerWithError = layersWithCartoCSS[layerIdx];

                      console.log("Layer with error:", layerWithError);

                      return {
                        type: "Error",
                        text: message,
                        filePath: path.join(path.dirname(textEditor.getPath()), "styles", layerWithError.name + ".mss"),
                        range: [[row - 1, col], [row - 1, Infinity]]
                      };
                    });

                    return resolve(messages);
                    return;
                  }

                  console.warn(err.statusCode, err.body);
                }

                console.log(rsp.statusCode, body);
                return resolve([]);
              });
            });
          });
        });
      }
    };
  }
};
