const MarkdownIt = require('markdown-it')
const md = new MarkdownIt()

function versionCompare (a, b) {
  if (a === b) return 0
  a = a.split('.')
  b = b.split('.')
  const n = Math.min(a.length, b.length)
  let result = 0
  for (let i = 0; !result && i < n; ++i) result = a[i] - b[i]
  if (!result) result = a.length - b.length
  return result
}

module.exports = class {
  onCreate (input) {
    this.state = {
      versions: []
    }
  }
  onMount () {
    this.queryGithub()
  }

  queryGithub () {
    return fetch('https://api.github.com/repos/DiscordInjections/DiscordInjections/releases')
      .then(res => res.json())
      .then(json => json.filter(r => r.tag_name[0] !== 'v').sort((l, r) => -versionCompare(l.tag_name, r.tag_name)))
      .then(tags =>
        tags.map(v => {
          v.html = md.render(v.body)
          return v
        })
      )
      .then(tags => (this.state.versions = tags.slice(0, 2)))
  }
}
