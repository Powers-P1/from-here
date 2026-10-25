import { X } from 'lucide-react';
import type { Overlay } from '../workflow/reducer';
import { Button, ErrorMessage, IconButton, Modal, TextButton } from '../ui/Controls';

type DownloadOverlay = Extract<Overlay, { kind: 'download' }>;
export function DownloadDialog({ download, returnLabel, onClose, onRetry, onSvg }: { download: DownloadOverlay; returnLabel: string; onClose: () => void; onRetry: () => void; onSvg: () => void }) {
  const format = download.format.toUpperCase();
  const started = download.status === 'started';
  const preparing = download.status === 'preparing';
  const title = preparing ? `Preparing your ${format}…` : started ? `${format} download started` : `Could not prepare the ${format}.`;
  return <Modal title={title} onDismiss={onClose} sheet={started || preparing} view={started ? 'M15' : preparing ? undefined : 'M16'} className={`download-modal ${started || preparing ? '' : 'download-error-modal'}`}>
    <div className="modal-heading"><h2>{title}</h2><IconButton label="Close download message" onClick={onClose}><X /></IconButton></div>
    {started ? <><p className="download-filename">{download.filename}</p><p className="muted">A3 · Portrait{download.draft ? ' · Unchecked draft' : ''}</p><p className="help-text">{download.format === 'pdf' ? 'Print at Actual size on A3 paper.' : 'This SVG can be edited in a vector editor.'}</p><Button onClick={onClose}>{returnLabel}</Button><TextButton className="center-link" onClick={onRetry}>Download again</TextButton></>
      : preparing ? <><div className="indeterminate-progress" role="status" aria-label={title} /><TextButton className="center-link" onClick={onClose}>Cancel</TextButton></>
      : <><p className="muted">{download.draft ? 'Your unchecked draft is still here.' : 'Your checked sign is still here.'}</p><ErrorMessage>{download.message}</ErrorMessage><Button onClick={onRetry}>Try download again</Button>{download.format === 'pdf' ? <TextButton className="center-link" onClick={onSvg}>Download editable SVG</TextButton> : null}</>}
  </Modal>;
}

export function ResetDialog({ replacement, pending, error, onConfirm, onClose }: { replacement: boolean; pending: boolean; error: string | null; onConfirm: () => void; onClose: () => void }) {
  return <Modal title={replacement ? 'Replace this notice?' : 'Start a new notice?'} onDismiss={onClose} view="M17" className="reset-modal"><h2>{replacement ? 'Replace this notice?' : 'Start a new notice?'}</h2><p className="muted">This clears the current notice. Download your result first if you want to keep it.</p><ErrorMessage>{error}</ErrorMessage><Button onClick={onConfirm} disabled={pending}>{pending ? 'Please wait…' : replacement ? 'Use the new photo' : 'Start new notice'}</Button><TextButton className="center-link" onClick={onClose} disabled={pending}>Keep working</TextButton></Modal>;
}
