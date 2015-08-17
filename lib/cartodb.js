"use babel";

import assert from "assert";
import fs from "fs";
import path from "path";

import _debug from "debug";
import request from "request";
import yaml from "js-yaml";

import meta from "../package.json";

debug = _debug(meta.name);

const makeRequest = function makeRequest(method, options, callback) {
  debug("%s %s", method.toUpperCase(), options.uri);
  return request[method.toLowerCase()](options, function(err, rsp, body) {
    if (err) {
      return console.warn(err.stack);
    }

    switch (true) {
    case rsp.statusCode === 200:
      debug(rsp.statusCode, body);
      return callback(null, rsp, body);

    case rsp.statusCode >= 400 && rsp.statusCode < 500:
      debug(`we did something wrong (${rsp.statusCode}):`, body);
      return callback(rsp);

    case rsp.statusCode >= 500:
      debug(`CartoDB did something wrong (${rsp.statusCode}):`, body);
      return callback(rsp);

    default:
      debug(`something unexpected happened (${rsp.statusCode}):`, body);
      return callback(rsp);
    }
  });
};

export const compile = function compile(project, options) {
  options.path = options.path || process.cwd();
  options.layerCatalog = options.layerCatalog ||
    yaml.safeLoad(fs.readFileSync(path.join(options.path, "layers.yml")));

  project = yaml.safeLoad(project);

  if (!(project.name && Array.isArray(project.layers))) {
    return {};
  }

  const layers = project.layers.map(layer => {
    const name = Object.keys(layer)[0],
      layerDef = options.layerCatalog[name] || {},
      localDef = layer[name] && typeof layer[name] === "object" ? layer[name] : {};
      cartoCssFile = localDef.cartocss_file || layer[name] || layerDef.cartocss_file || `styles/${name}.mss`;

    assert.ok(Object.keys(localDef).length || Object.keys(layerDef).length, `Could not find a layer definition for '${name}'.`);

    const layerOptions = {
      type: localDef.type || layerDef.type || "mapnik",
      options: {}
    };

    if (["mapnik", "cartodb", "torque"].indexOf(layerOptions.type) >= 0) {
      layerOptions.options = {
        sql: localDef.sql || layerDef.sql,
        cartocss: fs.readFileSync(path.join(options.path, cartoCssFile), "utf8"),
        cartocss_version: localDef.cartocss_version || layerDef.cartocss_version || "2.1.1"
      };
    }

    [
      "geom_column", "geom_type", "raster_band", "srid", // Mapnik
      "step", // Torque
      "urlTemplate", "tms" // HTTP
    ].forEach(k => {
      if (localDef[k] || layerDef[k]) {
        layerOptions.options[k] = localDef[k] || layerDef[k];
      }
    });

    ["affected_tables", "interactivity"].forEach(k => {
      // assign the layer localDef first
      if (Array.isArray(layerDef[k])) {
        layerOptions.options[k] = layerDef[k];
      }

      // override if a local localDef is available
      if (Array.isArray(localDef[k])) {
        layerOptions.options[k] = localDef[k];
      }
    });

    if (typeof layerDef.attributes === "object") {
      layerOptions.attributes = layerDef.attributes;
    }

    if (typeof localDef.attributes === "object") {
      layerOptions.attributes = localDef.attributes;
    }

    return layerOptions;
  });

  const namedMap = {
    name: project.name,
    version: "0.0.1", // https://github.com/CartoDB/Windshaft-cartodb/blob/master/docs/Template-maps.md
    layergroup: {
      version: "1.3.0", // https://github.com/CartoDB/Windshaft/blob/master/doc/MapConfig-1.3.0.md
      layers: layers
    }
  }

  if (Array.isArray(project.extent)) {
    namedMap.layergroup.extent = project.extent;
  }

  if (project.srid) {
    namedMap.layergroup.srid = project.srid;
  }

  if (project.minzoom != null) {
    namedMap.layergroup.minzoom = project.minzoom;
  }

  if (project.maxzoom != null) {
    namedMap.layergroup.maxzoom = project.maxzoom;
  }

  if (project.placeholders) {
    namedMap.placeholders = project.placeholders
  }

  return namedMap;
};

export const getCartoCssFiles = function getCartoCssFiles(project, options) {
  options.path = options.path || process.cwd();
  options.layerCatalog = options.layerCatalog ||
    yaml.safeLoad(fs.readFileSync(path.join(options.path, "layers.yml")));

  project = yaml.safeLoad(project);

  return (project.layers || []).map(layer => {
    const name = Object.keys(layer)[0],
      layerDef = options.layerCatalog[name] || {},
      localDef = layer[name] && typeof layer[name] === "object" ? layer[name] : {};

    return localDef.cartocss_file || layer[name] || layerDef.cartocss_file || `styles/${name}.mss`;
  }).map(filename => path.join(options.path, filename));
};

export const getUrlTemplate = function getUrlTemplate(project, options, callback) {
  options.path = options.path || process.cwd();
  options.scale = options.scale || 1;

  return createOrUpdateNamedMap(project, (err, rsp, body) => {
    if (err) {
      console.warn(err.statusCode, err.body);
      return callback(err);
    }

    return instantiateNamedMap(project.name, (err, rsp, body) => {
      if (err) {
        return callback(err);
      }

      let scaleModifier = "";

      if (options.scale > 1) {
        scaleModifier = `@${options.scale}x`;
      }

      return callback(null, `http://${atom.config.get("cartodb.username")}.cartodb.com/api/v1/map/${body.layergroupid}/{z}/{x}/{y}${scaleModifier}.png`);
    });
  });
};

export const instantiateNamedMap = function instantiateNamedMap(name, callback) {
  return makeRequest("post", {
    qs: {
      api_key: atom.config.get("cartodb.apiKey")
    },
    json: {}, // required lest no Content-Type (which CartoDB requires)
    uri: `https://${atom.config.get("cartodb.username")}.cartodb.com/api/v1/map/named/${name}`
  }, callback);
};

export const createNamedMap = function createNamedMap(config, callback) {
  return makeRequest("post", {
    qs: {
      api_key: atom.config.get("cartodb.apiKey")
    },
    json: config,
    uri: `https://${atom.config.get("cartodb.username")}.cartodb.com/api/v1/map/named`
  }, callback);
};

export const updateNamedMap = function updateNamedMap(config, callback) {
  return makeRequest("put", {
    qs: {
      api_key: atom.config.get("cartodb.apiKey")
    },
    json: config,
    uri: `https://${atom.config.get("cartodb.username")}.cartodb.com/api/v1/map/named/${config.name}`
  }, callback);
};

export const createOrUpdateNamedMap = function createOrUpdateNamedMap(config, callback) {
  return updateNamedMap(config, function(err, rsp, body) {
    if (err && err.statusCode === 400) {
      return createNamedMap(config, callback);
    }

    return callback.apply(null, arguments);
  });
};
