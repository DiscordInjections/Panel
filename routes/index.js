const passport = require('koa-passport')

module.exports = router => {
  router.get('/account/login', passport.authenticate('discord'))
  router.get(
    '/account/login/callback',
    passport.authenticate('discord', {
      successRedirect: '/account',
      failureRedirect: '/'
    })
  )
}
