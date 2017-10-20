module.exports = class {
  onCreate (input) {
    input.query = input.query || {}
    this.state = {
      category: input.category || 'all',
      search: input.query.search || '',
      filterRating: +input.query.rating || 0,
      page: +input.query.page || 1
    }
  }

  onInput (input) {
    ;(this.state.search = input.query.search || ''), (this.state.filterRating = +input.query.rating || 0)
    this.state.page = +input.query.page || 1
  }

  onChangeFilterRating (val) {
    this.state.filterRating = val
  }
}
