import { CheckSquare, ChevronRight } from 'lucide-react';
import type { PublicJob } from '../../shared/contracts';
import type { ResultTab } from '../workflow/reducer';
import { previewUrl, sourceUrl } from '../workflow/api';
import { Button, Heading, Paper, TextButton } from '../ui/Controls';
import { CHECK_EXPLANATION } from './Progress';

export function Result({ job, tab, pending, onTab, onDownload, onDetails, onSource }: { job: PublicJob; tab: ResultTab; pending: boolean; onTab: (tab: ResultTab) => void; onDownload: (format: 'pdf' | 'svg') => void; onDetails: () => void; onSource: () => void }) {
  const report = job.report!;
  const moveTab = (event: React.KeyboardEvent) => {
    if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 'original' : event.key === 'End' ? 'redesigned' : tab === 'original' ? 'redesigned' : 'original';
    onTab(next);
    document.getElementById(`tab-${next}`)?.focus();
  };
  return <section className="result-view" data-view={tab === 'original' ? 'M13' : 'M12'} data-desktop-view="D05">
    <Heading title={<><span className="mobile-only">{tab === 'original' ? 'Viewing the original' : 'Ready to print.'}</span><span className="desktop-only">Your message, clearer.</span></>} subtitle={`A3 · Target viewing distance: ${job.distance} m`}>
      <Button data-guide-target="pdf" onClick={() => onDownload('pdf')} disabled={pending}>Download PDF</Button><TextButton onClick={() => onDownload('svg')} disabled={pending}>Download editable SVG</TextButton>
    </Heading>
    <div className="result-tabs" role="tablist" aria-label="Compare the notice" onKeyDown={moveTab}><button type="button" role="tab" id="tab-original" tabIndex={tab === 'original' ? 0 : -1} aria-selected={tab === 'original'} aria-controls="preview-original" onClick={() => onTab('original')}>Original</button><button data-guide-target="redesigned-tab" type="button" role="tab" id="tab-redesigned" tabIndex={tab === 'redesigned' ? 0 : -1} aria-selected={tab === 'redesigned'} aria-controls="preview-redesigned" onClick={() => onTab('redesigned')}>Redesigned</button></div>
    <div className={`comparison-layout active-${tab}`}><div className="comparison-original" id="preview-original"><h2 className="desktop-only section-label">Original</h2><Paper src={sourceUrl(job)} alt={`Original notice: ${job.name}`} onClick={onSource} /></div><div className="comparison-redesigned" id="preview-redesigned"><h2 className="desktop-only section-label">Redesigned</h2><Paper src={previewUrl(job)} alt="Redesigned A3 sign" /></div>
      <aside className="comparison-checks"><h2>Automated checks</h2><p className="muted">Passed</p><dl className="report-summary"><div><dt>Important details and conditions</dt><dd>{report.content ? 'Matched' : 'Needs review'}</dd></div><div><dt>AI read from the sign</dt><dd>{report.matched} of {report.total} answers</dd></div></dl><TextButton data-guide-target="checks" className="check-history-link" onClick={onDetails}>View checks and changes <ChevronRight aria-hidden="true" /></TextButton><p className="help-text">{CHECK_EXPLANATION}</p></aside>
    </div>
    <div className="comparison-footnote desktop-only"><span>Same preview scale</span><TextButton onClick={onSource}>View original</TextButton></div>
    <div className={`mobile-result-actions ${tab === 'original' ? 'original-actions' : ''}`}>
      {tab === 'redesigned' ? <div className="passed-line"><CheckSquare aria-hidden="true" /><span>Automated checks passed</span><TextButton data-guide-target="checks" onClick={onDetails}>Details</TextButton></div> : null}
      <Button data-guide-target="pdf" icon="download" onClick={() => onDownload('pdf')} disabled={pending}>{tab === 'original' ? 'Download redesigned PDF' : 'Download PDF'}</Button>
      {tab === 'original' ? <TextButton className="center-link" onClick={() => onTab('redesigned')}>Back to redesigned</TextButton> : <TextButton className="center-link" onClick={() => onDownload('svg')} disabled={pending}>Download editable SVG</TextButton>}
    </div>
  </section>;
}
