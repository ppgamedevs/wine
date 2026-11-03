/**
 * Test stub for the `server-only` marker package.
 *
 * The real package resolves to a module that throws unless the bundler uses the
 * `react-server` condition. Unit tests run plain Node, so aliasing it to an
 * empty module keeps the production guard intact without breaking Vitest.
 */
export {};
