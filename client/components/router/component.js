const history = require('history')
const Router = require('sheet-router')
const path = require('path')
let ssr = true
let _history = history.createMemoryHistory()
try {
  _history = history.createBrowserHistory()
  ssr = false
} catch (ex) {
  if (!module) console.error(ex)
}

module.exports = class {
  static get history () {
    return _history
  }

  onCreate (input) {
    const routes = input.routes
    if (!routes) {
      throw new Error('"routes" param must be provided')
    } else if (routes && routes.length === 0) {
      throw new Error('"routes" list cannot be empty')
    }

    this._router = Router({ default: input.defaultRoute || '/404' }, this._buildTrie(routes))
    this.state = {
      currentRoute: input.initialRoute,
      component: null
    }
  }

  onInput (input) {
    if (ssr) {
      _history.push(this.state.currentRoute)
    }

    this.input = input
    this.state.component = this._router(input.initialRoute, true)
  }

  onMount () {
    this._removeListener = _history.listen(this._onChangeRoute.bind(this))

    try {
      if (this.state.currentRoute) {
        _history.push(this.state.currentRoute, {})
      }
    } catch (err) {
      err.message = 'Unable to push initial route: ' + err.message
      throw err
    }
  }

  onDestroy () {
    if (this._removeListener) {
      this._removeListener()
    }
  }

  _buildTrie (routes, path = '') {
    if (!routes) {
      return null
    }

    return routes.map(entry => {
      let component = null
      if (entry.component) {
        component = (params, out) => this._renderRoute(entry.component, params, out)
      } else if (entry.redirect) {
        component = (params, out) => {
          if (ssr) {
            this.input.redirect(entry.redirect)
          } else {
            setTimeout(to => _history.replace(to), 0, entry.redirect)
          }

          return null
        }
      } else if (!entry.component && entry.children.length) {
        component = (params, out) => _history.push(path + entry.children[0].path)
      }

      return [entry.path, component, this._buildTrie(entry.children, entry.path)]
    })
  }

  _renderRoute (componentPath, params, noReplace = false) {
    const componentFullPath = [this.input.routePath || '..', componentPath, 'index.marko'].join('/')
    return require(componentFullPath)
  }

  _onChangeRoute (location, action) {
    this.state.currentRoute = location.pathname + location.search + location.hash
    this.state.component = this._router(this.state.currentRoute)
  }
}
