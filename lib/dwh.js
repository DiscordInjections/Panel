module.exports = (url, embed) =>
  !url
    ? null
    : fetch(url + '?wait=1', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        embeds: [embed]
      })
    })
