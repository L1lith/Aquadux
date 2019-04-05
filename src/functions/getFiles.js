const {isBrowser, isNode} = require('browser-or-node')
const {statsSync, readdirSync} = isNode ? require('fs') : {}
const {join} = isNode ? require('path') : {}
const isDirectory = require('./isDirectory')

function getFiles(path, regexFilter) {
  if (!isNode) throw new Error("Aquadux is not running in Node.js")
  if (!isDirectory(path)) throw new Error("Path is not a directory")
  let files = readdirSync(path).filter(name => !isDirectory(join(path, name)))
  if (regexFilter instanceof RegExp) {
    files = files.filter(path => regexFilter.test(path))
  }
  files = files.map(name => join(path, name))
  return files
}

module.exports = getFiles
