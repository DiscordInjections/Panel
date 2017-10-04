// install marko's node require hook and browser refresh module
require('marko/node-require').install()
require('marko/browser-refresh').enable()

// load .env config file (extends process.env with custom env variables)
require('dotenv-safe').load()

// set default env
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'development'
}

// fix stylus
function addVmaxUnit (path) {
  const units = require(path + '/lib/units')
  if (units.indexOf('vmax') === -1) {
    units.push('vmax')
  }
}
try {
  addVmaxUnit('lasso-stylus/node_modules/stylus')
} catch (ex) {
  addVmaxUnit('stylus')
}

// fancy long stack traces
require("longjohn")

// add global fetch method
require('isomorphic-fetch')
