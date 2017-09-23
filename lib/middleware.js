const lasso = require('lasso')
const send = require('koa-send')
const qs = require('qs')
const extend = Object.assign

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

exports.logger = function (logger) {
  return async function (context, next) {
    const requestTime = Date.now()
    logger.debug({ context }, 'incoming request')
    logger.trace({ header: context.request.header }, 'incoming request headers')
    await next()
    logger.info({ context, duration: Date.now() - requestTime }, 'outgoing response')
    logger.trace({ header: context.response.header }, 'outgoing response headers')
  }
}

exports.discord = function (webhook) {
  return async function (context, next) {
    const start = new Date() // Time the request started

    try {
      await next()
    } catch (err) {
      fetch(process.env.DISCORD_WEBHOOK + '?wait=1', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          embeds: [
            {
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
            }
          ]
        })
      })
      throw err
    }
  }
}

exports.qs = () => {
  return ctx => {
    Object.defineProperty(ctx.request, 'query', {
      get () {
        const str = ctx.request.querystring
        if (!str) return {}

        return qs.parse(str)
      }
    })
  }
}
