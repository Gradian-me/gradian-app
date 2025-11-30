const path = require('path');
const WebpackObfuscator = require('webpack-obfuscator');

module.exports = {
  mode: 'production',
  entry: './src/gradian-ui/form-builder/utils/gradian-form-embed.cdn.js',
  output: {
    path: path.resolve(__dirname, '../../public/cdn'),
    filename: 'gradian-form-embed.min.js',
    library: 'GradianFormEmbedModal',
    libraryTarget: 'umd',
    globalObject: 'this',
    clean: false, // Don't clean, keep other files
  },
  optimization: {
    minimize: true,
  },
  plugins: [
    new WebpackObfuscator(
      {
        rotateStringArray: true,
        stringArray: true,
        stringArrayCallsTransform: true,
        stringArrayEncoding: [],
        stringArrayIndexShift: true,
        stringArrayRotate: true,
        stringArrayShuffle: true,
        stringArrayWrappersCount: 2,
        stringArrayWrappersChainedCalls: true,
        stringArrayWrappersParametersMaxCount: 4,
        stringArrayWrappersType: 'function',
        stringArrayThreshold: 0.75,
        unicodeEscapeSequence: false,
        compact: true,
        controlFlowFlattening: false,
        deadCodeInjection: false,
        debugProtection: false,
        debugProtectionInterval: 0,
        disableConsoleOutput: false,
        identifierNamesGenerator: 'hexadecimal',
        log: false,
        numbersToExpressions: false,
        renameGlobals: false,
        selfDefending: false,
        simplify: true,
        splitStrings: false,
        transformObjectKeys: false,
      },
      []
    ),
  ],
  resolve: {
    extensions: ['.js'],
  },
};

