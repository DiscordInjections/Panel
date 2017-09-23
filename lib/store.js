const { Store } = require('koa-session2')

class RedisStore extends Store {
  constructor (redis) {
    super()
    this.redis = redis
  }

  async get (sid, ctx) {
    let data = await this.redis.get(`SESSION:${sid}`)
    return JSON.parse(data)
  }

  async set (session, { sid = this.getID(24), maxAge = 1000000 } = {}, ctx) {
    try {
      // Use redis set EX to automatically drop expired sessions
      await this.redis.set(`SESSION:${sid}`, JSON.stringify(session), 'EX', maxAge / 1000)
    } catch (e) {}
    return sid
  }

  async destroy (sid, ctx) {
    return await this.redis.del(`SESSION:${sid}`)
  }

  static create (redis) {
    return new RedisStore(redis)
  }
}

module.exports = RedisStore
