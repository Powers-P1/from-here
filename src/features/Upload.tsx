import { useRef, useState, type DragEvent } from 'react';
import { FileText, Image as ImageIcon } from 'lucide-react';
import type { PublicJob } from '../../shared/contracts';
import { sourceUrl } from '../workflow/api';
import { Button, ErrorMessage, Heading, Paper, Spinner, TextButton } from '../ui/Controls';

interface Props {
  job: PublicJob | null; distance: 1 | 3 | 5; pending: string | null;
  issue: { name: string; message: string } | null; error: string | null;
  onFile: (file: File) => void; onSample: () => void; onRead: () => void;
  onDistance: (distance: 1 | 3 | 5) => void; onClearIssue: () => void; onSource: () => void;
}

export function Upload({ job, distance, pending, issue, error, onFile, onSample, onRead, onDistance, onClearIssue, onSource }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const choose = () => input.current?.click();
  const drop = (event: DragEvent) => {
    event.preventDefault(); setDragging(false);
    const file = event.dataTransfer.files[0];
    if (file && !pending) onFile(file);
  };
  const fileInput = <input ref={input} type="file" hidden aria-hidden="true" data-testid="notice-file-input" accept="image/png,image/jpeg,.png,.jpg,.jpeg" tabIndex={-1} onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; if (file) onFile(file); }} />;

  if (issue) return <section data-view="M03" className="rejected-view">
    {fileInput}<Heading title="Choose a photo instead." />
    <div className="rejected-file"><FileText aria-hidden="true" /><span>{issue.name}</span></div>
    <ErrorMessage>{issue.message}</ErrorMessage><Button data-guide-target="upload" onClick={choose} disabled={Boolean(pending)}>Choose another file</Button>
    <TextButton onClick={onClearIssue}>Back</TextButton>
  </section>;

  return <section data-view={job ? 'M02' : 'M01'} data-desktop-view="D01" className={`upload-view ${job ? 'has-source' : ''}`}>
    {fileInput}<Heading title={<><span className="mobile-only">{job ? 'Start with this notice.' : 'Make your notice clearer.'}</span><span className="desktop-only">Start with the notice.</span></>} subtitle={!job ? 'Turn a notice into a clear A3 sign.' : <span className="desktop-only">Turn a notice into a clear A3 sign.</span>} />
    <div className="upload-layout">
      <div className="upload-media">
        {job ? <Paper src={sourceUrl(job)} alt={`Original notice: ${job.name}`} onClick={onSource} /> : <button className={`upload-drop ${dragging ? 'drag-active' : ''}`} aria-label="Choose a notice photo, PNG or JPG" onClick={choose} disabled={Boolean(pending)} onDragOver={event => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={drop}>
          {pending ? <Spinner label="Opening the photo" /> : <ImageIcon aria-hidden="true" />}<span>{pending ? 'Opening your photo…' : 'PNG or JPG'}</span>
        </button>}
      </div>
      <div className="upload-settings">
        {job ? <div className="selected-source"><h2>{job.name}</h2><p className="muted">A3 · {distance} m</p><TextButton onClick={choose} disabled={Boolean(pending)}>Change photo</TextButton></div> : null}
        <div className="print-setting"><span>Print size<span className="mobile-only">:</span></span><strong>A3</strong></div>
        <fieldset className="distance-field"><legend>How far away will people read it?</legend><div className="distance-options">{([1,3,5] as const).map(value => <label key={value} className={distance === value ? 'selected' : ''}>
          <input type="radio" name="distance" checked={distance === value} value={value} onChange={() => onDistance(value)} disabled={Boolean(pending)} /><span>{value} m</span>
        </label>)}</div></fieldset>
        <p className="help-text">One English notice · PNG or JPG · up to 10 MB</p>
        <ErrorMessage>{error}</ErrorMessage>
        <Button data-guide-target={job ? 'read' : 'upload'} icon="arrow" onClick={job ? onRead : choose} disabled={Boolean(pending)}>{pending ? 'Opening your photo…' : job ? 'Find key details' : 'Choose photo'}</Button>
        {!job ? <TextButton data-guide-target="sample" className="center-link" onClick={onSample} disabled={Boolean(pending)}>Use sample notice</TextButton> : null}
        <p className="privacy-note">AI processing sends this photo and text to Anthropic. Jobs are temporary. <a href="https://powers-p1.github.io/from-here/privacy/" target="_blank" rel="noopener">Privacy &amp; limits<span className="sr-only"> (opens a new tab)</span></a></p>
      </div>
    </div>
  </section>;
}
