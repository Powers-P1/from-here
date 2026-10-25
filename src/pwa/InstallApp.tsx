import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { Button, IconButton, Modal, TextButton } from '../ui/Controls';
import { installPlatform, installSteps } from './platform';
import './install.css';

interface InstallPrompt extends Event {
  prompt(): Promise<unknown>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
const DISMISSED = 'from-here:install-dismissed:v1';
const readDismissed = () => { try { return localStorage.getItem(DISMISSED) === '1'; } catch { return false; } };
const inAppWindow = () => matchMedia('(display-mode: standalone)').matches ||
  Boolean((navigator as Navigator & { standalone?: boolean }).standalone);

export function InstallApp() {
  const platform = installPlatform(navigator.userAgent, navigator.platform, navigator.maxTouchPoints);
  const [installed, setInstalled] = useState(inAppWindow);
  const [dismissed, setDismissed] = useState(readDismissed);
  const [open, setOpen] = useState(false);
  const [nativeReady, setNativeReady] = useState(false);
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState('');
  const prompt = useRef<InstallPrompt | null>(null);
  useEffect(() => {
    const media = matchMedia('(display-mode: standalone)');
    const update = () => setInstalled(inAppWindow());
    const ready = (event: Event) => { event.preventDefault(); prompt.current = event as InstallPrompt; setNativeReady(true); };
    const done = () => { prompt.current = null; setNativeReady(false); setInstalled(true); setOpen(false); };
    window.addEventListener('beforeinstallprompt', ready);
    window.addEventListener('appinstalled', done);
    media.addEventListener('change', update);
    return () => { window.removeEventListener('beforeinstallprompt', ready); window.removeEventListener('appinstalled', done); media.removeEventListener('change', update); };
  }, []);
  if (installed) return null;
  const dismiss = () => {
    setDismissed(true);
    try { localStorage.setItem(DISMISSED, '1'); } catch { /* A blocked storage area does not prevent closing. */ }
    requestAnimationFrame(() => document.querySelector<HTMLElement>('.install-reopen')?.focus({ preventScroll: true }));
  };
  const show = () => { setStatus(''); setOpen(true); };
  const install = async () => {
    if (!prompt.current) return;
    const event = prompt.current; prompt.current = null; setNativeReady(false); setPending(true);
    try {
      await event.prompt();
      const choice = await event.userChoice;
      if (choice.outcome === 'dismissed') setStatus('Installation was dismissed. You can keep using the browser.');
      else setStatus('Follow your browser’s confirmation. Installation does not save your projects.');
    } catch { setStatus('The browser did not open installation. Follow the menu instructions above.'); }
    finally { setPending(false); }
  };
  return <div className="install-support">
    {platform !== 'desktop' && !dismissed ? <div className="install-invitation">
      <div><p><strong>Keep FROM HERE one tap away.</strong></p><p className="install-note">Add it to your home screen. AI and exports need an internet connection.</p></div>
      <IconButton label="Dismiss installation invitation" onClick={dismiss}><X /></IconButton>
      <TextButton onClick={show}>How to install</TextButton>
    </div> : <TextButton className="install-reopen" onClick={show}>Install app</TextButton>}
    {open ? <Modal title="Add FROM HERE to your device" onDismiss={() => { if (!pending) setOpen(false); }} className="install-dialog">
      <div className="install-dialog-top"><h2>Add FROM HERE<br />to your device.</h2><IconButton label="Close installation instructions" onClick={() => setOpen(false)} disabled={pending}><X /></IconButton></div>
      <p>A home-screen icon opens the same working app.</p>
      <ol>{installSteps[platform].map(step => <li key={step}>{step}</li>)}</ol>
      <p className="install-note">AI and exports require internet. Jobs remain temporary; download results to keep them. The app may need about a minute to wake.</p>
      {status ? <p role="status">{status}</p> : null}
      {nativeReady ? <Button data-autofocus="true" onClick={() => void install()} disabled={pending}>Install FROM HERE</Button> : <Button data-autofocus="true" onClick={() => setOpen(false)} disabled={pending}>{pending ? 'Waiting for the browser…' : 'Continue in browser'}</Button>}
    </Modal> : null}
  </div>;
}
