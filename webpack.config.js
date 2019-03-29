const Encore = require('@symfony/webpack-encore');
const HtmlWebpackPlugin = require('html-webpack-plugin')
const WebappWebpackPlugin = require('webapp-webpack-plugin');

Encore
  .disableSingleRuntimeChunk()
  .setOutputPath('build/')
  .setPublicPath('/')
  .cleanupOutputBeforeBuild()
  .addEntry('main', './src/index.ts')
  .enableSassLoader(options => {
    options.implementation = require('sass');
  })
  .enableTypeScriptLoader()
  .enableVersioning(Encore.isProduction())
  .addPlugin(new HtmlWebpackPlugin({ template: 'src/index.html'}))
  .addPlugin(new WebappWebpackPlugin('./assets/favicon.png'))
  .configureBabel(options => { options.sourceType = 'unambiguous'; }, {
    useBuiltIns: 'usage',
    corejs: 3,
    includeNodeModules: ['ts-gb'],
  })
;

// export the final configuration
module.exports = Encore.getWebpackConfig();
