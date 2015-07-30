"use babel";

import path from "path";

import {File} from "atom";

import * as cartodb from "./cartodb";

const createTileMillLayer = function createTileMillLayer(layer) {
  return {
    id: layer.name,
    name: layer.name,
    "srs-name": "3857",
    srs: "+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0.0 +k=1.0 +units=m +nadgrids=@null +wktext +no_defs +over",
    Datasource: {
      table: `(${layer.options.sql}) AS _`,
      type: "postgis",
      geometry_field: "the_geom_webmercator",
      extent: "-20037508.3427892,-73843109.2723336,20037508.3427892,18394384.3162557",
      srs: "+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0.0 +k=1.0 +units=m +nadgrids=@null +wktext +no_defs +over",
      srid: 3857,
      dbname: "{{PGDATABASE}}",
      host: "{{PGHOST}}",
      user: "{{PGUSER}}",
      password: "{{PGPASSWORD}}",
      port: "{{PGPORT}}"
    }
  };
};

export default function tileMillExport() {
  const projectFile = atom.project.getDirectories()
    .map((x) => x.getEntriesSync())
    .reduce((a, b) => a.concat(b), [])
    .filter((x) => x.isFile())
    .filter((x) => x.getBaseName() === "project.yml")
    .shift();

  if (!projectFile) {
    atom.notifications.addWarning("Could not find project.yml in the project root.");

    return;
  }

  const options = {
    path: path.dirname(projectFile.getPath())
  };

  return projectFile
    .read(false)
    .then((project) => {
      return new Promise((resolve, reject) => {
        const cartoCssFiles = cartodb.getCartoCssFiles(project, options).map((file) => path.relative(path.dirname(projectFile.getPath()), file));
        project = cartodb.compile(project, options);

        const mml = {
          bounds: [-180, -85.0511, 180, 85.0511],
          center: [0, 0, 2],
          format: "png8",
          minzoom: project.layergroup.minzoom,
          maxzoom: project.layergroup.maxzoom,
          srs: "+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0.0 +k=1.0 +units=m +nadgrids=@null +wktext +no_defs +over",
          Stylesheet: cartoCssFiles,
          Layer: project.layergroup.layers.map(createTileMillLayer),
          name: project.name
        };

        var mmlPath = path.join(path.dirname(projectFile.getPath()), "project.mml.hbs");

        new File(mmlPath)
          .write(JSON.stringify(mml, null, 2))
          .then(() => {
              atom.workspace.open(mmlPath);
          });
      });
    })
    .catch((err) => {
      console.error(err);
      throw err;
    });
};
