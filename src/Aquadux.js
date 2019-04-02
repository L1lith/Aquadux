const autoBind = require("auto-bind")
const EventManager = require("./EventManager")
const AquaPipe = require("./AquaPipe")

class Aquadux extends EventManager {
  constructor() {
    super()
    autoBind(this)
    this.started = false
    this.finished = false
    this.pipes = {}
    this.createEvents(['started', 'finished', 'success', 'failure'])
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
  detectCircularPipes() {
    let duplicates = []
    Object.entries(this.pipes).forEach(([pipeName, pipe]) => {
      pipe.waitingOn.forEach(dependantPipe => {
        if (dependantPipe.waitingOn.includes(pipe)) {
          duplicates.push(pipe)
          duplicates.push(dependantPipe)
        }
      })
    })
    duplicates = duplicates.filter((pipe, index) => {
      return duplicates.indexOf(pipe) === index
    })
    return duplicates
  }
}

module.exports = Aquadux
