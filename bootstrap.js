const { Model } = require('objection')
const Redis = require('ioredis')
const path = require('path')
const { createLogger } = require('bunyan')
const { Stream } = require('./lib/dwh')
const exitHook = require('async-exit-hook')

// patch the runtime
require('./lib/patcher')

// are we in development environment?
const isDev = (exports.isDev = process.env.NODE_ENV === 'development')

// is there pm2?
const hasPM2 = (exports.hasPM2 = process.env.pm_id != null)
const pm2 = (exports.pm2 = process.env.pm_id)

// database environments
// redis
const redis = (exports.redis = new Redis(process.env.REDIS))
exports.redisListener = redis.duplicate()
// postgres
Model.knex(require('knex')(require('./knexfile')[process.env.NODE_ENV]))
exports.models = require('./models')

// logger
let parent = module
while (parent.parent) {
  parent = parent.parent
}
const moduleName = path.basename(parent.filename, path.extname(parent.filename))
const logger = (exports.logger = createLogger({
  name: 'panel',
  serializers: require('./lib/serializers'),
  src: isDev,
  streams: [
    {
      stream: process.stdout,
      level: isDev ? 'trace' : 'info'
    },
    {
      level: 'info',
      stream: new Stream(process.env.DISCORD_WEBHOOK)
    }
  ]
}).child({ module: moduleName }))

// process hooks
exitHook.uncaughtExceptionHandler(err => logger.error({ err }, 'uncaught exception occured!'))
exitHook.unhandledRejectionHandler(err => logger.error({ err }, 'unhandled rejection occured!'))
exports.exit = exitHook
