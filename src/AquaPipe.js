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
    this.promise = new Promise((resolve, reject) => {
      this.then(resolve)
      this.catch(reject)
    })
    this.promise.catch(/*Silence Unhandled Promise Warnings*/()=>{})
  }
  waitFor(pipe, useData=false) {
    pipe = this.pipeline.resolvePipe(pipe)
    if (this.started || this.finished) throw new Error("Already started, cannot wait for anything else.")
    if (this.waitingFor.includes(pipe)) throw new Error("Already waiting for that pipe")
    pipe.dependants.push(this)
    this.waitingFor.push(pipe)
    const onFinish = output => {
      const index = this.waitingFor.indexOf(pipe)
      if (index < 0) return
      this.waitingFor.splice(index, 1)
      if (useData === true) this.data[pipe.name] = output
      this.checkReady()
    }
    if (pipe.options.canFail === true) {
      pipe.on('finished', onFinish)
    } else {
      pipe.on('success', onFinish)
    }
  }
  dependUpon(pipe) {
    return this.waitFor(pipe, true)
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
    if (isFinite(this.options.timeout) && this.options.timeout > 0) {
      setTimeout(()=>{
        if (this.finished === true) return
        this.handleError(new Error(`Pipe Timed Out after ${Math.floor(this.options.timeout / 1000 * 100) / 100} seconds`))
      }, this.options.timeout)
    }
    let output
    try {
      output = this.func(this.data)
    } catch(error) {
      this.eventListeners.started.forEach(listener => listener())
      return this.handleError(error)
    }
    this.eventListeners.started.forEach(listener => listener())
    if (output instanceof Promise) {
      output.then(this.handleSuccess).catch(this.handleError)
    } else {
      this.handleSuccess(output)
    }
  }
  handleSuccess(output) {
    if (this.finished === true) return
    this.output = output
    this.result = output
    this.handleFinished()
    this.eventListeners.success.forEach(listener => listener(output))
  }
  handleError(error) {
    if (this.finished === true) return
    this.error = error
    this.result = error
    this.handleFinished()
    this.eventListeners.failure.forEach(listener => listener(error))
  }
  handleFinished() {
    if (this.finished === true) return
    this.finished = true
    this.eventListeners.finished.forEach(listener => listener(this.result))
  }
  then(func) {
    this.on('success', func)
    return this.promise
  }
  catch(func) {
    this.on('failure', func)
    return this.promise
  }
  finally(func) {
    this.on('finished', func)
    return this.promise
  }
}

module.exports = AquaPipe
