const Encore = require('@symfony/webpack-encore');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin')
const UglifyJsPlugin = require('uglifyjs-webpack-plugin')

Encore
  .setOutputPath('build/')
  .setPublicPath('/')
  .cleanupOutputBeforeBuild()
  .addEntry('main', './src/index.ts')
  .addStyleEntry('style', './src/index.scss')
  .enableSassLoader()
  .enableTypeScriptLoader()
  .enableVersioning()
  .addPlugin(new HtmlWebpackPlugin({
    template: 'src/index.html'
  }))
;

const webpackConfig = Encore.getWebpackConfig();

// Remove the old version first
webpackConfig.plugins = webpackConfig.plugins.map((plugin) => {
  if (plugin instanceof webpack.optimize.UglifyJsPlugin) {
    return new UglifyJsPlugin();
  }

  return plugin;
});

// Add the new one
webpackConfig.plugins.push(new UglifyJsPlugin());

// export the final configuration
module.exports = webpackConfig;
