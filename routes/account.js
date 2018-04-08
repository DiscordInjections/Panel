const Router = require('impress-router')
const router = new Router()
const { Plugin } = require('../models')
module.exports = router

router.get('/', async ctx => {
  if (!ctx.state.user) {
    return ctx.redirect('/account/login', 303)
  }

  // gonna grab dat juicy github info
  let github = false
  if (ctx.state.user.github_access_token) {
    github = await ctx.cache('github:' + ctx.state.user.github, async () => {
      return ctx.state.user
        .fetchGithub('https://api.github.com/user')
        .then(res => {
          if(res.status == 401) {
            delete ctx.state.user.github_access_token
            await ctx.state.user.query().patch(ctx.state.user)
            return false
          }
          return res.json()
         })
        .catch(err => ctx.logger.error({ err }, 'no fetchy github'))
    })
  }

  let plugins = []

  ctx.marko('routes/account', { github, plugins })
})

router.get('/login', ctx => {
  if (ctx.query.to) {
    ctx.session.loginRedirect = ctx.query.to
  }
  ctx.redirect('/connect/discord', 301)
})
router.get('/login/callback', ctx => {
  const to = ctx.session.loginRedirect || '/account/'
  ctx.session.loginRedirect = null
  delete ctx.session.loginRedirect
  ctx.redirect(to)
})

router.get('/github', ctx => {
  if (ctx.query.to) {
    ctx.session.githubRedirect = ctx.query.to
  }
  ctx.redirect('/connect/github')
})
router.get('/github/callback', ctx => {
  const to = ctx.session.githubRedirect || '/account/'
  ctx.session.githubRedirect = null
  delete ctx.session.githubRedirect
  ctx.redirect(to)
})
