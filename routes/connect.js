const oauth2 = require('../lib/oauth2')
const User = require('../models/user')

const Router = require('impress-router')
const router = new Router()
module.exports = router

router.get('/discord', ctx => {
  ctx.redirect(oauth2.discord.code.getUri())
})

router.get('/discord/callback', async ctx => {
  const token = await oauth2.discord.code.getToken(ctx.originalUrl)
  if (!token.accessToken) {
    ctx.throw(401)
  }

  const info = await fetch('https://discordapp.com/api/users/@me', token.sign({})).then(res => res.json())

  // the user has fiddled with the scopes :(
  if (!info.email || !info.id) {
    return ctx.redirect('/connect/discord')
  }

  let user = await User.query().findById(info.id).first()

  const data = {
    oauth_access_token: token.accessToken,
    oauth_refresh_token: token.refreshToken,
    oauth_expires: token.expires,
    id: info.id,
    username: info.username,
    discriminator: info.discriminator,
    email: info.email,
    avatar: info.avatar,
    salt: user ? user.salt : ''
  }

  if (!user) {
    user = await User.query().insert(data).returning('*')
  } else {
    user = await User.query().patch(data).where('id', '=', data.id).returning('*')
  }
  if (user.length) {
    user = user[0]
  }

  ctx.session.user = user.id

  return ctx.redirect('/account/login/callback')
})

router.get('/github', ctx => {
  // login before we can assign any github thingy lol
  if (!ctx.state.user) {
    return ctx.redirect('/account/login?to=' + encodeURIComponent(ctx.originalUrl))
  }
  ctx.redirect(oauth2.github.code.getUri())
})

router.get('/github/callback', async ctx => {
  const token = await oauth2.github.code.getToken(ctx.originalUrl)
  if (!token.accessToken) {
    ctx.throw(401)
  }

  const info = await fetch('https://api.github.com/user', token.sign({})).then(res => res.json())

  // the user has fiddled with the scopes :(
  if (!info.id) {
    return ctx.redirect('/connect/github')
  }

  // extend current users info
  const patch = {
    github_access_token: token.accessToken,
    github_refresh_token: token.refreshToken,
    github: info.login
  }
  await User.query().patch(patch).where('id', '=', ctx.state.user.id).returning('*')

  return ctx.redirect('/account/github/callback')
})
