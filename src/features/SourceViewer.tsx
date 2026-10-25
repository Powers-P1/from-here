import { useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import type { PublicJob } from '../../shared/contracts';
import { sourceUrl } from '../workflow/api';
import { Button, Header, Heading, IconButton, Modal } from '../ui/Controls';

export function SourceViewer({ job, onClose }: { job: PublicJob; onClose: () => void }) {
  const [zoom, setZoom] = useState(1);
  return <Modal title="Original notice" onDismiss={onClose} fullscreen view="M23" className="source-viewer"><div className="source-viewer-inner"><Header onClose={onClose} solo /><Heading title="Original notice" subtitle={job.name} /><div className="source-viewport"><img src={sourceUrl(job)} alt={`Original notice: ${job.name}`} style={{ width: `${zoom * 100}%` }} /></div><div className="source-controls"><IconButton label="Zoom out" onClick={() => setZoom(value => Math.max(0.5, value - 0.25))} disabled={zoom <= 0.5}><Minus /></IconButton><button onClick={() => setZoom(1)} aria-label="Fit original notice">Fit</button><IconButton label="Zoom in" onClick={() => setZoom(value => Math.min(3, value + 0.25))} disabled={zoom >= 3}><Plus /></IconButton></div><Button onClick={onClose}>Done</Button></div></Modal>;
}
