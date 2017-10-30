const Router = require('impress-router')
const router = new Router()
module.exports = router

router.use('/plugin', require('./plugin'))
