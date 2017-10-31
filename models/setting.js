const { Model } = require('objection')

module.exports = class Plugin extends Model {
  static get tableName () {
    return 'setting'
  }

  static get relationMappings () {
    return {
      owner: {
        relation: Model.BelongsToOneRelation,
        modelClass: require('./user'),
        join: {
          from: 'setting.userid', // TODO: legacy format. rename field to user_id at some point
          to: 'user.id'
        }
      }
    }
  }
}
