import { Fragment, useState, type FormEvent } from 'react';
import { Pencil } from 'lucide-react';
import { blockingFacts, factGroups, FIELD_LABELS, type FactField, type FactGroup, type FieldStatus, type NoticeFacts, type PublicJob, type TimeMeaning } from '../../shared/contracts';
import { sourceUrl } from '../workflow/api';
import { Button, ErrorMessage, Heading, IconButton, Modal, Paper, TextButton } from '../ui/Controls';

export function SourceSummary({ job, onSource }: { job: PublicJob; onSource: () => void }) {
  return <div className="source-summary"><Paper src={sourceUrl(job)} alt={`Original notice: ${job.name}`} onClick={onSource} /><div><h2>{job.name}</h2><p className="muted">A3 · {job.distance} m</p><TextButton onClick={onSource}>View original</TextButton></div></div>;
}

export function Facts({ job, pending, error, onEdit, onDesign, onSource, onReplace, onSave }: { job: PublicJob; pending: boolean; error: string | null; onEdit: (field: FactGroup) => void; onDesign: () => void; onSource: () => void; onReplace: () => void; onSave: (facts: NoticeFacts) => Promise<boolean> }) {
  const facts = job.facts!;
  const blockers = blockingFacts(facts);
  const timeUnknown = facts.time.status === 'unreadable' || facts.timeMeaning === 'unreadable';
  const firstUnknown = factGroups(facts).find(field => field.status === 'unreadable')?.key ?? 'what';
  if (job.extraction && (!job.extraction.supported || job.extraction.language !== 'english')) return <section className="facts-view" data-view="M06" data-desktop-view="D02"><Heading title="Choose a clearer English notice." subtitle={job.extraction.reason || 'Use a readable English notice with one main instruction.'} /><SourceSummary job={job} onSource={onSource} /><Button data-guide-target="replace" onClick={onReplace}>Choose another photo</Button></section>;
  return <section className="facts-view" data-view={blockers.length ? 'M06' : 'M05'} data-desktop-view="D02">
    <Heading title={<><span className="mobile-only">{blockers.length > 1 ? 'Some details need you.' : blockers.length ? 'One detail needs you.' : 'Keep what matters.'}</span><span className="desktop-only">Confirm the important details.</span></>} subtitle={<><span className="mobile-only">{blockers.length ? null : 'Confirm the facts before the layout changes.'}</span><span className="desktop-only">Check the original and complete any missing information.</span></>} />
    <div className="facts-layout"><div className="facts-source"><h2 className="desktop-only section-label">Original</h2><SourceSummary job={job} onSource={onSource} /><TextButton className="desktop-only change-source-link" onClick={onReplace}>Change photo</TextButton></div><div className="facts-content">
      <h2 className="desktop-only section-label">Confirm these details</h2>
      <div className="fact-list">{factGroups(facts).map(group => <Fragment key={group.key}><button className={`fact-row ${group.key === 'exception' && group.status !== 'not_stated' ? 'exception-row' : ''}`} onClick={() => onEdit(group.key)} aria-label={`Edit ${FIELD_LABELS[group.key]}`}>
        <span className="fact-label">{FIELD_LABELS[group.key]}</span><span className="fact-value">{group.status === 'not_stated' ? <span className="muted">Not stated in the notice</span> : group.key === 'when' && group.status === 'unreadable' ? <>{facts.date.status === 'known' ? <span>{facts.date.value}<br /></span> : null}<span className="warning-text">{timeUnknown ? 'Time needs confirming' : 'Date needs confirming'}</span></> : group.status === 'unreadable' ? <span className="warning-text">Needs confirming</span> : group.value}</span><Pencil aria-hidden="true" />
      </button>{group.key === 'when' && timeUnknown ? <InlineTimeEditor facts={facts} pending={pending} onSave={onSave} /> : null}</Fragment>)}</div>
      {blockers.length ? <div className="fact-blocker"><TextButton data-guide-target="missing" onClick={() => onEdit(timeUnknown ? 'when' : firstUnknown)}>{timeUnknown ? 'Confirm the time' : 'Confirm the missing detail'}</TextButton><p className="help-text">{timeUnknown ? 'Enter a confirmed time. If you do not know it, use a clearer photo.' : blockers[0]}</p><TextButton onClick={onReplace}>Use a clearer photo</TextButton></div> : null}
      <ErrorMessage>{error}</ErrorMessage><Button data-guide-target="confirm" icon="arrow" onClick={onDesign} disabled={pending || blockers.length > 0}>Confirm &amp; redesign</Button>
      <p className="help-text center-text">{blockers.length ? 'Confirm the missing details to continue.' : 'These details stay in the new sign.'}</p>
    </div></div>
  </section>;
}

