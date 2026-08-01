import { loadDependencies } from './avatar-loader.js';

async function main(): Promise<void> {
  try {
    const detail = await loadDependencies();
    console.log('Live2D model loaded:', detail);
  } catch (error) {
    console.error('Failed to load dependencies:', error);
  }
}

void main();
