module.exports = class {
  onCreate (input) {
    this.state = {
      repos: input.repos
    }
  }

  async selectRepository (repo) {
    const res = confirm(`Do you really want to add <${repo.full_name}> to the plugin list?`)
    if (!res) return // abort

    const list = this.getEl('list')

    const response = await fetch('/plugins/add', {
      method: 'POST',
      body: JSON.stringify({ repo: repo.full_name, _csrf: list.dataset.csrf }),
      mode: 'same-origin',
      credentials: 'same-origin'
    }).then(res => res.json())

    if (!response.ok) {
      alert('An error happened during the request. The server returned:\n\n' + response.msg)
    } else {
      alert(response.msg + '\n\n' + response.extra.map(s => '  - ' + s).join('\n'))
      this.state.repos = this.state.repos.filter(r => r.full_name !== repo.full_name)
    }

    if (response._csrf) {
      list.dataset.csrf = response._csrf
    }
  }
}
