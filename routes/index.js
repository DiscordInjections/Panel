const { User } = require('../models')
const crypto = require('crypto')
const execa = require('execa')
const dwh = require('../lib/dwh')
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
    ctx.logger.info('webhook push')
    dwh(process.env.DISCORD_WEBHOOK, {
      title: 'Webhook',
      description: 'A new push detected!',
      color: 0xf46542,
      fields: [
        {
          name: 'ref',
          value: body.parsed.ref,
          inline: true
        },
        {
          name: 'commits',
          value: body.parsed.commits.length,
          inline: true
        },
        {
          name: 'compare',
          value: body.parsed.compare
        }
      ]
    })

    // git pull myself
    const cwd = path.join(__dirname, '..')
    try {
      await execa('git', ['pull'], { cwd })
        .then(res => execa('npm', ['install'], { cwd }))
        .then(res => execa('npm', ['run', 'migrate'], { cwd }))

      ctx.logger.info('Webhook update finished!')
      if (process.env.pm_id == null) {
        dwh(process.env.DISCORD_WEBHOOK, {
          title: 'Webhook',
          description: 'PM2 not detected, please restart the server manually',
          color: 0xf46542
        })
      } else {
        dwh(process.env.DISCORD_WEBHOOK, {
          title: 'Webhook',
          description: 'PM2 detected, trying graceful restart!',
          color: 0xf46542
        })

        // delay restart by 1 second
        setTimeout(() => process.exit(0), 1000)
      }
    } catch (err) {
      dwh(process.env.DISCORD_WEBHOOK, {
        title: 'Error',
        description: 'An error during the webhook happened!',
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
    }
  })
})
