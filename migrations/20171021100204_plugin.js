exports.up = function (knex, Promise) {
  return knex.schema.createTableIfNotExists('plugin', t => {
    t.increments().primary().notNullable()
    t.string('name', 255).notNullable()
    t.string('url', 255).notNullable()
    t.string('version', 10).notNullable()
    t.string('teaser', 1024).notNullable()
    t.text('description').nullable()
    t.enu('category', ['api', 'func', 'prod', 'games', 'misc']).default('misc').notNullable()
    t.timestamps(true, true)
    t.bigInteger('user_id').unsigned().notNullable()

    t.unique('url')
    t.foreign('user_id').references('user.id')
  })
}

exports.down = function (knex, Promise) {
  return knex.schema.dropTableIfExists('plugin')
}
