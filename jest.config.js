module.exports = {
  preset: '@react-native/jest-preset',
  transformIgnorePatterns: [
    'node_modules/(?!((@react-native|@react-native-async-storage|react-native|react-native-safe-area-context|nativewind|react-native-css-interop)/))',
  ],
  moduleNameMapper: {
    '^lucide-react-native$': '<rootDir>/__mocks__/lucide-react-native.js',
  },
};
