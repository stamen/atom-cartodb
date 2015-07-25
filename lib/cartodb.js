"use babel";

import assert from "assert";
import fs from "fs";
import path from "path";

import request from "request";
import yaml from "js-yaml";

export const compile = function compile(project, options) {
  options.path = options.path || process.cwd();

  project = yaml.safeLoad(project);

  delete project._layer_default;
  delete project._options_default;

  project.layergroup.layers = project.layergroup.layers.map((layer) => {
    if (["mapnik", "cartodb"].indexOf(layer.type) < 0) {
      return layer;
    }

    assert.ok(layer.name, "A layer must have a name.");

    const cartoCssFile = layer.options.cartocss_file || `styles/${layer.name}.mss`;

    layer.options.cartocss = fs.readFileSync(path.join(options.path,
                                                       cartoCssFile), "utf8");

    delete layer.options.cartocss_file;

    return layer;
  });

  return project;
};

export const getCartoCssFiles = function getCartoCssFiles(project, options) {
  options.path = options.path || process.cwd();

  project = yaml.safeLoad(project);

  return project.layergroup.layers.map((layer) => {
    const cartoCssFile = layer.options.cartocss_file || `styles/${layer.name}.mss`;

    return path.join(options.path, cartoCssFile);
  });
};

export const getUrlTemplate = function getUrlTemplate(project, options, callback) {
  options.path = options.path || process.cwd();

  return updateNamedMap(project, (err, rsp, body) => {
    if (err) {
      console.warn(err.statusCode, err.body);
      return callback(err);
    }

    return instantiateNamedMap(project.name, (err, rsp, body) => {
      if (err) {
        return callback(err);
      }

      return callback(null, `http://${atom.config.get("cartodb.username")}.cartodb.com/api/v1/map/${body.layergroupid}/{z}/{x}/{y}.png`);
    });
  });
};

export const instantiateNamedMap = function instantiateNamedMap(name, callback) {
  return request.post({
    qs: {
      api_key: atom.config.get("cartodb.apiKey")
    },
    json: {}, // required lest no Content-Type (which CartoDB requires)
    uri: `https://${atom.config.get("cartodb.username")}.cartodb.com/api/v1/map/named/${name}`
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

export const createNamedMap = function createNamedMap(config, callback) {
  return request.post({
    qs: {
      api_key: atom.config.get("cartodb.apiKey")
    },
    json: config,
    uri: `https://${atom.config.get("cartodb.username")}.cartodb.com/api/v1/map/named`
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

export const updateNamedMap = function updateNamedMap(config, callback) {
  return request.put({
    qs: {
      api_key: atom.config.get("cartodb.apiKey")
    },
    json: config,
    uri: `https://${atom.config.get("cartodb.username")}.cartodb.com/api/v1/map/named/${config.name}`
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
