const { Model } = require('objection')
const crypto = require('crypto')
const scrypt = require('scrypt')

// 0.2 sec and 64k ram per call
const defaultParams = scrypt.paramsSync(0.2, Math.pow(2, 16))

module.exports = class User extends Model {
  static get tableName () {
    return 'user'
  }

  async verify (token) {
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
      }
    } else {
      [_, hasher, meta, hash] = this.token.split('$')
      switch (hasher) {
        case 'scrypt':
          const kdf = Buffer.from(hash, "base64")
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
