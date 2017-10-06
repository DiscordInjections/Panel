const { User } = require('../models')

const Router = require('impress-router')
const router = new Router()
module.exports = router

//router.mount('/api', require('./api'))
router.use('/account', require('./account'))

router.get("/", ctx => {
  ctx.marko("routes/home")
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
