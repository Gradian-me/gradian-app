const path = require('path');
const WebpackObfuscator = require('webpack-obfuscator');

module.exports = {
  mode: 'production',
  entry: './src/gradian-ui/form-builder/utils/form-embed-helper.cdn.js',
  output: {
    path: path.resolve(__dirname, '../../public/cdn'),
    filename: 'form-embed-helper.min.js',
    library: 'GradianFormEmbed',
    libraryTarget: 'umd',
    globalObject: 'this',
    clean: false, // Don't clean, we're building multiple files
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
        controlFlowFlattening: false, // Disable to keep performance
        deadCodeInjection: false, // Disable to keep performance
        debugProtection: false, // Disable for CDN usage
        debugProtectionInterval: 0,
        disableConsoleOutput: false, // Keep console for debugging
        identifierNamesGenerator: 'hexadecimal',
        log: false,
        numbersToExpressions: false, // Disable to keep performance
        renameGlobals: false,
        selfDefending: false, // Disable for CDN usage
        simplify: true,
        splitStrings: false, // Disable to keep performance
        transformObjectKeys: false, // Keep API names readable
      },
      []
    ),
  ],
  resolve: {
    extensions: ['.js'],
  },
};

