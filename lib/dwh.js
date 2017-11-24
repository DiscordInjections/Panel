const events = require('events')

const nameFromLevel = {
  10: 'TRACE',
  20: 'DEBUG',
  30: 'INFO ',
  40: 'WARN ',
  50: 'ERROR',
  60: 'FATAL'
}

const colorFromLevel = {
  10: 0x666666,
  20: 0xa0a0a0,
  30: 0x88aaff,
  40: 0xffaa00,
  50: 0xff0000,
  60: 0xdd00ff
}

class DiscordWebhookStream extends events {
  constructor (url) {
    super()

    this._url = url
  }

  write (rawRecord) {
    const record = typeof rawRecord === 'string' ? JSON.parse(rawRecord) : rawRecord
    const levelName = nameFromLevel[record.level]

    discordWebhook(this._url, {
      title: 'Bunyan',
      description: `\`[${nameFromLevel[record.level]}]\` ${record.msg}`,
      color: colorFromLevel[record.level],
      fields: Object.keys(record).filter(k => ['level', 'msg', 'v'].indexOf(k) < 0).map(k => {
        let value = record[k]

        if (typeof value !== 'string') {
          // force string representation
          value = '```json\n' + JSON.stringify(value, null, 2) + '\n```'
        }

        return {
          name: k,
          value
        }
      })
    })
  }
}

function discordWebhook (url, embed) {
  if (!url) {
    return
  }

  return fetch(url + '?wait=1', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      embeds: [embed]
    })
  })
}

discordWebhook.Stream = DiscordWebhookStream

module.exports = discordWebhook
