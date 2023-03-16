import type { Options } from 'tsup';

const env = process.env.NODE_ENV;

export const tsup: Options = {
  splitting: true,
  clean: true, // clean up the dist folder
  dts: true, // generate dts files
  format: ['cjs', 'esm'], // generate cjs and esm files
  minify: env === 'production',
  bundle: env === 'production',
  watch: env === 'development',
  target: 'es2020',
  outDir: env === 'production' ? 'dist' : 'lib',
  entry: ['src/**/*.ts'], //include all files under src
};
