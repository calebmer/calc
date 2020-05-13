// NOTE: If imported in a CommonJS setting we don’t want the user to have to
// write `require().default` so have our main entrypoint re-export the default.
// Babel’s interop require support will treat `module.exports` as the
// default export.

const Live = require('./src/index.js').default;
module.exports = Live;
