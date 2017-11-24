const { logger, exit, redis, redisListener } = require('./bootstrap')
const PM2 = require('pm2')
const execa = require('execa')

logger.info('Starting up...')

// creating redis pubsub
redisListener.subscribe('dip-broadcast', 'dip-master', (err, count) => {
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
    case 'dip-master':
      switch (data.action) {
        case 'pull':
          const result = await execa('git', ['pull'], { cwd: __dirname })
          if (result.code !== 0) {
            logger.error({ stdout: result.stdout, stderr: result.stderr, code: result.code }, 'failed to pull!')
          } else {
            logger.info('Successfully updated environment, restarting env')
            redis.publish('dip-broadcast', JSON.stringify({ action: 'restart' }))
          }
          break
        default:
          logger.warn({ channel, action: data.action }, 'unkown action!')
      }
      break

    default:
      logger.warn({ channel }, 'message on unkown channel')
  }
})

PM2.connect(async err => {
  const { apps } = require('./pm2.config.json')
  for (let app of apps) {
    logger.trace({ app }, 'checking PM2 config')
    try {
      await new Promise((rs, rj) =>
        PM2.describe(app.name, (err, pl) => {
          if (err) return rj(err)
          if (!pl.length) return rj(new Error('process not started'))
          rs(pl)
        })
      )
    } catch (err) {
      logger.debug({ name: app.name }, 'PM2 config not found')
      PM2.start(app)
    }
  }
})
