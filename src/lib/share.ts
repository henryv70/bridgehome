import { toast } from 'sonner';
import { t } from './i18n';

declare global {
  interface Window { ReactNativeWebView?: { postMessage: (data: string) => void } }
}

export async function copyText(text: string) {
  // navigator.clipboard only exists on secure origins (not http://<lan-ip>), so fall back.
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const el = Object.assign(document.createElement('textarea'), { value: text });
  el.style.cssText = 'position:fixed;opacity:0';
  document.body.append(el);
  el.select();
  document.execCommand('copy');
  el.remove();
}

// Native share sheet in the Expo app, Web Share where supported, otherwise copy.
export async function shareLink(title: string, url: string, copied = t('Link copied')) {
  if (window.ReactNativeWebView) {
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'share', title, url }));
    return;
  }
  if (navigator.share) {
    try { await navigator.share({ title, url }); return; } catch (e) { if ((e as Error).name === 'AbortError') return; }
  }
  await copyText(url);
  toast.success(copied);
}
