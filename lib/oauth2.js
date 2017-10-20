var ClientOAuth2 = require('client-oauth2')

exports.discord = new ClientOAuth2({
  clientId: process.env.OAUTH_KEY,
  clientSecret: process.env.OAUTH_SECRET,
  authorizationUri: 'https://discordapp.com/api/oauth2/authorize',
  accessTokenUri: 'https://discordapp.com/api/oauth2/token',
  redirectUri: process.env.HOST + '/connect/discord/callback',
  scopes: ['identify', 'email']
})

exports.github = new ClientOAuth2({
  clientId: process.env.GITHUB_KEY,
  clientSecret: process.env.GITHUB_SECRET,
  authorizationUri: 'https://github.com/login/oauth/authorize',
  accessTokenUri: 'https://github.com/login/oauth/access_token',
  redirectUri: process.env.HOST + '/connect/github/callback',
  scopes: ['read:org']
})
