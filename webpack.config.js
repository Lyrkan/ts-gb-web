const Encore = require('@symfony/webpack-encore');
const HtmlWebpackPlugin = require('html-webpack-plugin')
const FaviconsWebpackPlugin = require('favicons-webpack-plugin')

Encore
  .disableSingleRuntimeChunk()
  .setOutputPath('build/')
  .setPublicPath('/')
  .cleanupOutputBeforeBuild()
  .addEntry('main', './src/index.ts')
  .addStyleEntry('style', './src/index.scss')
  .enableSassLoader()
  .enableTypeScriptLoader()
  .enableVersioning()
  .addPlugin(new HtmlWebpackPlugin({ template: 'src/index.html'}))
  .addPlugin(new FaviconsWebpackPlugin('./assets/favicon.png'))
;

// export the final configuration
module.exports = Encore.getWebpackConfig();
