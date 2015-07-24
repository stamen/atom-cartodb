"use babel";

import path from "path";

import * as cartodb from "./cartodb";

export default function linter() {
  return {
    // run it through CartoDB for syntax checking
    grammarScopes: ["source.css.mss", "source.yaml"],
    scope: "project",
    lintOnFly: false,
    lint: (textEditor) => {
      const projectFile = atom.project.getDirectories()
        .map((x) => x.getEntriesSync())
        .reduce((a, b) => a.concat(b), [])
        .filter((x) => x.isFile())
        .filter((x) => x.getBaseName() === "project.yml")
        .shift();

      console.log("linting");

      const options = {
        path: path.dirname(projectFile.getPath())
      };

      return projectFile
        .read(false)
        .then((project) => {
          console.log("read project");
          return new Promise((resolve, reject) => {
            console.log("compiling");
            project = cartodb.compile(project, options);
            console.log("compiled");

            return cartodb.getUrlTemplate(project, options, (err) => {
              console.log("url template fetched");
              console.log("err.body:", err && err.body);
              if (err && Array.isArray(err.body.errors)) {
                console.log("Errors:", err.body.errors);

                // gather up distinct errors
                const errors = {};

                err.body.errors.forEach((e) => {
                  e.replace(/Error: /, "").split("\n")
                    .filter((line) => !!line)
                    .forEach((line) => {
                      errors[line] = true;
                    });
                });

                const messages = Object.keys(errors).map((line) => {
                  let parts = line.split(":", 3),
                      layerIdx = parts.shift().replace("style", "") | 0,
                      row = parts.shift() | 0,
                      col = parts.shift().split(" ", 2)[0] | 0,
                      message = line.replace(/.*style\d+:\d+:\d+ (.*)/, "$1");

                  const layersWithCartoCSS = project.layergroup.layers.filter((x) => x.options.cartocss),
                    layerWithError = layersWithCartoCSS[layerIdx];

                  console.log("Layer with error:", layerWithError);

                  return {
                    type: "Error",
                    text: message,
                    filePath: path.join(path.dirname(projectFile.getPath()), "styles", layerWithError.name + ".mss"),
                    range: [[row - 1, col], [row - 1, Infinity]]
                  };
                });

                return resolve(messages);
              }

              if (err) {
                console.warn(err);
              }

              // no errors
              return resolve([]);
            });
          });
        })
        .catch((err) => {
          console.error(err);
          throw err;
        });
    }
  };
};
