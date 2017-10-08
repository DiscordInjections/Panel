const oauth2 = require('../lib/oauth2')
const User = require('../models/user')

const Router = require('impress-router')
const router = new Router()
module.exports = router

router.get('/discord', ctx => {
  // TODO: nonce
  // ctx.session.oauthState =
  ctx.redirect(oauth2.code.getUri())
})

router.get('/discord/callback', async ctx => {
  const token = await oauth2.code.getToken(ctx.originalUrl)
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
    user = await User.query().patch(data).returning('*')
  }
  if (user.length) {
    user = user[0]
  }

  ctx.session.user = user.id

  return ctx.redirect('/account/login/callback')
})
