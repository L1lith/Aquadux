const autoBind = require("auto-bind")
const EventManager = require('./EventManager')

class AquaPipe extends EventManager {
  constructor(pipeline, name, func, options) {
    super()
    autoBind(this)
    this.pipeline = pipeline
    this.func = func
    this.name = name
    this.options = options
    this.dependants = []
    this.finished = false
    this.started = false
    this.createEvents(['started', 'finished', 'success', 'failure'])
    this.waitingFor = []
    this.data = {}
  }
  waitFor(pipeName, useData=false) {
    if (this.started || this.finished) throw new Error("Already started, cannot wait for anything else.")
    const pipe = this.pipeline.getPipe(pipeName)
    if (this.waitingFor.includes(pipe)) throw new Error("Already waiting for that pipe")
    pipe.dependants.push(this)
    this.waitingFor.push(pipe)
    pipe.then(output => {
      const index = this.waitingFor.indexOf(pipe)
      if (index < 0) return
      this.waitingFor.splice(index, 1)
      if (useData === true) this.data[pipe.name] = output
      this.checkReady()
    })
  }
  dependUpon(pipeName) {
    return this.waitFor(pipeName, true)
  }
  checkReady() {
    if (this.waitingFor.length === 0 && this.pipeline.started === true && this.started === false) {
      this.start()
      return true
    } else {
      return false
    }
  }
  start() {
    this.started = true
    let output
    try {
      output = this.func(this.data)
    } catch(error) {
      return this.handleError(error)
    }
    if (output instanceof Promise) {
      output.then(this.handleSuccess).catch(this.handleError)
    } else {
      this.handleSuccess(output)
    }
  }
  handleSuccess(output) {
    this.output = output
    this.result = output
    this.handleFinished()
    this.eventListeners.success.forEach(listener => listener(output))
  }
  handleError(error) {
    this.error = error
    this.result = error
    this.handleFinished()
    this.eventListeners.failure.forEach(listener => listener(error))
  }
  handleFinished() {
    this.finished = true
    this.eventListeners.finished.forEach(listener => listener(this.result))
  }
  then(func) {
    this.on('success', func)
  }
  catch(func) {
    this.on('failure', func)
  }
  finally(func) {
    this.on('finished', func)
  }
}

module.exports = AquaPipe
