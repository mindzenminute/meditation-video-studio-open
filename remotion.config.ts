/**
 * Configuration Remotion pour le rendu local et les environnements Vercel/CI.
 *
 * Choix clés :
 * - H.264 pour compatibilité maximale.
 * - CRF 18 : bon compromis qualité/poids pour une vidéo méditative douce.
 * - Concurrence limitée pour éviter les timeouts/instabilités en sandbox.
 */
import { Config } from '@remotion/cli/config';

const concurrency = process.env.REMOTION_RENDER_CONCURRENCY
  ? Number(process.env.REMOTION_RENDER_CONCURRENCY)
  : 2;

Config.setEntryPoint('./src/root.tsx');
Config.setPublicDir('public');

Config.setCodec('h264');
Config.setVideoImageFormat('jpeg');
Config.setPixelFormat('yuv420p');
Config.setCrf(18);
Config.setOverwriteOutput(true);

Config.setConcurrency(concurrency);

if (process.env.VERCEL === '1') {
  // En environnement serverless/sandbox, on privilégie la stabilité.
  Config.setConcurrency(1);
}
