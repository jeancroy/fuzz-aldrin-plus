'use strict';

const path = require('path');

module.exports = (options) => {
    const config = {
        resolveLoader: {root: path.join(__dirname, 'node_modules')},
        resolve: {
            extensions: ['', '.js', '.jsx']
        },
        output: {
            filename: '[name].js'
        },

        module: {

            loaders: [
                // Setup babel
                {
                    test: /\.(js|jsx)$/,
                    loader: require.resolve('babel-loader'),
                    query: {
                        presets: [
                            [require.resolve('babel-preset-es2015'), {loose: true}]
                            /*require.resolve('babel-preset-react')*/
                        ]
                    }
                },


            ]
        },
        target:"node", // We pack for browser, but we don't want node shim
                       // we test for existence of process & window manually

        externals: {
            window: "window",
            process: "process"
        },

        plugins: [],
        devtool: 'cheap-source-map', //for debug we use lower resolution sourcemap (line, but not column)
        debug: true,
        eslint: {
            configFile: path.join(__dirname, '.eslintrc')
        }
    };

    return config;
};
