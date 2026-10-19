'use client';

import { useState } from 'react';
import { Card, ErrorNote, inputClass, type DsIconName } from '@/components/ui';
import { DsIcon } from '@/components/design-system';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_MEMBERS = 10;

const STEPS: Array<{ n: number; label: string; icon: DsIconName }> = [
  { n: 1, label: 'Team details', icon: 'users' },
  { n: 2, label: 'Contact', icon: 'mail' },
  { n: 3, label: 'Members', icon: 'userCheck' },
];

function Stepper({ step, goTo }: { step: number; goTo: (n: number) => void }) {
  return (
    <div className="mb-6" aria-label="Registration progress">
      <ol className="flex items-center">
        {STEPS.map((s, i) => {
          const done = s.n < step;
          const active = s.n === step;
          const reachable = s.n <= step;
          return (
            <li key={s.n} className={`flex items-center ${i < STEPS.length - 1 ? 'flex-1' : ''}`}>
              <button
                type="button"
                onClick={() => reachable && goTo(s.n)}
                disabled={!reachable}
                className="group flex shrink-0 items-center gap-2.5"
                aria-current={active ? 'step' : undefined}
              >
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold transition ${
                    done
                      ? 'bg-emerald-500 text-white'
                      : active
                        ? 'bg-[var(--brand)] text-white shadow-md'
                        : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {done ? <DsIcon name="check" className="h-4 w-4" /> : <DsIcon name={s.icon} className="h-4 w-4" />}
                </span>
                <span className={`hidden text-sm font-semibold sm:block ${active ? 'text-slate-900' : 'text-slate-400'}`}>
                  {s.label}
                </span>
              </button>
              {i < STEPS.length - 1 && (
                <span className={`mx-3 h-0.5 flex-1 rounded-full ${s.n < step ? 'bg-emerald-400' : 'bg-slate-200'}`} aria-hidden="true" />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export default function RegisterForm({ eventId, eventSlug }: { eventId: string; eventSlug: string }) {
  const [step, setStep] = useState(1);
  const [teamName, setTeamName] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [members, setMembers] = useState<string[]>(['']);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);
  const [busy, setBusy] = useState(false);
  // Prevents double-click on Continue from landing on the Step 3 submit button
  // (both buttons render in the same spot).
  const [navigating, setNavigating] = useState(false);

  function setMember(i: number, value: string) {
    setMembers((m) => m.map((x, idx) => (idx === i ? value : x)));
  }
  function addMember() {
    if (members.length < MAX_MEMBERS) setMembers((m) => [...m, '']);
  }
  function removeMember(i: number) {
    setMembers((m) => m.filter((_, idx) => idx !== i));
  }

  function validateStep(n: number): string | null {
    if (n === 1 && teamName.trim().length < 2) return 'Please enter a team name (at least 2 characters).';
    if (n === 2 && !EMAIL_RE.test(contactEmail.trim())) return 'Please enter a valid contact email.';
    return null;
  }

  function next() {
    if (navigating) return;
    const err = validateStep(step);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setNavigating(true);
    setStep((s) => Math.min(3, s + 1));
    // Re-enable after the step transition renders (submit button appears in the same spot)
    setTimeout(() => setNavigating(false), 600);
  }

  function back() {
    setError(null);
    setStep((s) => Math.max(1, s - 1));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    // If user pressed Enter before the last step, advance the wizard instead of submitting
    if (step < 3) {
      next();
      return;
    }
    const err = validateStep(1) ?? validateStep(2);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          name: teamName.trim(),
          contact_name: contactName.trim(),
          contact_email: contactEmail.trim().toLowerCase(),
          contact_phone: contactPhone.trim(),
          members: members.map((m) => m.trim()).filter(Boolean),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Registration failed');
        return;
      }
      setPending(data.approval_status === 'pending');
      setDone(true);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    if (pending) {
      return (
        <Card className="p-8 text-center sm:p-10">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
            <DsIcon name="clock" className="h-7 w-7" />
          </span>
          <h2 className="mt-4 text-xl font-bold text-slate-900">Your registration is pending organizer approval</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-500">
            <strong className="text-slate-700">{teamName}</strong> was received. We&apos;ll notify you
            once the organizer approves your team.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <a
              href={`/e/${eventSlug}`}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <DsIcon name="chevronLeft" className="h-4 w-4" />
              Back to event
            </a>
          </div>
        </Card>
      );
    }
    return (
      <Card className="p-8 text-center sm:p-10">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
          <DsIcon name="checkCircle" className="h-7 w-7" />
        </span>
        <h2 className="mt-4 text-xl font-bold text-slate-900">Team registered!</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-500">
          <strong className="text-slate-700">{teamName}</strong> is in. Good luck!
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <a
            href={`/e/${eventSlug}/submit`}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--brand)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--brand-dark)]"
          >
            Submit your project
            <DsIcon name="chevronRight" className="h-4 w-4" />
          </a>
          <a
            href={`/e/${eventSlug}`}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <DsIcon name="chevronLeft" className="h-4 w-4" />
            Back to event
          </a>
        </div>
      </Card>
    );
  }

  return (
    <div>
      <Stepper step={step} goTo={(n) => { setError(null); setStep(n); }} />
      <Card className="overflow-hidden p-0">
        <form onSubmit={onSubmit}>
          <ErrorNote message={error} />
          <div className="p-6 sm:p-8">
            {step === 1 && (
              <div>
                <h2 className="flex items-center gap-2.5 text-lg font-extrabold text-slate-900">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[rgb(var(--brand-rgb)/0.1)] text-[var(--brand)]">
                    <DsIcon name="users" className="h-4 w-4" />
                  </span>
                  Team details
                </h2>
                <p className="mt-1.5 text-sm text-slate-500">Pick a name the judges will remember.</p>
                <div className="mt-5">
                  <label htmlFor="team-name" className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Team name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="team-name"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    className={`${inputClass} py-3 text-base`}
                    placeholder="Code Warriors"
                    required
                    minLength={2}
                    autoFocus
                  />
                </div>
              </div>
            )}

            {step === 2 && (
              <div>
                <h2 className="flex items-center gap-2.5 text-lg font-extrabold text-slate-900">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[rgb(var(--brand-rgb)/0.1)] text-[var(--brand)]">
                    <DsIcon name="mail" className="h-4 w-4" />
                  </span>
                  Contact person
                </h2>
                <p className="mt-1.5 text-sm text-slate-500">Who should the organizer reach out to?</p>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="contact-name" className="mb-1.5 block text-sm font-semibold text-slate-700">
                      Full name
                    </label>
                    <input
                      id="contact-name"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      className={inputClass}
                      placeholder="Ali Khan"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label htmlFor="contact-phone" className="mb-1.5 block text-sm font-semibold text-slate-700">
                      Phone
                    </label>
                    <input
                      id="contact-phone"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      className={inputClass}
                      placeholder="03xx xxxxxxx"
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <label htmlFor="contact-email" className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Email <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="contact-email"
                    type="email"
                    required
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className={inputClass}
                    placeholder="you@example.com"
                  />
                  <p className="mt-1.5 text-xs text-slate-400">
                    Used to look up your team when submitting the project.
                  </p>
                </div>
              </div>
            )}

            {step === 3 && (
              <div>
                <h2 className="flex items-center gap-2.5 text-lg font-extrabold text-slate-900">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[rgb(var(--brand-rgb)/0.1)] text-[var(--brand)]">
                    <DsIcon name="userCheck" className="h-4 w-4" />
                  </span>
                  Team members
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-500">
                    {members.filter((m) => m.trim()).length}/{MAX_MEMBERS}
                  </span>
                </h2>
                <p className="mt-1.5 text-sm text-slate-500">Add everyone building with you (including yourself).</p>
                <div className="mt-5 space-y-2.5">
                  {members.map((m, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xs font-black text-slate-500">
                        {i + 1}
                      </span>
                      <input
                        value={m}
                        onChange={(e) => setMember(i, e.target.value)}
                        className={inputClass}
                        placeholder={`Member ${i + 1} name`}
                        aria-label={`Member ${i + 1} name`}
                      />
                      {members.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeMember(i)}
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-400 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                          aria-label={`Remove member ${i + 1}`}
                        >
                          <DsIcon name="x" className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {members.length < MAX_MEMBERS ? (
                  <button
                    type="button"
                    onClick={addMember}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-dashed border-slate-300 px-4 py-2.5 text-sm font-semibold text-[var(--brand)] transition hover:border-[var(--brand)] hover:bg-[rgb(var(--brand-rgb)/0.05)]"
                  >
                    <DsIcon name="plus" className="h-4 w-4" />
                    Add member
                  </button>
                ) : (
                  <p className="mt-3 text-xs text-slate-400">Maximum {MAX_MEMBERS} members per team.</p>
                )}
              </div>
            )}
          </div>

          {/* Sticky-feel footer nav */}
          <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/60 px-6 py-4 sm:px-8">
            {step > 1 ? (
              <button
                type="button"
                onClick={back}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <DsIcon name="chevronLeft" className="h-4 w-4" />
                Back
              </button>
            ) : (
              <span />
            )}
            {step < 3 ? (
              <button
                type="button"
                onClick={next}
                disabled={navigating}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--brand)] px-6 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-[var(--brand-dark)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Continue
                <DsIcon name="chevronRight" className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={busy || navigating}
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--brand)] px-8 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-[var(--brand-dark)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? (
                  <>Registering…</>
                ) : (
                  <>
                    <DsIcon name="check" className="h-4 w-4" />
                    Register team
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      </Card>
      <p className="mt-4 text-center text-xs text-slate-400">
        By registering you agree to the event rules set by the organizer.
      </p>
    </div>
  );
}
