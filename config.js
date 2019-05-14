module.exports = {
  // False until this is resolved: https://github.com/serverless-heaven/serverless-webpack/issues/299
  packageIndividually: () => false //process.env.ENVIRONMENT !== "local"
}
