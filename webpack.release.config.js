'use strict';

const webpack = require('webpack');
const path = require('path');
const commonConfig = require('./webpack.config');
const pkg = require('./package.json');

const bannerStr = "" + pkg.name + " - v " + pkg.version + " - @license: " + pkg.license + "; @author: Jean Christophe Roy; @site: " + pkg.homepage + "";

module.exports = (options) => {
  const releaseConfig = Object.create(commonConfig(options));
  releaseConfig.output.filename =  '[name].min.js';
  releaseConfig.debug = false;
  releaseConfig.devtool = 'sourcemap';
  releaseConfig.plugins = releaseConfig.plugins.concat(
    new webpack.DefinePlugin({
      'process.env': {
        'NODE_ENV': JSON.stringify('production')
      }
    }),
    new webpack.optimize.DedupePlugin(),
    new webpack.optimize.UglifyJsPlugin({
      compress: {
        warnings: false
      }
    }),
    new webpack.optimize.OccurenceOrderPlugin(true),
    new webpack.BannerPlugin(bannerStr, {entryOnly:true})

  );

  return releaseConfig;
};
