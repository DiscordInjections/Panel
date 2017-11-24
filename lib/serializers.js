const { stdSerializers } = require('bunyan')
const { ms, b } = require('normat')

const serializers = {
  duration (duration) {
    return ms(duration)
  },

  context (ctx) {
    const req = `${ctx.request.method} ${ctx.request.URL} (${ctx.request.ip})`
    const res = `${ctx.response.status} ${ctx.response.message} (${b(ctx.response.length)})`
    return { req, res }
  },

  timespan (span) {
    return ms(span)
  },

  timestamp (stamp) {
    const d = new Date(stamp)
    return d.toUTCString()
  }
}

module.exports = Object.assign({}, stdSerializers, serializers)
