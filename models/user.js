const { Model } = require('objection')
const crypto = require('crypto')
const scrypt = require('scrypt')
const oauth2 = require('../lib/oauth2')

// 0.2 sec and 64k ram per call
const defaultParams = scrypt.paramsSync(0.2, Math.pow(2, 16))

module.exports = class User extends Model {
  static get tableName () {
    return 'user'
  }

  get oauthToken () {
    const token = oauth2.discord.createToken(this.oauth_access_token, this.oauth_refresh_token)
    token.expiresIn(new Date(this.oauth_expires))
    return token
  }

  async refreshToken () {
    const token = this.oauthToken
    if (token.expired()) {
      const newToken = await token.refresh()
      this.oauth_access_token = newToken.accessToken
      this.oauth_refresh_token = newToken.refreshToken
      this.oauth_expires = newToken.expiresIn
      await User.query().patch(this)
    }

    return this
  }

  get githubToken () {
    const token = oauth2.github.createToken(this.github_access_token)
    token.tokenType = 'bearer'
    return token
  }

  fetch (url, headers = {}) {
    return fetch(url, this.oauthToken.sign({ url, headers }))
  }

  fetchGithub (url, headers = {}) {
    return fetch(url, this.githubToken.sign({ url, headers }))
  }

  async verify (token) {
    if (!this.token) {
      return false
    }

    // check for scrypt function
    if (this.token[0] !== '$') {
      const hash = crypto.createHash('sha256').update(token + this.salt).digest('base64')
      if (hash !== this.token) {
        return false
      } else {
        // rehash as scrypt
        this.hash =
          '$scrypt$' +
          JSON.stringify(defaultParams) +
          '$' +
          (await scrypt.kdf(token + this.salt, defaultParams).toString('base64'))
        await User.query().patch({ hash: this.hash }).where(id, this.id)
      }
    } else {
      const [_, hasher, meta, hash] = this.token.split('$')
      switch (hasher) {
        case 'scrypt':
          const kdf = Buffer.from(hash, 'base64')
          return await scrypt.verifyKdf(kdf, token + this.salt)
      }
    }
  }

  static async findByIdAndVerify (userID, token) {
    const user = await User.query().findById(userID)
    if (!user) {
      return null
    }

    // generate password
    if (!user.verify(token)) {
      return null
    }

    return user
  }
}
