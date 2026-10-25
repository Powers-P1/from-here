import { useEffect, useRef, useState } from 'react';
import type { JobPhase } from '../../shared/contracts';
import type { MainView } from '../workflow/reducer';

export function useWalkthroughTarget(step: number, view: MainView, phase: JobPhase | undefined, blocked: boolean, taskId: string, tab: string) {
  const target = useRef<HTMLElement | null>(null);
  const [available, setAvailable] = useState(false);
  useEffect(() => {
    let previousDescription: string | null = null;
    const clear = () => {
      if (target.current) {
        target.current.removeAttribute('data-walkthrough-current');
        if (previousDescription === null) target.current.removeAttribute('aria-describedby');
        else target.current.setAttribute('aria-describedby', previousDescription);
      }
      target.current = null;
    };
    const update = () => {
      clear();
      let names: string[] = [];
      if (!blocked) {
        if (step === 0) names = ['sample', 'upload'];
        else if (view === 'progress' && phase === 'interrupted') names = ['retry'];
        else if (view === 'progress' && phase === 'stopped') names = ['review'];
        else if (step === 1 && view === 'upload') names = ['read'];
        else if (step === 2 && view === 'facts') names = ['confirm', 'missing', 'replace'];
        else if (step === 3 && view === 'result') names = ['checks', 'redesigned-tab'];
        else if (step === 4) names = view === 'checks' ? ['back-result'] : view === 'result' ? ['pdf'] : [];
      }
      const candidates = names.flatMap(name => Array.from(document.querySelectorAll<HTMLElement>('#main-content [data-guide-target="' + name + '"]')));
      const next = candidates.find(node => node.getClientRects().length > 0 &&
        getComputedStyle(node).visibility !== 'hidden' && !node.matches(':disabled,[aria-disabled="true"]'));
      if (next) {
        target.current = next;
        previousDescription = next.getAttribute('aria-describedby');
        next.setAttribute('aria-describedby', [previousDescription, taskId].filter(Boolean).join(' '));
        next.setAttribute('data-walkthrough-current', 'true');
      }
      setAvailable(Boolean(next));
    };
    update();
    window.addEventListener('resize', update);
    return () => { window.removeEventListener('resize', update); clear(); };
  }, [step, view, phase, blocked, taskId, tab]);
  return { available, show: () => {
    const node = target.current;
    if (node?.isConnected) {
      node.scrollIntoView({ block: 'center', behavior: 'instant' });
      node.focus({ preventScroll: true });
    }
  } };
}
