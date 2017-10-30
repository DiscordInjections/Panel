require('./lib/patcher')
const isDev = process.env.NODE_ENV === 'development'
const path = require('path')

const dwh = require('./lib/dwh')

const Koa = require('koa')
const Redis = require('ioredis')
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
}).child({ module: 'cron' })

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
Model.knex(require('knex')(require('./knexfile')[process.env.NODE_ENV]))

// load all dem models
const { Plugin } = require('./models')

logger.info('setting up the cron')
const schedule = require('node-schedule')

async function updatePlugins () {
  if (!await redis.set('cron:plugins', Date.now(), 'NX')) {
    logger.warn('failed to set working flag!')
    dwh(process.env.DISCORD_WEBHOOK, {
      title: 'Cron',
      description: 'Failed to set working flag!',
      color: 9577852
    })

    return
  }

  const plugins = await Plugin.query()
  logger.debug({ count: plugins.length }, 'updating plugins...')
  const l = logger.child({ submodule: 'plugin' })

  for (let plugin of plugins) {
    const repo = plugin.url.replace(/^https?:\/\/(www\.)?github\.com\//, '')
    l.trace({ repo }, 'updating plugin')

    const pkgr = await fetch('https://api.github.com/repos/' + repo + '/contents/package.json').then(res => res.json())
    if (!pkgr.content) {
      l.error('package.json not found!')
    }

    const pkg = JSON.parse(Buffer.from(pkgr.content, 'base64').toString())
    plugin.version = pkg.version
    plugin.category = pkg.di_category || 'misc'
    if (pkg.description) {
      plugin.teaser = pkg.description
    }

    const readme = await fetch('https://api.github.com/repos/' + repo + '/readme').then(res => res.json())
    if (readme.content) {
      plugin.description = Buffer.from(readme.content, 'base64').toString()
    } else {
      plugin.description = ''
    }

    try {
      await Plugin.query().where('id', plugin.id).patch(plugin)
    } catch (err) {
      l.error({ err }, 'failed to patch plugin!')
    }
  }

  logger.debug({ count: plugins.length }, 'plugin list updated!')
  redis.del('cron:plugins')
}
schedule.scheduleJob('0 0 * * *', updatePlugins)
setImmediate(updatePlugins)

process.on('message', async payload => {
  if (payload.exit) {
    logger.trace('exiting crontab')
    redis.del('cron:plugins')
    process.exit(payload.exit)
  }
})

dwh(process.env.DISCORD_WEBHOOK, {
  title: 'Status',
  description: 'Cron Manager is ready to serve, master',
  color: 6469211, // 9577852
  timestamp: new Date().toISOString()
})
