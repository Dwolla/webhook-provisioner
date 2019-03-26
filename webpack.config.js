const slsw = require("serverless-webpack")
const wp = require("skripts/config").webpack(slsw)
const { packageIndividually } = require("./config")

module.exports = {
  ...wp,
  entry: packageIndividually()
    ? slsw.lib.entries
    : { ...slsw.lib.entries, server: "./server.ts" }
}
