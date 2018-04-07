const Router = require('impress-router')
const router = new Router()
module.exports = router

const { Plugin } = require('../models')

router.get('/', ctx => ctx.redirect('/plugins/all'))

router.get('/add', async ctx => {
  if (!ctx.state.user) {
    return ctx.redirect('/account/login?to=' + encodeURIComponent(ctx.originalUrl))
  }

  // collect dem juicy public github repos
  const repos = await ctx.state.user
    .fetchGithub('https://api.github.com/user/repos?visibility=public')
    .then(res => {
      if(res.status == 401) {
        delete ctx.state.user.github_access_token
        await ctx.state.user.query().patch(ctx.state.user)
        return false
      }
      return res.json()
     })
  
  if(!repos) return ctx.redirect('/connect/github')

  // filter out already existing elements
  for (let idx = repos.length - 1; idx >= 0; idx--) {
    const found = await Plugin.query().where('url', repos[idx].html_url).count().first()
    if (+found.count > 0) {
      repos.splice(idx, 1)
    }
  }

  // check if we have github connected
  ctx.marko('routes/plugins-add', {
    repos
  })
})

router.post('/add', async ctx => {
  // first, see if this repo belongs to this user
  const repos = await ctx.state.user
    .fetchGithub('https://api.github.com/user/repos?visibility=public')
    .then(res => res.json())

  const repo = repos.find(r => r.full_name === ctx.body.repo)
  if (!repo) {
    return (ctx.body = { ok: false, msg: "The given repo doesn't belong to this user!", _csrf: ctx.csrf })
  }

  // this is a valid repo, now fetch repo info
  const dbe = {
    name: repo.name,
    url: repo.html_url,
    version: null, // fetch from package.json
    teaser: repo.description, // fetch from package.json if empty
    description: null, // fetch from readme.md, if it exists
    category: 'misc' // fetch from package.json
  }

  const pkgr = await ctx.state.user
    .fetchGithub('https://api.github.com/repos/' + repo.full_name + '/contents/package.json')
    .then(res => res.json())
  if (!pkgr.content) {
    return (ctx.body = { ok: false, msg: 'No package.json found in the root of the repository!', _csrf: ctx.csrf })
  }
  const pkg = JSON.parse(Buffer.from(pkgr.content, 'base64').toString())
  dbe.version = pkg.version
  dbe.category = pkg.di_category || 'misc'
  if (pkg.description) {
    dbe.teaser = pkg.description
  }

  if (!dbe.teaser) {
    return (ctx.body = {
      ok: false,
      msg:
        'No teaser found, please define a repository description or fill in the description field of the package.json!',
      _csrf: ctx.csrf
    })
  }

  const readme = await ctx.state.user
    .fetchGithub('https://api.github.com/repos/' + repo.full_name + '/readme')
    .then(res => res.json())
  if (readme.content) {
    dbe.description = Buffer.from(readme.content, 'base64').toString()
  }

  dbe.user_id = ctx.state.user.id

  try {
    const plugin = await Plugin.query().insert(dbe)
  } catch (err) {
    return (ctx.body = {
      ok: false,
      msg: 'The database failed to save the plugin, please try again later!',
      _csrf: ctx.csrf
    })
  }

  const extra = []
  if (!pkg.di_category) {
    extra.push(
      "The package was saved under the <misc> category. If you want to set a custom repository, set the <di_category> field in package.json to one of ['all', 'api', 'func', 'prod', 'games', 'misc']"
    )
  }
  ctx.body = {
    ok: true,
    msg: 'Repository successfully added!',
    extra,
    _csrf: ctx.csrf
  }
})

router.get('/:category/:page?', async ctx => {
  if (['all', 'api', 'func', 'prod', 'games', 'misc'].indexOf(ctx.params.category) < 0) {
    return ctx.throw(404)
  }

  if (!ctx.params.page) {
    ctx.params.page = 1
  }

  const q = Plugin.query().eager('owner')
  if (ctx.params.category !== 'all') {
    q.where('category', '=', ctx.params.category)
  }
  const plugins = await q.page(ctx.params.page - 1, 10)
  plugins.pages = Math.round(plugins.total / 10 + 0.5)

  ctx.marko('routes/plugins', {
    category: ctx.params.category,
    page: ctx.params.page,
    plugins
  })
})
