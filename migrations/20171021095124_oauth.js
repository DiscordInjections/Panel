exports.up = function (knex, Promise) {
  return knex.schema.alterTable('user', t => {
    t.string('token', 255).nullable().alter()

    // discord oauth
    t.string('oauth_access_token', 128).nullable()
    t.string('oauth_refresh_token', 128).nullable()
    t.timestamp('oauth_expires', true).nullable()

    // discord cache
    t.string('username', 255).nullable()
    t.specificType('discriminator', 'int2').nullable() // force int2 / smallint
    t.string('email', 255).nullable()
    t.string('avatar', 255).nullable()

    // github oauth
    t.string('github_access_token', 128).nullable()
    t.string('github_refresh_token', 128).nullable()
    t.string('github', 255).nullable()
  })
}

exports.down = function (knex, Promise) {
  return knex.schema.alterTable('user', t => {
    t.string('token', 255).notNullable().alter()
    t.dropColumns(
      'oauth_access_token',
      'oauth_refresh_token',
      'oauth_expires',
      'username',
      'discriminator',
      'email',
      'avatar',
      'github_access_token',
      'github_refresh_token',
      'github'
    )
  })
}
