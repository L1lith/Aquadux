const autoBind = require('auto-bind')

class EventManager {
  constructor() {
    autoBind(this)
    this.eventListeners = {}
  }
  on(eventName, func) {
    if (typeof eventName != 'string' || eventName.length < 1) throw new Error("Must supply a non-empty string")
    if (typeof func != 'function') throw new Error("Must supply a function")
    if (!this.eventListeners.hasOwnProperty(eventName)) throw new Error("Invalid Event Name")
    const listeners = this.eventListeners[eventName]
    if (listeners.includes(func)) return console.warn(new Error("Listener Already Registered"))
    listeners.push(func)
  }
  addEventListener(eventName, func) {
    return this.on(eventName, func)
  }
  removeEventListener(eventName, func) {
    if (typeof eventName != 'string' || eventName.length < 1) throw new Error("Must supply a non-empty string")
    if (typeof func != 'function') throw new Error("Must supply a function")
    if (!this.eventListeners.hasOwnProperty(eventName)) throw new Error("Invalid Event Name")
    const listeners = this.eventListeners[eventName]
    if (!listeners.includes(func)) return console.warn(new Error("Listener Not Registered"))
    listeners.splice(listeners.indexOf(func), 1)
  }
  createEvent(name) {
    if (typeof name != 'string' || name.length < 1) throw new Error("Must supply a non-empty string")
    if (this.eventListeners.hasOwnProperty(name)) throw new Error("Event already exists")
    this.eventListeners[name] = []
  }
  createEvents(names) {
    if (!Array.isArray(names) || names.length < 1 || names.some(name => typeof name != 'string' || name.length < 1)) throw new Error("Names must be an array of non-empty strings")
    names.forEach(name => this.createEvent(name))
  }
}

module.exports = EventManager
