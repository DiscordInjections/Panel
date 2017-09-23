module.exports = class {
  onCreate () {
    this.state = {
      routes: require('../../routes.json')
    }
  }
}
