const getFunctionParameters = require("./getFunctionParameters")

const goodPropertyNameCharacters = /^[a-z0-9\_]+$/i

function findPipeDependencies(pipe) {
  const parameters = getFunctionParameters(pipe.func)
  if (parameters.length < 1) return []
  const dependencyParameter = parameters[0].replace(/\s/, '')
  if (!(dependencyParameter.startsWith('{') && dependencyParameter.endsWith("}"))) return []
  const dependencies = dependencyParameter.slice(1, dependencyParameter.length - 1).split(',').filter(str => goodPropertyNameCharacters.test(str))
  return dependencies
}

module.exports = findPipeDependencies
