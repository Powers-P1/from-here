import { useEffect, useId, useRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, Check, ChevronLeft, Download, X } from 'lucide-react';

export function Button({ children, icon, className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { icon?: 'arrow' | 'download'; children: ReactNode }) {
  return <button type="button" className={`primary-button ${className}`} {...props}><span>{children}</span>{icon === 'arrow' ? <ArrowRight aria-hidden="true" /> : icon === 'download' ? <Download aria-hidden="true" /> : null}</button>;
}

export function TextButton({ children, className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" className={`text-button ${className}`} {...props}>{children}</button>;
}

export function IconButton({ children, label, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return <button type="button" className="icon-button" aria-label={label} title={label} {...props}>{children}</button>;
}

export function Brand() {
  return <span className="brand"><img src="/brand/from-here-wordmark.png" alt="FROM HERE" width="2176" height="724" /></span>;
}

export function Header({ onBack, onNew, onClose, timer, solo = false }: { onBack?: () => void; onNew?: () => void; onClose?: () => void; timer?: string; solo?: boolean }) {
  return <header className={`app-header${solo ? ' solo-header' : ''}`}>
    {onBack ? <span className="mobile-back"><IconButton label="Go back" onClick={onBack}><ChevronLeft /></IconButton></span> : null}
    <Brand />
    <div className="header-actions">{timer ? <span className="muted">{timer}</span> : null}{onNew ? <TextButton onClick={onNew}>New notice</TextButton> : null}{onClose ? <IconButton label="Close" onClick={onClose}><X /></IconButton> : null}</div>
  </header>;
}

export function Heading({ title, subtitle, children, className = '' }: { title: ReactNode; subtitle?: ReactNode; children?: ReactNode; className?: string }) {
  return <div className={`page-heading ${className}`}><div><h1 tabIndex={-1}>{title}</h1>{subtitle ? <p>{subtitle}</p> : null}</div>{children ? <div className="heading-actions">{children}</div> : null}</div>;
}

export function Paper({ src, alt, className = '', onClick, onLoad, disabled = false }: { src: string; alt: string; className?: string; onClick?: () => void; onLoad?: () => void; disabled?: boolean }) {
  const contents = <img src={src} alt={alt} draggable={false} onLoad={onLoad} />;
  return onClick ? <button type="button" className={`paper paper-button ${className}`} onClick={onClick} disabled={disabled} aria-label="View original notice">{contents}</button>
    : <div className={`paper ${className}`}>{contents}</div>;
}

export function Spinner({ label = 'Working' }: { label?: string }) { return <span className="spinner" role="status" aria-label={label} />; }

export function Step({ status, children }: { status: 'complete' | 'active' | 'waiting'; children: ReactNode }) {
  return <li className={`step step-${status}`}><span className="step-mark" aria-hidden="true">{status === 'complete' ? <Check /> : status === 'active' ? <span className="spinner" /> : <span className="waiting-ring" />}</span><span>{children}</span></li>;
}

export function ErrorMessage({ children }: { children?: ReactNode }) { return children ? <p className="error-message" role="alert">{children}</p> : null; }

export function BackLink({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return <TextButton className="back-link" onClick={onClick}><ArrowLeft aria-hidden="true" />{children}</TextButton>;
}

export function Modal({ children, title, onDismiss, sheet = false, fullscreen = false, view, className = '' }: { children: ReactNode; title: string; onDismiss: () => void; sheet?: boolean; fullscreen?: boolean; view?: string; className?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current!;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog.showModal();
    dialog.querySelector<HTMLElement>('[data-autofocus="true"]')?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { dialog.close(); document.body.style.overflow = previousOverflow; if (opener?.isConnected) opener.focus({ preventScroll: true }); };
  }, []);
  return <dialog ref={ref} aria-labelledby={titleId} className={`modal ${sheet ? 'modal-sheet' : ''} ${fullscreen ? 'modal-fullscreen' : ''} ${className}`} data-view={view}
    onCancel={event => { event.preventDefault(); onDismiss(); }}>
    <span id={titleId} className="sr-only">{title}</span>{sheet ? <div className="sheet-handle" aria-hidden="true" /> : null}{children}
  </dialog>;
}
