const Router = require('impress-router')
const router = new Router()
module.exports = router

const { Plugin } = require('../models')

router.get('/', ctx => ctx.redirect('/plugins/all'))

router.get('/add', async ctx => {
  if (!ctx.state.user) {
    return ctx.redirect('/account/login?to=' + encodeURIComponent(ctx.originalUrl))
  }

  // check if we have github connected
  ctx.body = 'plugin add'
})

router.get('/:category/:page?', async ctx => {
  if (['all', 'api', 'func', 'prod', 'games', 'misc'].indexOf(ctx.params.category) < 0) {
    return ctx.throw(404)
  }

  if (!ctx.params.page) {
    ctx.params.page = 1
  }

  const q = Plugin.query().eager('owner')
  if (ctx.params.category !== 'all') {
    q.where('category', '=', ctx.params.category)
  }
  const plugins = await q.page(ctx.params.page, 10)
  plugins.pages = Math.round(plugins.total / 10 + 0.5)

  // TODO: allow adding of plugins

  ctx.marko('routes/plugins', {
    category: ctx.params.category,
    page: ctx.params.page,
    plugins
  })
})
