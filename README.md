# Aquadux
Aquadux is a solution to help you manage application flow, dependency injection, and promise handling.

## A Basic Example
Here's a straightforward example to help you get into the library. See the documentation below for more details
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


#### Dependency Detection Under the Hood
How does Aquadux know each pipes dependent pipes? Well Aquadux specifically looks for the first input parameter of the function to be using [object deconstruction syntax](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring_assignment#Unpacking_fields_from_objects_passed_as_function_parameter). As you can see above object deconstruction syntax looks like this `({googleHomePage})`. When Aquadux looks at the code of the function and sees the input parameters is using this syntax it takes the name of each object property we're using and automatically adds the pipe with that name as a dependency. If this doesn't make sense to you how Aquadux is doing this it's okay as long as you understand that using the deconstructive syntax is required to make Aquadux automatically make it a dependency.
If you do not want to use the object deconstruction syntax but still want to have dependencies for your pipe, you can use the pipe method .dependUpon as documented below.


### The Pipe Object
#### Pipe Creation Parameters
When creating a pipe object it takes up to 3 parameters
1. A name string (optional)
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
