// Runs the Expo app on a phone when it can't reach this computer over Wi-Fi
// (event and campus networks usually block device-to-device traffic).
// Opens two public HTTPS tunnels with Cloudflare (no account needed):
//   1. the web app (Vite, port 5173), which the app's WebView loads
//   2. Metro, which Expo Go downloads the app bundle from
// Requires `spacetime start` and `npm run dev` to be running already.
// Usage: npm run mobile:tunnel [-- --port 8082]
import { spawn } from 'node:child_process';

const children = [];
const stopAll = () => children.forEach(c => c.kill());
const fail = msg => { console.error('\n✖ ' + msg + '\n'); stopAll(); process.exit(1); };

const args = process.argv.slice(2);
const portIndex = args.indexOf('--port');
const metroPort = portIndex >= 0 ? Number(args[portIndex + 1]) : 8081;

async function reachable(url) {
  try { return (await fetch(url, { signal: AbortSignal.timeout(5000) })).status < 500; } catch { return false; }
}

function openTunnel(port) {
  const proc = spawn('cloudflared', ['tunnel', '--no-autoupdate', '--url', `http://localhost:${port}`], { stdio: ['ignore', 'pipe', 'pipe'] });
  children.push(proc);
  proc.on('error', () => fail('cloudflared is not installed. Run: brew install cloudflared'));
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(Error(`Timed out opening a tunnel to port ${port}.`)), 45000);
    const scan = chunk => {
      const m = String(chunk).match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
      if (m) { clearTimeout(timer); resolve(m[0]); }
    };
    proc.stdout.on('data', scan);
    proc.stderr.on('data', scan);
  });
}

if (!(await reachable('http://localhost:5173/'))) fail('The web app is not running. In another terminal run: npm run dev');
if (await reachable(`http://localhost:${metroPort}/status`)) {
  fail(`Something is already using port ${metroPort} (probably another Expo). Stop it first, or run: npm run mobile:tunnel -- --port 8082`);
}

console.log('Opening public tunnels…');
const [webUrl, metroUrl] = await Promise.all([openTunnel(5173), openTunnel(metroPort)]).catch(e => fail(e.message));
for (let i = 0; i < 20 && !(await reachable(webUrl)); i++) await new Promise(r => setTimeout(r, 1500));
console.log(`  Web app: ${webUrl}`);
console.log(`  Metro:   ${metroUrl}`);
console.log('\nStarting Expo. Scan the QR code with Expo Go (Camera app on iPhone).\n');

const expo = spawn('npx', ['expo', 'start', '--lan', '--clear', ...(portIndex >= 0 ? [] : ['--port', String(metroPort)]), ...args], {
  cwd: new URL('../mobile/', import.meta.url),
  stdio: 'inherit',
  env: { ...process.env, EXPO_PUBLIC_WEB_URL: webUrl, EXPO_PACKAGER_PROXY_URL: metroUrl },
});
children.push(expo);

process.on('SIGINT', () => { stopAll(); process.exit(0); });
process.on('SIGTERM', () => { stopAll(); process.exit(0); });
expo.on('exit', code => { stopAll(); process.exit(code ?? 0); });
