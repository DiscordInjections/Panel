const { Model }  = require("objection")

module.exports = class Plugin extends Model {
  static get tableName() { return "plugin" }
}
