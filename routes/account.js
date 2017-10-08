const Router = require('impress-router')
const router = new Router()
module.exports = router

router.get('/', async ctx => {
  if (!ctx.state.user) {
    return ctx.redirect('/account/login', 303)
  }
  ctx.marko('routes/account')
})

router.get('/login', ctx => ctx.redirect('/connect/discord', 301))
router.get('/login/callback', ctx => ctx.redirect('/account/'))
