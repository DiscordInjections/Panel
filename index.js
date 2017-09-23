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

const Strategy = require("passport-discord").Strategy
const passport = require("passport")
const session = require("express-session")

const strategy = new Strategy(
  {
    clientID: global.config.appinfo.id,
    clientSecret: global.config.appinfo.secret,
    callbackURL: global.config.appinfo.callback,
    scope: ["identify"],
  },
  (accessToken, refreshToken, profile, done) => {
    process.nextTick(() => {
      return done(null, profile)
    })
  }
)

passport.use(strategy)

const app = express()

app.use(
  session({
    secret: global.config.appinfo.othersecret,
    resave: false,
    saveUninitiated: true,
    cookie: {
      secure: false,
      maxAge: 86400000,
      httpOnly: false,
    },
  })
)

app.use(passport.initialize())
app.use(passport.session())

passport.serializeUser((user, done) => {
  done(null, user)
})

passport.deserializeUser((obj, done) => {
  done(null, obj)
})

*/

// app.use('/api', require('./routes/api'))
// TODO: app.use(mount('/api', require("./routes/api")))

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

/*
app.get(
  "/login",
  passport.authenticate("discord", {
    scope: ["identify"],
  })
)
app.get(
  "/callback",
  passport.authenticate("discord", {
    failureRedirect: "/",
  }),
  async (req, res) => {
    console.log("A user has authenticated")
    let rows = await global.pg_pool.query("SELECT token, salt FROM public.user WHERE id = $1", [req.user.id])
    if (rows.rows.length === 0) {
    }
    global.userMap[req.sessionID] = req.user.id
    res.redirect("/")
  }
)

const websocketServer = new WebsocketServer(app)
*/

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

// require("./bot")
