const { isDev, logger, models, redis, redisListener } = require('./bootstrap')

// creating redis pubsub
redisListener.subscribe('dip-broadcast', (err, count) => {
  if (err) {
    logger.error({ err }, 'failed to subscribe to the channels')
  }

  logger.trace({ count }, 'subscribed to redis channels')
})

redisListener.on('message', async (channel, message) => {
  const data = JSON.parse(message)
  logger.debug({ channel, action: data.action }, 'incoming message')

  switch (channel) {
    case 'dip-broadcast':
      switch (data.action) {
        case 'restart':
          logger.debug('Restarting process!')
          // manually emit shutdown message
          process.exit()

          break
        default:
          logger.warn({ channel, action: data.action }, 'unkown action!')
      }
      break

    default:
      logger.warn({ channel }, 'message on unkown channel')
  }
})

const path = require('path')
const Koa = require('koa')
const http = require('http')

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

app.use(require('./lib/middleware').qs())
app.use(
  require('koa-session2')({
    key: 'disid',
    store: require('./lib/store').create(redis)
  })
)
app.use(require('koa-json-body')({ returnRawBody: true }))
app.use(require('./lib/middleware').sessionLoader())
app.use(require('./lib/middleware').cache(redis))
app.use(
  require('koa2-csrf').default({
    invalidTokenMessage: 'Invalid CSRF token',
    invalidTokenStatusCode: 403,
    ignoreMethods: ['GET', 'HEAD', 'OPTIONS'],
    ignorePaths: ['/webhook']
  })
)
app.use(require('./lib/middleware').marko(path.join(__dirname, 'client'), 'layout.marko'))
app.use(require('./routes'))

const port = +process.env.PORT
const host = process.env.BIND
app.listen(port, host, () => {
  logger.info({ host, port }, 'app listening')

  if (process.send) {
    process.send('online')
  }

  logger.info({ host, port }, 'DI-Panel has been started')
})
