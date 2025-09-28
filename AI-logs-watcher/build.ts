import { build } from 'esbuild';
import { spawn } from 'child_process';
import { esbuildPluginFilePathExtensions } from 'esbuild-plugin-file-path-extensions';

// Build JavaScript files with esbuild
await build({
  entryPoints: ['./src/**/*.ts'],
  outdir: './dist',
  platform: 'node',
  target: 'es2022',
  format: 'esm',
  bundle: true,
  outbase: './src',
  external: ['@fragola-ai/agentic'], // Keep fragola as external dependency to avoid bundling issues
  plugins: [
    esbuildPluginFilePathExtensions({
      esm: true,
      esmExtension: 'js'
    })
  ]
}).catch((error) => {
  console.error('Build failed:', error);
  process.exit(1);
});

// Generate TypeScript declaration files
console.log('Generating TypeScript declaration files...');
const tscProcess = spawn('npx', ['tsc', '--project', 'tsconfig.build.json'], { stdio: 'inherit' });

await new Promise((resolve, reject) => {
  tscProcess.on('close', (code) => {
    if (code === 0) {
      console.log('TypeScript declaration files generated successfully!');
      resolve(code);
    } else {
      reject(new Error(`TypeScript compilation failed with code ${code}`));
    }
  });
});

console.log('Build completed!');