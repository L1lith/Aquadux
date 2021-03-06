const autoBind = require("auto-bind")
const EventManager = require("./EventManager")
const AquaPipe = require("./AquaPipe")
const findPipeDependencies = require('./functions/findPipeDependencies')
const {isBrowser, isNode} = require('browser-or-node')
const {basename} = isNode ? require('path') : {}
const getFiles = require('./functions/getFiles')


class Aquadux extends EventManager {
  constructor(options={}) {
    super()
    if (typeof options != 'object') throw new Error("Options must be an object, unsupplied, or null")
    if (options === null) options = {}
    autoBind(this)
    this.options = options
    this.started = false
    this.finished = false
    this.pipes = {}
    this.totalUnnamedPipes = 0
    this.createEvents(['started', 'finished', 'success', 'failure'])
    this.promise = new Promise((resolve, reject)=>{
      this.on('success', resolve)
      this.on('failure', reject)
    })
  }
  resolvePipe(nameOrPipe, throwIfNotFound=true) {
    if (nameOrPipe instanceof AquaPipe) {
      return nameOrPipe
    } else if (typeof nameOrPipe == 'string' && nameOrPipe.length > 0) {
      if (throwIfNotFound === true && !this.pipes.hasOwnProperty(nameOrPipe)) throw new Error(`No pipe found named "${nameOrPipe}"`)
      return this.pipes[nameOrPipe] || null
    } else {
      throw new Error("Must supply a pipe or a pipe name")
    }
  }
  createPipe(name=null, func, options={}) {
    if (arguments.length < 1) throw new Error("Too Few Arguments")
    if (arguments.length > 3) throw new Error("Too Many Arguments")
    if (arguments.length === 1) {
      func=name
      name=null
    }
    if (arguments.length === 2 && typeof arguments[0] == 'function') {
      func = name
      name = null
      options = arguments[1]
    }
    if (typeof func != 'function') throw new Error("Function input must be a function")
    if (name === null && func.name.length > 0 && func.name !== "anonymous" && !this.pipes.hasOwnProperty(func.name)) {
      name = func.name
    }
    if ((typeof name != 'string' || name.length < 1) && name !== null) throw new Error("Name must be either a non-empty string, null, or unsupplied.")
    if (typeof options != "object") throw new Error("Options must be an object or null")
    if (typeof name == 'string') {
      if (name.startsWith("unnamedPipe")) throw new Error("Sorry, this name is reserved.")
      if (this.pipes.hasOwnProperty(name)) throw new Error("Pipe name already taken")
    }
    if (name === null) {
      name = "unnamedPipe#" + ++this.totalUnnamedPipes
    }
    if (options === null) options = {}
    const pipe = new AquaPipe(this, name, func, options)
    this.pipes[name] = pipe
    const dependencies = findPipeDependencies(pipe)
    dependencies.forEach(dependency => {
      if (!this.pipes.hasOwnProperty(dependency)) console.warn(`Unable to find dependency "${dependency}"`)
      pipe.dependUpon(this.pipes[dependency])
    })
    return pipe
  }
  getPipe(name) {
    if (typeof name != 'string' || name.length < 1) throw new Error("Name must be an non-empty string")
    if (!this.pipes.hasOwnProperty(name)) throw new Error("That pipe does not exist")
    return this.pipes[name]
  }
  runPipes(pipes) {
    return new Promise((resolve, reject) => {
      const runningPipes = [...pipes]
      const checkDone = ()=>{
        if (runningPipes.length === 0) {
          resolve(this.getOutput())
        }
      }
      runningPipes.forEach(pipe => {
        const onFinish = ()=>{
          runningPipes.splice(runningPipes.indexOf(pipe), 1)
          checkDone()
        }
        if (pipe.options.canFail === true) {
          pipe.on('finished', onFinish)
        } else {
          pipe.on('success', onFinish)
          pipe.on('failure', reject)
        }
      })
    })
  }
  start() {
    this.assureNotStarted()
    this.started = true
    const circularPipes = this.detectCircularPipes().map(pipe => pipe.name)
    if (circularPipes.length > 0) throw new Error(`Found Circular Pipes: "${circularPipes.slice(0, 3).join("\", ") + "\"" + (circularPipes.length > 3 ? ", continued" : "")}`)
    const startingPipes = this.getStartingPipes()
    if (startingPipes.length < 1) throw new Error(`No valid starting pipes.`)
    this.runPipes(Object.values(this.pipes)).then(this.succeed).catch(this.throw)
    startingPipes.forEach(pipe => pipe.start())
    if (isFinite(this.options.timeout) && this.options.timout > 0) {
      this.throw(new Error(`Aquadux Timed Out after ${Math.floor(this.options.timeout / 1000 * 100) / 100} seconds`))
    }
    this.eventListeners.started.forEach(listener => listener())
    return this.promise
  }
  succeed(output) {
    if (this.finished === true) return
    this.finish(output)
    this.eventListeners.success.forEach(listener => {
      listener(output)
    })
  }
  throw(error) {
    if (this.finished === true) return
    this.finish(error)
    this.eventListeners.failure.forEach(listener => {
      listener(error)
    })
  }
  finish(result) {
    if (this.finished === true) return
    this.finished = true
    this.eventListeners.finished.forEach(listener => listener(result))
  }
  getOutput() {
    const output = {}
    Object.entries(this.pipes).forEach(([pipeName, pipe]) => {
      output[pipeName] = pipe.result
    })
    return output
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
  requirePipe(path) {
    if (!isNode) throw new Error("Aquadux not running in node.")
    let rawPipe = require(path)
    if (typeof rawPipe == 'function') rawPipe = [rawPipe]
    if (!Array.isArray(rawPipe)) throw new Error("The pipe file should export an array of parameters.")
    if (rawPipe.length < 3 && typeof rawPipe[0] != 'string') {
      const name = basename(path)
      if (!this.pipes.hasOwnProperty(name)) rawPipe.unshift(name)
    }
    if (rawPipe.length > 3) throw new Error("The pipe file exports too many parameters")
    return this.createPipe(...rawPipe)
  }
  requirePipesFolder(path, deep=false) {
    if (!isNode) throw new Error("Aquadux not running in node.")
    const scripts = getFiles(path, deep, /.js$/)
    if (scripts.length < 1) console.warn(new Error("No pipes found in the target directory"))
    return scripts.map(this.requirePipe)
  }
}

module.exports = Aquadux
