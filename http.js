console.log(true)

/*
const path = require('path')
const Koa = require('koa')
const Redis = require('ioredis')
const http = require('http')
const { Model } = require('objection')
const url = require('url')

// database connections
const redis = new Redis(process.env.REDIS)
Model.knex(require('knex')(require('./knexfile')[process.env.NODE_ENV]))

// load all dem models
require('./models')

// lets fork into our different processes

process.on('exit', async code => {
  if (code != 0) {
    logger.warn({ code }, 'process is exiting abnormally')
    dwh(process.env.DISCORD_WEBHOOK, {
      title: 'Exit',
      description: 'process is exiting abnormally!',
      color: 9577852,
      fields: [
        {
          name: 'Code',
          value: code
        }
      ]
    })
  }

  cron.send({ exit: code })
  cron.on('exit', () => {
    process.removeAllListeners('exit')
    process.exit(code)
  })
})

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
      dependencies: [{ intersection: ['./client/routes/* /index.marko'] }]
    },
    {
      name: 'routes',
      dependencies: ['./client/routes/* /index.marko']
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
*/
