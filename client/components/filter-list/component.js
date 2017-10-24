module.exports = class {
  onCreate () {
    this.state = { filter: '' }
  }

  onFilter (ev, el) {
    this.state.filter = el.value
  }
}
