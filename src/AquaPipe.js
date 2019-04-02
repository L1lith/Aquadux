class AquaPipe {
  constructor(pipeline, name, func, options) {
    this.pipeline = pipeline
    this.func = func
    this.name = name
    this.options = options
    this.finished = false
    this.started = false
    this.listeners = {started: [], finished: [], success: [], failure: [], done: []}
    this.waitingFor = []
    this.data = {}
  }
  waitFor(pipeName) {
    const pipe = this.pipeline.getPipe(pipeName)
    if (this.waitingFor.includes(pipe)) throw new Error("Already waiting for that pipe")
    this.waitingFor.push(pipe)
    pipe.finally(() => {
      const index = this.waitingFor.indexOf(pipe)
      if (index < 0) return
      this.waitingFor.splice(index, 1)
      this.checkReady()
    })
  }
  requireOutput(pipeName) {

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
    this.eventListeners.done.forEach(listener => listener(this.result))
  }
  then(func) {
    this.on('success', func)
  }
  catch(func) {
    this.on('failure', func)
  }
  finally(func) {
    this.on('done', func)
  }
  on(eventName, func) {
    if (typeof eventName != 'string' || eventName.length < 1) throw new Error("Must supply a non-empty string")
    if (typeof func != 'function') throw new Error("Must supply a function")
    if (!this.eventListeners.hasOwnProperty(eventName)) throw new Error("Invalid Event Name")
    const listeners = this.eventListeners[eventName]
    if (listeners.includes(func)) return console.warn(new Error("Listener Already Registered"))
    listeners.push(func)
  }
}

module.exports = AquaPipe
