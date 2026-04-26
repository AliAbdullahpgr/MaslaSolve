const fs = require("fs");

function patch(method) {
  const orig = fs[method];
  if (!orig) return;
  fs[method] = function(path, options, cb) {
    if (typeof options === "function") {
      cb = options;
      options = {};
    }
    const callback = cb || function(){};
    orig.call(fs, path, options, (err, result) => {
      if (err && (err.code === "EPERM" || err.code === "EACCES")) {
        callback(null, []);
      } else {
        callback(err, result);
      }
    });
  };
}

function patchSync(method) {
  const orig = fs[method];
  if (!orig) return;
  fs[method] = function(path, options) {
    try {
      return orig.call(fs, path, options);
    } catch (e) {
      if (e && (e.code === "EPERM" || e.code === "EACCES")) {
        return [];
      }
      throw e;
    }
  };
}

patch("readdir");
patchSync("readdirSync");
patch("opendir");
patchSync("opendirSync");

const origReaddir = require("fs/promises").readdir;
require("fs/promises").readdir = async function(path, options) {
  try {
    return await origReaddir.call(this, path, options);
  } catch (e) {
    if (e && (e.code === "EPERM" || e.code === "EACCES")) {
      return [];
    }
    throw e;
  }
};

const origOpendir = require("fs/promises").opendir;
require("fs/promises").opendir = async function(path, options) {
  try {
    return await origOpendir.call(this, path, options);
  } catch (e) {
    if (e && (e.code === "EPERM" || e.code === "EACCES")) {
      return [];
    }
    throw e;
  }
};