function InlineTimeEditor({ facts, pending, onSave }: { facts: NoticeFacts; pending: boolean; onSave: (facts: NoticeFacts) => Promise<boolean> }) {
  const [value, setValue] = useState('');
  const [meaning, setMeaning] = useState<TimeMeaning>(['from','at','until'].includes(facts.timeMeaning) ? facts.timeMeaning : 'unreadable');
  const pickup = /pickup|collection/i.test(facts.what.value);
  const valid = Boolean(value.trim()) && ['from','at','until'].includes(meaning);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (valid) void onSave({ ...facts, time: { status: 'known', value: value.trim() }, timeMeaning: meaning });
  };
  return <form className="inline-time-editor desktop-only" onSubmit={submit}><label htmlFor="inline-time">{pickup ? 'Start time' : 'Time'}</label><div><input id="inline-time" value={value} maxLength={240} onChange={event => setValue(event.target.value)} aria-describedby="inline-time-help" /><p id="inline-time-help" className="help-text warning-text">Needs confirmation</p><label htmlFor="inline-meaning">{pickup ? 'Pickup starts at this time' : 'What does this time mean?'}</label><select id="inline-meaning" value={meaning} onChange={event => setMeaning(event.target.value as TimeMeaning)}><option value="unreadable">Choose the meaning</option><option value="from">From this time</option><option value="at">At this time</option><option value="until">Until this time</option></select><TextButton type="submit" disabled={!valid || pending}>{pending ? 'Saving…' : 'Confirm time'}</TextButton></div></form>;
}

function FieldEditor({ id, label, field, onChange, autoFocus = false, helper }: { id: string; label: string; field: FactField; onChange: (field: FactField) => void; autoFocus?: boolean; helper?: string }) {
  return <div className="edit-field"><label htmlFor={id}>{label}</label><input id={id} type="text" data-autofocus={autoFocus ? 'true' : undefined} value={field.status === 'known' ? field.value : ''} maxLength={240} onChange={event => onChange({ status: event.target.value.trim() ? 'known' : 'unreadable', value: event.target.value })} aria-describedby={helper ? `${id}-help` : undefined} />
    {helper ? <p id={`${id}-help`} className="help-text">{helper}</p> : null}<label className="status-selector"><span>In the original notice</span><select value={field.status} onChange={event => onChange({ status: event.target.value as FieldStatus, value: event.target.value === 'known' ? field.value : '' })}><option value="known">Stated and confirmed</option><option value="unreadable">Cannot read it</option><option value="not_stated">Not stated</option></select></label></div>;
}

