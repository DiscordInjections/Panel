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

/*
router.use('/api/settings/:userid', async (ctx, next) => {
  ctx.state.user = User.findByIdAndVerify(ctx.params.userid, ctx.header.authentication)
  if (!ctx.state.user) {
    ctx.status = 401 // not allowed
    ctx.body = { ok: false, error: 'not authenticated' }
    return
  }

  return next()
})

router.get('/api/settings/:userid/:key', async ctx => {
  // if (!await authenticate(req, res)) return
  console.log('bsdsbsdbsd')
  ctx.body = 'gununu'
})

/* router.put('/settings/:userid/:key', async (req, res, next) => {
    if (!await authenticate(req, res)) return

    msg = JSON.parse(msg)
    if (typeof msg === 'object' && msg.hasOwnProperty('code')) {
      switch (msg.code) {
        case 'setsettings': {
          let newerSettings = []
          for (const key in msg.data) {
            try {
              let time = moment(msg.data[key].lastModified)
              let res = await global.pg_pool.query(
                'SELECT encrypted_data, last_modified FROM public.setting WHERE userid=$1 AND settings_key=$2',
                [userid, key]
              )
              if (res.rows.length > 0 && res.rows[0].last_modified) {
                let lastModified = moment(res.rows[0].last_modified)
                if (lastModified.valueOf() > time.valueOf()) {
                  newerSettings.push({ key, data: res.rows[0].encrypted_data })
                  continue
                }
              }
              await global.pg_pool.query(
                `INSERT INTO public.setting
                                (userid, settings_key, encrypted_data, last_modified)
                                VALUES ($1, $2, $3, $4)
                                ON CONFLICT (userid, settings_key) DO
                                UPDATE SET
                                    encrypted_data=$3,
                                    last_modified=$4`,
                [userid, key, msg.data[key].encrypted, time.format()]
              )
            } catch (err) {
              console.error(err)
            }
          }
          if (newerSettings.length > 0) {
            ws.send(JSON.stringify({ code: 'settings', data: newerSettings }))
          }
        }
      }
    }
  })

  async function authenticate (req, res) {
    let key = req.get('di-auth')

    if (!key || global.helpers.Security.verifyLogin(req.params.userid, key)) res.status(401).json(errors.noauth)
  } */
