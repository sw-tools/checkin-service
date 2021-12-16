const path = require('path');
const slsw = require('serverless-webpack');
const nodeExternals = require('webpack-node-externals');

/**
 * @type {import('webpack').Configuration}
 */
module.exports = {
  entry: slsw.lib.entries,
  output: {
    path: path.join(__dirname, '.webpack'),
    library: {
      type: 'commonjs2'
    }
  },
  target: 'node',
  mode: 'production',
  optimization: {
    minimize: false,
    concatenateModules: false
  },
  stats: false,
  performance: {
    hints: false
  },
  devtool: 'inline-source-map',
  externals: [nodeExternals()],
  module: {
    rules: [
      {
        test: /\.ts$/,
        include: path.resolve(__dirname, 'src'),
        exclude: /node_modules/,
        use: {
          loader: 'ts-loader',
          options: {
            transpileOnly: true,
            compilerOptions: {
              inlineSourceMap: true
            }
          }
        }
      }
    ]
  },
  resolve: {
    extensions: ['.ts']
  }
};