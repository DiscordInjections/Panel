const Router = require('impress-router')
const router = new Router()
module.exports = router

router.get('/', async ctx => {
  if (!ctx.state.user) {
    return ctx.redirect('/account/login', 303)
  }
  ctx.marko('routes/account')
})

router.get('/login', async ctx => ctx.redirect('/connect/discord', 301))
router.get('/login/callback', async ctx => {
  const accessToken = ctx.query.access_token
  const refreshToken = ctx.query.refresh_token

  const response = await fetch("https://discordapp.com/api/users/@me", {
    method: "GET", headers: {
      "Content-Type": "application/json",
      "Authentication": "Bearer " + accessToken
    }
  })
})
