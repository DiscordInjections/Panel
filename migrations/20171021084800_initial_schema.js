exports.up = knex => {
  return knex.schema
    .createTableIfNotExists('user', t => {
      t.bigInteger('id').primary().notNullable()
      t.string('token', 256).notNullable()
      t.string('salt', 128).notNullable()

      t.unique('id')
    })
    .createTableIfNotExists('setting', t => {
      t.bigInteger('userid').primary().notNullable()
      t.string('settings_key', 100).notNullable()
      t.string('encrypted_data', 1000000).notNullable()
      t.timestamp('last_modified', true).nullable().defaultTo(knex.fn.now())
    })
}

exports.down = knex => {
  return knex.schema.dropTableIfExists('user').dropTableIfExists('setting')
}
