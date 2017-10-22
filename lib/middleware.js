const lasso = require('lasso')
const send = require('koa-send')
const path = require('path')
const qs = require('qs')
const extend = Object.assign
const { User } = require('../models')
const dwh = require('./dwh')

function notFound () {
  this.error(404)
}

exports.serveStatic = function (options) {
  options = options || {}

  const myLasso = options.lasso || lasso.getDefaultLasso()
  const config = myLasso.config

  const outputDir = config.outputDir
  const urlPrefix = config.urlPrefix
  let routePrefix = urlPrefix
  if (!routePrefix.endsWith('/')) {
    routePrefix += '/'
  }

  if (!outputDir || !urlPrefix) {
    return async (ctx, next) => next()
  }

  const sendOptions = {
    fallthrough: false,
    redirect: false,
    index: undefined
  }

  if (options.sendOptions) {
    extend(sendOptions, options.sendOptions)
  }

  sendOptions.root = outputDir

  return function (ctx, next) {
    const req = ctx.request,
      res = ctx.response

    const path = req.path
    if (!path.startsWith(routePrefix) || (req.method !== 'GET' && req.method !== 'HEAD')) {
      return next()
    }

    const filePath = path.substring(routePrefix.length)

    // create send stream
    return send(ctx, filePath, sendOptions)
  }
}

exports.logger = function (logger, verbose = false) {
  return async function (context, next) {
    const requestTime = Date.now()
    logger.debug({ context }, 'incoming request')
    if (verbose) {
      logger.trace({ header: context.request.header }, 'incoming request headers')
    }
    context.logger = logger
    await next()
    logger.info({ context, duration: Date.now() - requestTime }, 'outgoing response')
    if (verbose) {
      logger.trace({ header: context.response.header }, 'outgoing response headers')
    }
  }
}

exports.discord = function (webhook) {
  return async function (context, next) {
    const start = new Date() // Time the request started

    try {
      await next()
    } catch (err) {
      dwh(webhook, {
        title: 'Error',
        description: 'An error during the request happened',
        color: 9577852,
        timestamp: start.toISOString(),
        fields: [
          {
            name: 'URL',
            value: context.request.url,
            inline: true
          },
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
      throw err
    }
  }
}

exports.marko = (basePath, baseTemplate) => {
  const baseComponent = require(path.resolve(basePath, baseTemplate))
  const metaTags = baseComponent.meta.tags

  return (ctx, next) => {
    Object.defineProperty(ctx, 'marko', {
      get () {
        return (templatePath, data = {}) => {
          // bubble any exceptions up
          if (!templatePath.endsWith('.marko')) {
            templatePath += '/index.marko'
          }

          const component = require(path.resolve(basePath, templatePath))
          ctx.type = 'html'
          baseComponent.meta.tags = metaTags.concat('./' + templatePath)
          ctx.body = baseComponent.stream({ component, data: Object.assign({}, ctx.state, data) })
        }
      }
    })

    return next()
  }
}

exports.qs = () => {
  return (ctx, next) => {
    Object.defineProperty(ctx.request, 'query', {
      get () {
        const str = ctx.request.querystring
        if (!str) return {}

        return qs.parse(str)
      }
    })

    return next()
  }
}

exports.sessionLoader = () => {
  return async (ctx, next) => {
    if (ctx.session.user) {
      const user = await User.query().findById(ctx.session.user).first()
      await user.refreshToken()
      ctx.state.user = user
    } else {
      ctx.state.user = false
    }

    return next()
  }
}

exports.cache = (redis, globalOptions = {}) => {
  globalOptions = Object.assign(
    {},
    {
      ttl: 60 * 5, // 5 minute cache
      prefix: 'cache:'
    },
    globalOptions
  )

  return (ctx, next) => {
    Object.defineProperty(ctx, 'cache', {
      value: async (key, options, refresh = null) => {
        if (refresh === null) {
          refresh = options
          options = {}
        }

        options.ttl = options.ttl || globalOptions.ttl

        if (typeof refresh !== 'function') {
          return ctx.throw(502)
        }

        if (options.force) {
          await redis.del(globalOptions.prefix + key)
        }

        let data = await redis.get(globalOptions.prefix + key)
        if (data) {
          return JSON.parse(data)
        } else {
          data = await refresh()
          await redis.set(globalOptions.prefix + key, JSON.stringify(data), 'EX', options.ttl)
          return data
        }
      }
    })
    return next()
  }
}
