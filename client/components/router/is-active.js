const Router = require('./component')

module.exports = function (path) {
  const location = Router.history.location.pathname + Router.history.location.search + Router.history.location.hash
  return location.startsWith(path)
}
