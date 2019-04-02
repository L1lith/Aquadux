const AquaPipe = require("./AquaPipe")

class Aquadux {
  constructor() {
    this.pipes = {}
    this.eventListeners = {}
  }
  createPipe(name, func, options={}) {
    if (typeof func != 'function') throw new Error("Function input must be a function")
    if (typeof name != 'string' || name.length < 1) throw new Error("Name must be an non-empty string")
    if (typeof options != "object") throw new Error("Options must be an object or null")
    if (this.pipes.hasOwnProperty(name)) throw new Error("Pipe name already taken")
    if (options === null) options = {}
    const pipe = new AquaPipe(this, name, func, options)
    this.pipes[name] = pipe
  }
  getPipe(name) {
    if (typeof name != 'string' || string.length < 1) throw new Error("Name must be an non-empty string")
    if (!this.pipes.hasOwnProperty(name)) throw new Error("That pipe does not exist")
    return this.pipes[name]
  }
  start() {

  }
}

module.exports = Aquadux
