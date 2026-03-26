module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
<<<<<<< HEAD
      'nativewind/babel',
    ],
    plugins: [
      '@babel/plugin-transform-react-jsx',
      '@babel/plugin-proposal-class-properties',
      '@babel/plugin-proposal-object-rest-spread',
      '@babel/plugin-transform-typescript',
      '@babel/plugin-proposal-export-namespace-from',
    ],
=======
      'nativewind/babel'
    ],
    plugins: [
      'react-native-reanimated/plugin'
    ]
>>>>>>> 58221eae868fd8bae73d41fe87620bf89e8369d1
  };
};
