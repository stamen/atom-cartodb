"use babel";

import path from "path";

import {File} from "atom";

import * as cartodb from "./cartodb";

export default function linter() {
  return {
    // run it through CartoDB for syntax checking
    grammarScopes: ["source.css.mss", "source.yaml"],
    scope: "project",
    lintOnFly: false,
    lint: textEditor => {
      if (!(atom.config.get("cartodb.username") && atom.config.get("cartodb.apiKey"))) {
        console.warn("Username and/or API key are missing.");

        return [];
      }

      let projectFilenames;

      if (textEditor.getGrammar().scopeName === "source.yaml") {
        projectFilenames = [textEditor.getPath()];
      } else {
        // open all project files and lint them since we don't know which
        // project(s) this style is associated with
        // TODO use cartodb.getCartoCssFiles() to do a reverse lookup (to limit
        // the styles we instantiate)

        projectFilenames = atom.project.getDirectories()
          .map(x => x.getEntriesSync())
          .reduce((a, b) => a.concat(b), [])
          .filter(x => x.isFile())
          // avoid reading all files by filtering on filename
          .filter(x => [".yml"].indexOf(path.extname(x.getBaseName())) >= 0)
          // TODO use grammars to further filter (assumes that we create a
          // Grammar that uniquely identifies CartoDB projects)
          .map(x => x.getPath());

        if (projectFilenames.length === 0) {
          atom.notifications.addWarning("Could not find any CartoDB styles in the project root.");

          return [];
        }
      }

      return Promise.all(projectFilenames.map(projectFilename => {
        const options = {
          path: path.dirname(projectFilename)
        };

        return new File(projectFilename)
          .read(false)
          .then(project => {
            return new Promise((resolve, reject) => {
              const cartoCssFiles = cartodb.getCartoCssFiles(project, options);
              project = cartodb.compile(project, options);

              return cartodb.getUrlTemplate(project, options, err => {
                if (err && err.body) {
                  console.warn("(%s) err.body:", projectFilename, err.body);
                }

                if (err && Array.isArray(err.body.errors)) {
                  console.log("Errors:", err.body.errors);

                  const errors = err.body.errors
                    .map(error => {
                      return error.replace(/Error: /, "");
                    })
                    .map(error => {
                      // split and dedupe
                      if (error.match(/.*style\d+:\d+:\d+/)) {
                        return Object.keys(error.split("\n")
                          .filter(line => !!line)
                          .reduce((a, b) => {
                            a[b] = true;
                            return a;
                          }, {}));
                      }
                      return error;
                    })
                    // flatten
                    .reduce((a, b) => a.concat(b), [])
                    .map(error => {
                      if (error.match(/.*style\d+:\d+:\d+/)) {
                        // CartoCSS errors
                        let parts = error.split(":", 3),
                            layerIdx = parts.shift().replace("style", "") | 0,
                            row = parts.shift() | 0,
                            col = parts.shift().split(" ", 2)[0] | 0,
                            message = error.replace(/.*style\d+:\d+:\d+ (.*)/, "$1");

                        return {
                          type: "Error",
                          text: message,
                          filePath: cartoCssFiles[layerIdx],
                          range: [[row - 1, col], [row - 1, Infinity]]
                        };
                      }

                      // other types of errors
                      return {
                        type: "Error",
                        html: error.replace(/\n/g, "<br>\n").replace(/\s/g, "&nbsp;")
                      };
                    });

                  return resolve(errors);
                }

                if (err) {
                  console.warn(err);
                }

                // no errors
                return resolve([]);
              });
            });
          });
      }))
      // flatten
      .then(values => values.reduce((a, b) => a.concat(b)))
      // dedupe
      .then(values => {
        const seen = {};

        return values
          .map(val => {
            const key = JSON.stringify(val),
              // have we already seen it?
              present = seen[key] || false;

            // now we have
            seen[key] = true;

            return present || val;
          })
          .filter(val => typeof val === "object");
      });
    }
  };
};
