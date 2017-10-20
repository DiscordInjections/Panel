require('./lib/patcher')
const isDev = process.env.NODE_ENV === 'development'
const path = require('path')

const dwh = require('./lib/dwh')

const Koa = require('koa')
const Redis = require('ioredis')
const CSRF = require('koa-csrf')
const http = require('http')
const { Model } = require('objection')
const url = require('url')

// logger
const { createLogger } = require('bunyan')
const logger = createLogger({
  name: 'panel',
  serializers: require('./lib/serializers'),
  src: isDev,
  stream: process.stderr,
  level: isDev ? 'trace' : 'info'
})

process.on('unhandledRejection', (err, promise) => {
  logger.error({ err, promise }, 'unhandled rejection!')
  dwh(process.env.DISCORD_WEBHOOK, {
    title: 'Error',
    description: 'An unhandled rejection happened!',
    color: 9577852,
    fields: [
      {
        name: 'Message',
        value: err.message,
        inline: true
      },
      {
        name: 'Stack',
        value: '```' + err.stack + '```'
      }
    ]
  })
})

// database connections
const redis = new Redis(process.env.REDIS)
Model.knex(
  require('knex')({
    client: 'postgres',
    connection: process.env.POSTGRES
  })
)

// load all dem models
require('./models')

// webapplication
const app = new Koa()
app.keys = JSON.parse(process.env.COOKIE_SECRET)

app.use(require('koa-json-error')())
app.use(require('./lib/middleware').discord(process.env.DISCORD_WEBHOOK))

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
  bundlingEnabled: !isDev,
  bundles: [
    {
      name: 'common',
      dependencies: [{ intersection: ['./client/routes/*/index.marko'] }]
    },
    {
      name: 'routes',
      dependencies: ['./client/routes/*/index.marko']
    }
  ]
})

app.use(require('./lib/middleware').serveStatic({ urlPrefix: '/assets' }))
app.use(require('koa-static')(path.join(__dirname, 'static')))

app.use(require('./lib/middleware').logger(logger.child({ module: 'http' }), !!process.env.VERBOSE))

if (process.env.WEBHOOK_SECRET) {
  app.use(require('./lib/middleware').webhook(process.env.DISCORD_WEBHOOK, process.env.WEBHOOK_SECRET))
}

app.use(require('./lib/middleware').qs())
app.use(
  require('koa-session2')({
    key: 'disid',
    store: require('./lib/store').create(redis)
  })
)
app.use(require('./lib/middleware').sessionLoader())
app.use(require('./lib/middleware').cache(redis))
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
app.use(require('./lib/middleware').marko(path.join(__dirname, 'client'), 'layout.marko'))
app.use(require('./routes'))

const port = +process.env.PORT
const host = process.env.BIND
app.listen(port, host, () => {
  logger.info({ host, port }, 'app listening')

  if (process.send) {
    process.send('online')
  }

  dwh(process.env.DISCORD_WEBHOOK, {
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
  })
})
