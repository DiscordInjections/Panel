const { Model } = require('objection')

module.exports = class Plugin extends Model {
  static get tableName () {
    return 'plugin'
  }

  static get relationMappings () {
    return {
      owner: {
        relation: Model.BelongsToOneRelation,
        modelClass: require('./user'),
        join: {
          from: 'plugin.user_id',
          to: 'user.id'
        }
      }
    }
  }
}
