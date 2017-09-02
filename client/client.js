require('./components/app/index.marko')
  .render({}) // TODO: params
  .then(dom => dom.appendTo(document.body))
