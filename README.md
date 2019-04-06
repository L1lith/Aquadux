# Aquadux
Aquadux is a solution to help you manage application flow, dependency injection, and promise handling.

## A Basic Example
Here's a straightforward example to help you get into the library. See the documentation below for more details
```js
const Aquadux = require('aquadux')

const dux = new Aquadux()

function timer(ms) { // A simple timer function to help us simulate asynchronous program flow
  return new Promise(res => setTimeout(res, ms))
}

dux.createPipe('shopData' /* Here we supply it a name so we can depend upon it later */, async ()=>{
  await timer(1000) // In reality we might be making a request to a backend
  return {cartItems: ["Blue Dress", "Red Overcoat"]}
})
const mainScript = duct.createPipe(({shopData}) => { // Aquadux automatically detects this script is dependant upon the pipe named shopData, and waits for it to finish before calling this script
  const {cartItems} = shopData
  console.log(cartItems)
})

dux.start().then(pipeOutputs => {
  console.log(pipeOutputs) // returns {shopData: {cartItems: ["Blue Dress", "Red Overcoat"]}, "unnamedPipe#1": undefined}
}).catch(error => {
  console.log(error) // The entire Aquadux rejects with the first error.
})
```

## Documentation
### The Aquadux Class
#### The Basics
The Aquadux class is the base of the library, when using the library you must first instantiate a Aquadux object
```js
const {Aquadux} = require('aquadux')

const dux = new Aquadux()
```


Now we can use this object to create pipes. Pipes are simply functions (which can be asynchronous) that aquadux will automatically decide when to run depending on which other functions they are dependant upon. We must also supply them with a name string if other pipes are dependant upon them so Aquadux can know to pass them to the dependant pipes.
```js
const {writeFileSync} = require('fs')
const {join} = require('path')
const fetch = require('node-fetch')
const {Aquadux} = require('aquadux')

const dux = new Aquadux()

dux.createPipe("googleHomePage", async ()=>{ // Here we supply the name so that Aquadux can tell that it is the pipe the next pipe is dependant upon
  return await fetch("https://www.google.com/")
})
dux.createPipe(({googleHomePage})=>{
  writeFileSync(join(__dirname, 'googleHomePage.html'))
})
```

Once we have setup all of our pipes, we can start running the Aquadux instance. The Aquadux object has the .start method which will return a promise that will resolve when all of the pipes have run successfully, and will reject upon the first pipe that fails. If you would like to allow Aquadux to continue when a specific pipe has failed see the canFail option in the pipe object section.
```js
const {writeFileSync} = require('fs')
const {join} = require('path')
const fetch = require('node-fetch')
const {Aquadux} = require('aquadux')

const dux = new Aquadux()

dux.createPipe("googleHomePage", async ()=>{ // Here we supply the name so that Aquadux can tell that it is the pipe the next pipe is dependant upon
  return (await fetch("https://www.google.com/")).text()
})
dux.createPipe(({googleHomePage})=>{
  writeFileSync(join(__dirname, 'googleHomePage.html'), googleHomePage)
})

dux.start().then(pipeOutputs => {
  console.log("Success, got", pipeOutputs)
}).catch(error => {
  console.log("Failed with error", error)
})
```

#### Methods
##### requirePipe
Allows you to require a pipe from the filesystem, directly injecting it into the Aquadux instance. The pipe javascript file should export a function or an array of arguments (as if they were being used in createPipe). If no name is supplied the pipes name will default to the file's name (unless it's taken). Here's an Example Project

/index.js
```js
const {Aquadux} = require('aquadux')

const dux = new Aquadux()
dux.requirePipe("./pipe1")
dux.start().catch(console.log) // Logs "hello"
```
/pipe1.js
```js
function pipe1() {
  console.log('hello')
}

module.exports = pipe1
```
##### requirePipesFolder
Expects a folder path, and then requires all the javascript files inside as pipes, similar to the requirePipe method above. Short Example
```js
const {Aquadux} = require('aquadux')
const {join} = require('fs')

const dux = new Aquadux()
dux.requirePipesFolder(join(__dirname, "pipes")) // requires all the pipes in the "pipes" folder
dux.start().catch(console.log)
```

#### Dependency Detection Under the Hood
How does Aquadux know each pipes dependent pipes? Well Aquadux specifically looks for the first input parameter of the function to be using [object deconstruction syntax](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring_assignment#Unpacking_fields_from_objects_passed_as_function_parameter). As you can see above object deconstruction syntax looks like this `({googleHomePage})`. When Aquadux looks at the code of the function and sees the input parameters is using this syntax it takes the name of each object property we're using and automatically adds the pipe with that name as a dependency. If this doesn't make sense to you how Aquadux is doing this it's okay as long as you understand that using the deconstructive syntax is required to make Aquadux automatically make it a dependency.
If you do not want to use the object deconstruction syntax but still want to have dependencies for your pipe, you can use the pipe method .dependUpon as documented below.


### The Pipe Object
#### Pipe Creation Parameters
When creating a pipe object it takes up to 3 parameters
1. A name string (optional, defaults to the function name if it's a named function)
2. The function for the pipe to run (required)
3. An options object (optional)
It can look like any of these ways when creating a pipe, simply put the options in the right order, and then only supply the ones you need like so:
```js
dux.createPipe(()=>{/*...function body*/})
dux.createPipe("pipeName", ()=>{/*...function body*/})
dux.createPipe("pipeName", ()=>{/*...function body*/}, {/*...options*/})
dux.createPipe(()=>{/*...function body*/}, {/*...options*/})
```
#### Pipe Options
We can pass an object with any of the following properties when creating it as the last argument in order to specify custom options.
##### canFail
If we set canFail to true then when the pipe fails instead of causing the entire Aquadux instance to throw an error it simply passes the error to the dependant pipes instead and continues running. For example:
```js
const {Aquadux} = require('aquadux')

const dux = new Aquadux()
dux.createPipe('pipe1', ()=>{
  throw new Error("Unknown Error")
  return 12
}, {canFail: true})
dux.createPipe(({pipe1})=>{
  console.log(pipe1) // Logs the error object once Aquadux runs
})
dux.start().then(()=>{
  console.log("The error handler was not called") // This function is called
}).catch(error => {
  console.log("The error handler was called") // The error handler is not called because pipe1 was allowed to fail.
})
```

##### timeout
Passing timeout value will cause the pipe to throw a timeout error after the specified number of milliseconds.
```js
dux.createPipe(()=>{
  return new Promise((resolve, reject) => {
    setTimeout(resolve, 1000)
  })
}, {timeout: 500}) // This pipe will throw a timeout error because the timeout is shorter than the time it takes for the promise to resolve.
```
