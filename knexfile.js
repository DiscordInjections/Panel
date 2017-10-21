// Update with your config settings.
require('./lib/patcher')

module.exports = {
  development: {
    client: 'postgresql',
    connection: process.env.POSTGRES,
    migrations: {
      tableName: 'knex_migrations'
    }
  },

  production: {
    client: 'postgresql',
    connection: process.env.POSTGRES,
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      tableName: 'knex_migrations'
    }
  }
}
