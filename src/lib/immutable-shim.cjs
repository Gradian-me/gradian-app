/**
 * Shim for 'immutable' so that ESM default-import (import x from 'immutable')
 * works when consumed by swagger-ui-react. The immutable package only exposes
 * named exports; this file re-exports the namespace as default for webpack.
 * Depends on webpack alias 'immutable-real' -> node_modules/immutable.
 */
module.exports = require('immutable-real');
