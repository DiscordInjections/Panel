const { redis } = require('../bootstrap')

const { User } = require('../models')
const crypto = require('crypto')
const path = require('path')

const Router = require('impress-router')
const router = new Router()
module.exports = router

router.use('/api', require('./api'))
router.use('/connect', require('./connect'))
router.use('/account', require('./account'))
router.use('/plugins', require('./plugins'))

router.get('/', ctx => {
  ctx.marko('routes/home')
})

router.post('/webhook', async ctx => {
  function signBlob (key, blob) {
    return 'sha1=' + crypto.createHmac('sha1', key).update(blob).digest('hex')
  }

  if (
    !process.env.WEBHOOK_SECRET ||
    (ctx.headers['x-github-event'] !== 'push' && ctx.headers['x-github-event'] !== 'ping')
  ) {
    return ctx.throw(404)
  }

  const body = ctx.request.body
  const sig = signBlob(process.env.WEBHOOK_SECRET, body.raw)
  if (sig !== ctx.headers['x-hub-signature']) {
    return ctx.throw(404)
  }

  ctx.body = { ok: true }
  if (ctx.headers['x-github-event'] === 'ping') {
    return ctx.logger.info('webhook ping')
  }

  setImmediate(async () => {
    ctx.logger.info(
      { ref: body.parsed.ref, commits: body.parsed.commits.length, compare: body.parsed.compare },
      'webhook push'
    )

    await redis.publish('dip-master', JSON.stringify({ action: 'pull' }))
  })
})
