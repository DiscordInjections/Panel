const { User, Setting } = require('../../models')

const Router = require('impress-router')
const router = new Router()
module.exports = router

router.use('/', async (ctx, next) => {
  const fragments = ctx.path.split('/')
  if (fragments.length < 2) {
    return ctx.throw(404)
  }

  const uid = fragments[1]
  ctx.state.user = await User.findByIdAndVerify(uid, ctx.header.authentication)

  if (!ctx.state.user) {
    ctx.status = 401 // not allowed
    return (ctx.body = { ok: false, error: 'not authenticated' })
  }

  return next()
})

router.get('/:userid/:key', async ctx => {
  const res = await Setting.query().where('userid', ctx.params.userid).andWhere('settings_key', key).first()

  if (!res) {
    ctx.status = 203
    return (ctx.body = {})
  }

  return {
    encrypted_data: res.encrypted_data,
    last_modified: res.last_modified
  }
})

router.put('/:userid/:key', async (ctx, next) => {
  const updatedSettings = []
  for (const key in ctx.payload) {
    const data = ctx.payload[key]
    const res = await Setting.query().where('userid', ctx.params.userid).andWhere('settings_key', key).first()
    if (res) {
      if (res.last_modified >= data.lastModified) {
        continue
      } else {
        await Setting.query()
          .patch({ encrypted_data: data.encrypted, last_modified: data.last_modified })
          .where('userid', ctx.params.userid)
          .andWhere('settings_key', key)
        updatedSettings.push(key)
      }
    } else {
      await Setting.query().insert({
        encrypted_data: data.encrypted,
        last_modified: data.last_modified,
        userid: ctx.params.userid,
        settings_key: key
      })
      updatedSettings.push(key)
    }
  }

  ctx.body = updatedSettings
})
