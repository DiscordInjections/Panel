var ClientOAuth2 = require('client-oauth2')

var oauth2 = new ClientOAuth2({
  clientId: process.env.OAUTH_KEY,
  clientSecret: process.env.OAUTH_SECRET,
  authorizationUri: 'https://discordapp.com/api/oauth2/authorize',
  accessTokenUri: 'https://discordapp.com/api/oauth2/token',
  redirectUri: process.env.HOST + '/connect/discord/callback',
  scopes: ['identify', 'email']
})

module.exports = oauth2
