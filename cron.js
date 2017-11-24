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

logger.info('setting up the cron')
const schedule = require('node-schedule')

async function updatePlugins () {
  const { Plugin } = models

  // check for cron lock
  if (!await redis.set('cron:plugins', Date.now(), 'NX')) {
    const timestamp = await redis.get('cron:plugins')
    const timespan = Date.now() - timestamp

    // is the lock over 24h old?
    if (timespan > 1000 * 60 * 60 * 24) {
      logger.warn({ timestamp, timespan }, 'resetting working flag!')
      await redis.set('cron:plugins', Date.now())
    } else {
      return logger.warn({ timestamp, timespan }, 'failed to set working flag!')
    }
  }

  // TODO: maybe stream instead of fetching everything?
  const plugins = await Plugin.query()
  logger.debug({ count: plugins.length }, 'updating plugins...')
  const l = logger.child({ submodule: 'plugin' })

  for (let plugin of plugins) {
    const repo = plugin.url.replace(/^https?:\/\/(www\.)?github\.com\//, '')
    l.trace({ repo }, 'updating plugin')

    const pkgr = await fetch('https://api.github.com/repos/' + repo + '/contents/package.json').then(res => res.json())
    if (!pkgr.content) {
      l.error({ repo }, 'package.json not found!')
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
      l.error({ repo, err }, 'failed to patch plugin!')
    }
  }

  logger.info({ count: plugins.length }, 'plugin list updated!')
  await redis.del('cron:plugins')
}

schedule.scheduleJob('0 0 * * *', updatePlugins)
setImmediate(updatePlugins)