export function EditFact({ job, field, pending, error, onSave, onClose, onSource, onReplace }: { job: PublicJob; field: FactGroup; pending: boolean; error: string | null; onSave: (facts: NoticeFacts) => Promise<boolean>; onClose: () => void; onSource: () => void; onReplace: () => void }) {
  const [draft, setDraft] = useState<NoticeFacts>(() => structuredClone(job.facts!));
  const [localError, setLocalError] = useState('');
  const pickup = /pickup|collection/i.test(draft.what.value);
  const unknownTime = field === 'when' && (job.facts!.time.status === 'unreadable' || job.facts!.timeMeaning === 'unreadable');
  const dismiss = () => { if (!pending) onClose(); };
  const title = field === 'when' ? pickup ? 'When does pickup start?' : 'When does this happen?' : field === 'exception' ? 'Keep the condition together.' : `Confirm ${FIELD_LABELS[field].toLowerCase()}.`;
  const setField = (key: 'who' | 'what' | 'where' | 'date' | 'time', value: FactField) => setDraft(previous => ({ ...previous, [key]: value }));
  const save = async (event: FormEvent) => {
    event.preventDefault(); setLocalError('');
    if (field === 'when' && draft.time.status === 'known' && !['from', 'at', 'until'].includes(draft.timeMeaning)) { setLocalError('Choose whether this time means from, at, or until.'); return; }
    if (field === 'exception' && draft.exception.status === 'known' && (!draft.exception.condition.trim() || !draft.exception.instruction.trim())) { setLocalError('Keep both the condition and its instruction.'); return; }
    await onSave(draft);
  };
  return <Modal title={title} onDismiss={dismiss} sheet view="M07" className="edit-modal"><div className="modal-heading"><h2>{title}</h2><IconButton label="Cancel editing" onClick={dismiss} disabled={pending}><span aria-hidden="true">×</span></IconButton></div>
    <div className="edit-source"><Paper src={sourceUrl(job)} alt="Original notice for reference" onClick={onSource} disabled={pending} /><div><TextButton onClick={onSource} disabled={pending}>View original</TextButton><p className="help-text">Confirm only what you know.</p></div></div>
    <form onSubmit={save} aria-busy={pending}><fieldset disabled={pending}>
      {field === 'when' ? <>
        <FieldEditor id="edit-date" label="Date" field={draft.date} onChange={value => setField('date', value)} />
        <FieldEditor id="edit-time" label={pickup ? 'Start time' : 'Time'} field={draft.time} autoFocus onChange={value => setDraft(previous => ({ ...previous, time: value, timeMeaning: value.status === 'not_stated' ? 'not_stated' : value.status === 'unreadable' ? 'unreadable' : ['from','at','until'].includes(previous.timeMeaning) ? previous.timeMeaning : 'unreadable' }))} helper="Enter a confirmed time. If you do not know it, use a clearer photo." />
        <div className="edit-field"><label htmlFor="edit-time-meaning">{pickup ? 'Pickup starts at this time' : 'What does this time mean?'}</label><select id="edit-time-meaning" value={draft.timeMeaning} onChange={event => setDraft(previous => ({ ...previous, timeMeaning: event.target.value as TimeMeaning }))} disabled={draft.time.status === 'not_stated'}><option value="unreadable">Choose the meaning</option><option value="from">From this time</option><option value="at">At this time</option><option value="until">Until this time</option>{draft.time.status === 'not_stated' ? <option value="not_stated">Not stated</option> : null}</select></div>
      </> : field === 'exception' ? <>
        <div className="edit-field"><label htmlFor="exception-status">Conditional instruction in the original</label><select id="exception-status" data-autofocus="true" value={draft.exception.status} onChange={event => setDraft(previous => ({ ...previous, exception: { ...previous.exception, status: event.target.value as FieldStatus, ...(event.target.value !== 'known' ? { condition: '', instruction: '' } : {}) } }))}><option value="known">Stated and confirmed</option><option value="unreadable">Cannot read it</option><option value="not_stated">Not stated</option></select></div>
        {draft.exception.status !== 'not_stated' ? <><div className="edit-field"><label htmlFor="exception-condition">Who or what does this apply to?</label><input id="exception-condition" value={draft.exception.condition} maxLength={200} onChange={event => setDraft(previous => ({ ...previous, exception: { ...previous.exception, condition: event.target.value, status: 'known' } }))} /></div><div className="edit-field"><label htmlFor="exception-instruction">What should they do, or where should they go?</label><textarea id="exception-instruction" value={draft.exception.instruction} maxLength={240} onChange={event => setDraft(previous => ({ ...previous, exception: { ...previous.exception, instruction: event.target.value, status: 'known' } }))} /></div></> : null}
      </> : <FieldEditor id={`edit-${field}`} label={{ who: 'Who is this for?', what: 'What should people do?', where: 'Where should people go?' }[field]} field={draft[field]} autoFocus onChange={value => setField(field, value)} />}
      <ErrorMessage>{localError || error}</ErrorMessage><Button type="submit" disabled={pending || (unknownTime && (draft.time.status === 'unreadable' || (draft.time.status === 'known' && (!draft.time.value.trim() || !['from','at','until'].includes(draft.timeMeaning)))))}>{pending ? 'Saving…' : unknownTime ? 'Confirm time' : 'Save changes'}</Button>
      {unknownTime ? <TextButton className="center-link" onClick={onReplace}>Use a clearer photo</TextButton> : null}<TextButton className="center-link" onClick={dismiss}>Cancel</TextButton><p className="help-text center-text" role={pending ? 'status' : undefined}>{pending ? 'Saving your confirmed details…' : 'Changed details will be checked again.'}</p>
    </fieldset></form>
  </Modal>;
}
