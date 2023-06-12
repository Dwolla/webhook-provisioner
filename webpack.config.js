const slsw = require("serverless-webpack")

module.exports = {
  devtool: "source-map",
  // entry: packageIndividually()
  //   ? slsw.lib.entries
  //   : { ...slsw.lib.entries, server: "./server.ts" },
  // False until this is resolved: https://github.com/serverless-heaven/serverless-webpack/issues/299
  entry: { ...slsw.lib.entries, server: "./server.ts" },
  mode: slsw.lib.webpack.isLocal ? "development" : "production",
  module: { rules: [{ test: /\.tsx?$/, loader: "ts-loader" }] },
  performance: { hints: false },
  resolve: { extensions: [".js", ".jsx", ".json", ".ts", ".tsx"] },
  target: "node",
  optimization: {
    concatenateModules: false,
  },
}
