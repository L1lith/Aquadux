const {isBrowser, isNode} = require('browser-or-node')
const {lstatSync} = isNode ? require('fs') : {}
const {join} = isNode ? require('path') : {}

function isDirectory(path) {
  if (!isNode) throw new Error("Aquadux is not running in Node.js")
  return lstatSync(path).isDirectory()
}

module.exports = isDirectory
