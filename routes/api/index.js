const Router = require('impress-router')
const router = new Router()
module.exports = router

router.use('/v1', require('./v1'))
