"use babel";

import assert from "assert";
import fs from "fs";
import path from "path";

import _compile from "cartodb-yaml";
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

export const compile = _compile;

export const getCartoCssFiles = function getCartoCssFiles(project, options) {
  options = options || {};
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
  options = options || {};
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
    if (err && err.statusCode >= 400 && err.statusCode < 500) {
      return createNamedMap(config, callback);
    }

    return callback.apply(null, arguments);
  });
};
