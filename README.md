# Aquadux
Aquadux is a solution to help you manage application flow, dependency injection, and promise handling.

### Example
Here's a straightforward example to help you get into the library.
```js
const Aquadux = require('./src/Aquadux')

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
  console.log(result) // returns {shopData: {cartItems: ["Blue Dress", "Red Overcoat"]}, "unnamedPipe#1": undefined}
}).catch(error => {
  console.log(error) // The entire Aquadux rejects with the first error.
})
```
