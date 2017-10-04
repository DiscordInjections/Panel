module.exports = class {
  async onInput () {
    if (global.window) {
      // browser context, we got dem juicy cookies
      const res = await fetch("/api/v1/account", { credentials: "same-origin" })
      console.log("server says", res, await res.text())
    } else {
    }
  }
}
