const Router = require('impress-router')
const router = new Router()
module.exports = router

const { Plugin } = require('../../../models')
const { URL } = require('url')

router.get('/', async ctx => {
  let search = ctx.query.search || ''
  const sort = ctx.query.sort || 'name'
  const order = ctx.query.order || 'asc'
  const category = ctx.query.category || ''
  let limit = +ctx.query.limit || 20
  let page = +ctx.query.page || 1

  if (limit < 1) {
    limit = 20
  } else if (limit > 100) {
    limit = 100
  }

  if (page < 1) {
    page = 1
  }

  let sortColumn = 'name'
  switch (sort) {
    case 'newest':
      sortColumn = 'created_at'
      break
    case 'updated':
      sortColumn = 'updated_at'
      break

    default:
      sortColumn = sort || sortColumn
  }

  let query = Plugin.query().eager('owner')
  if (search != '') {
    search = search.replace(/^%?(.*)%?$/, '%$1%')
    query = query.where('name', 'LIKE', search).orWhere('description', 'LIKE', search)
  }
  if (category != '') {
    query = query.andWhere('category', category)
  }
  query = query.orderBy(sortColumn, order).page(page - 1, limit)

  const results = await query

  const url = new URL(process.env.HOST + ctx.originalUrl)
  url.searchParams.set('page', page + 1)
  url.searchParams.set('limit', limit)

  const prevUrl = new URL(url.toString())
  url.searchParams.set('page', page - 1)

  if (results.results.length === 0) {
    ctx.status = 204
  }

  ctx.body = {
    results: results.results.map(row => {
      // clean private data
      delete row.user_id
      delete row.owner.token
      delete row.owner.salt
      delete row.owner.oauth_access_token
      delete row.owner.oauth_refresh_token
      delete row.owner.oauth_expires
      delete row.owner.email
      delete row.owner.github_access_token
      delete row.owner.github_refresh_token
      return row
    }),
    meta: {
      total: results.total,
      limit: limit,
      pages: Math.ceil(results.total / limit),
      page: page,
      hasNext: results.total - page * limit > 0,
      hasPrev: page > 1,
      next: url.toString(),
      prev: prevUrl.toString()
    }
  }
})
