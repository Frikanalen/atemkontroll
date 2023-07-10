/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest",
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  testEnvironment: "node",
  roots: ["<rootDir>/src"], // Only run tests within the 'src' directory
  testPathIgnorePatterns: ["/node_modules/", "/dist/"], // Ignore the 'dist' and 'node_modules' directories
};
