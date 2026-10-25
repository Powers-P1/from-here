import './walkthrough.css';

const steps = [
  ['Choose a notice.', 'Use the sample, or choose your own English PNG or JPG. You perform every step yourself.'],
  ['Let AI read the photo.', 'Choose Find key details. Wait for the actual photo to be read; this is a live AI run.'],
  ['Confirm what matters.', 'Compare the facts with the photo, especially any exception. Edit if needed, then choose Confirm & redesign. If a check stops, follow the recovery message.'],
  ['Inspect the check.', 'Open Details (on mobile) or View checks and changes. Compare the five readings, including the conditional instruction.'],
  ['Download your sign.', 'Choose Back to result, then Download PDF. Keep the file: this demo does not save projects.'],
  ['Your checked sign is downloaded.', 'You completed a real workflow. Print the PDF at Actual size on A3 paper. AI checks do not replace checking the sign with its readers.'],
] as const;

export function Walkthrough({ step, onExit }: { step: 0 | 1 | 2 | 3 | 4 | 5; onExit: () => void }) {
  const [title, task] = steps[step];
  return <aside className="walkthrough" aria-label="Guided walkthrough">
    <div className="walkthrough-top"><span>{step === 5 ? 'Walkthrough complete' : `Walkthrough · ${step + 1} of 5`}</span>
      <button type="button" className="text-button" onClick={onExit}>{step === 5 ? 'Finish' : 'Exit walkthrough'}</button></div>
    <div aria-live="polite" aria-atomic="true"><h2>{title}</h2><p>{task}</p></div>
  </aside>;
}
