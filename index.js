require('./lib/patcher')
const isDev = process.env.NODE_ENV === 'development'
const path = require('path')

const Koa = require('koa')
const Router = require('impress-router')
const Redis = require('ioredis')
const CSRF = require('koa-csrf')
const http = require('http')
const passport = require('koa-passport')
const DiscordStrategy = require('passport-discord')

// logger
const { createLogger } = require('bunyan')
const logger = createLogger({
  name: 'panel',
  serializers: require('./lib/serializers'),
  src: isDev,
  stream: process.stderr,
  level: isDev ? 'trace' : 'info'
})

// database connections
const redis = new Redis(process.env.REDIS)

// passport
passport.use(
  new DiscordStrategy(
    {
      clientID: process.env.OAUTH_KEY,
      clientSecret: process.env.OAUTH_SECRET,
      callbackURL: process.env.HOST + '/account/login/callback',
      scope: ['identify', 'email']
    },
    (access, refresh, profile, cb) => cb(null, {})
  )
)
/*
passport.serializeUser(function (user, done) {
  done(null, user.id)
})

passport.deserializeUser(async function (id, done) {
  try {
    const user = await fetchUser()
    done(null, user)
  } catch (err) {
    done(err)
  }
})
*/

// webapplication
const app = new Koa()
app.keys = JSON.parse(process.env.COOKIE_SECRET)

app.use(require('koa-json-error')())
if (process.env.DISCORD_WEBHOOK) {
  app.use(require('./lib/middleware').discord(process.env.DISCORD_WEBHOOK))
}
app.use(require('./lib/middleware').logger(logger.child({ module: 'http' })))

const plugins = [
  'lasso-marko',
  {
    plugin: 'lasso-stylus',
    config: {
      use: [require('stylus-require-css-evaluator')],
      includes: [path.join(__dirname, 'node_modules'), path.join(__dirname, 'client')]
    }
  }
]
if (!isDev) plugins.push('lasso-optimize-iife')
require('lasso').configure({
  plugins,
  includeSlotNames: !isDev,
  fingerprintsEnabled: !isDev,
  bundlingEnabled: !isDev
})

app.use(require('./lib/middleware').serveStatic({ urlPrefix: '/assets' }))
app.use(require('koa-static')(path.join(__dirname, 'static')))

/*
const express = require("express")
global.config = require("./config.json")
const { Client, Pool } = require("pg")
global.pg_pool = new Pool(config.db)
global.helpers = require("./helpers")
global.userMap = {}
const WebsocketServer = require("./backend/websocket")
const websocketServer = new WebsocketServer(app)
*/

const router = new Router()
require('./routes')(router)
app.use(
  require('koa-session2')({
    key: 'disid',
    store: require('./lib/store').create(redis)
  })
)
app.use(passport.initialize())
app.use(passport.session())
app.use(
  new CSRF({
    invalidSessionSecretMessage: 'Invalid session secret',
    invalidSessionSecretStatusCode: 403,
    invalidTokenMessage: 'Invalid CSRF token',
    invalidTokenStatusCode: 403,
    excludedMethods: ['GET', 'HEAD', 'OPTIONS'],
    disableQuery: false
  })
)
app.use(require('koa-json-body')())
app.use(router)
app.use(async (ctx, next) => {
  ctx.type = 'html'
  ctx.body = require('./client/index.marko').stream({ ctx })
})

const port = +process.env.PORT
const host = process.env.BIND
app.listen(port, host, () => {
  logger.info({ host, port }, 'app listening')

  if (process.send) {
    process.send('online')
  }

  if (process.env.DISCORD_WEBHOOK) {
    fetch(process.env.DISCORD_WEBHOOK + '?wait=1', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        embeds: [
          {
            title: 'Status',
            description: 'DI-Panel has been started',
            color: 6469211, // 9577852
            timestamp: new Date().toISOString(),
            fields: [
              {
                name: 'Host',
                value: host,
                inline: true
              },
              {
                name: 'Port',
                value: port,
                inline: true
              }
            ]
          }
        ]
      })
    }).catch(err => logger.error({ err }, 'failed to post to discord'))
  }
})
