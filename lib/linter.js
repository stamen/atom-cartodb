"use babel";

export default function linter() {
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
