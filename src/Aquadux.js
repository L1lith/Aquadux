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
    return pipe
  }
  getPipe(name) {
    if (typeof name != 'string' || name.length < 1) throw new Error("Name must be an non-empty string")
    if (!this.pipes.hasOwnProperty(name)) throw new Error("That pipe does not exist")
    return this.pipes[name]
  }
  start() {
    this.assureNotStarted()
    this.started = true
    const circularPipes = this.detectCircularPipes().map(pipe => pipe.name)
    if (circularPipes.length > 0) throw new Error(`Found Circular Pipes: "${circularPipes.slice(0, 3).join("\", ") + "\"" + (circularPipes.length > 3 ? ", continued" : "")}`)
    const startingPipes = this.getStartingPipes()
    if (startingPipes.length < 1) throw new Error(`No valid starting pipes.`)
    startingPipes.forEach(pipe => pipe.start())
  }
  assureNotStarted() {
    if (this.started || this.finished) throw new Error("Aquadux already started")
  }
  detectCircularPipes() {
    let duplicates = []
    Object.entries(this.pipes).forEach(([pipeName, pipe]) => {
      pipe.waitingFor.forEach(dependantPipe => {
        if (dependantPipe.waitingFor.includes(pipe)) {
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
  getStartingPipes() {
    return Object.values(this.pipes).filter(pipe => pipe.waitingFor.length === 0)
  }
}

module.exports = Aquadux
