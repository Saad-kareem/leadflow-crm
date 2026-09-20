import { useEffect, useState } from 'react';
import { Button } from '../ui/Button.jsx';
import { Icon } from '../ui/Icon.jsx';
import { Drawer, Modal } from '../ui/Overlay.jsx';
import { ScoreBreakdown, ScoreMeter } from '../ui/ScoreMeter.jsx';
import { SourceBadge, StatusBadge } from '../ui/StatusBadge.jsx';
import { ErrorState, Skeleton } from '../ui/States.jsx';
import { SelectField, TextAreaField, TextField } from '../ui/Field.jsx';
import { FollowUp } from './FollowUp.jsx';
import { useMeta } from '../../context/MetaContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useRequest } from '../../hooks/useRequest.js';
import { api } from '../../lib/api.js';
import {
  formatDate,
  formatDateTime,
  fromDateInputValue,
  labelFor,
  toDateInputValue,
  todayInputValue,
} from '../../lib/format.js';

const Section = ({ title, action, children }) => (
  <section className="border-t border-line pt-5 first:border-t-0 first:pt-0">
    <div className="mb-3 flex items-center justify-between gap-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{title}</h3>
      {action}
    </div>
    {children}
  </section>
);

const Detail = ({ label, children }) => (
  <div className="flex items-baseline justify-between gap-4 py-1.5">
    <dt className="shrink-0 text-sm text-ink-muted">{label}</dt>
    <dd className="min-w-0 text-right text-sm text-ink">{children}</dd>
  </div>
);

const ACTIVITY_ICONS = {
  created: 'spark',
  status_changed: 'check',
  updated: 'note',
  note: 'note',
  follow_up: 'calendar',
};

const DrawerSkeleton = () => (
  <div className="space-y-6">
    <Skeleton className="h-16 w-full rounded-lg" />
    <Skeleton className="h-24 w-full rounded-lg" />
    <Skeleton className="h-32 w-full rounded-lg" />
  </div>
);

/**
 * Lead detail.
 *
 * Organised into the sections someone actually works through: what the score
 * says, where the lead is in the pipeline, how to reach them, what they asked
 * for, and what has happened so far. Status and follow-up save the moment they
 * change — they are the two things people come in here to do, and making them
 * wait behind a Save button turns a one-click job into three.
 *
 * Editing the underlying fields is a deliberate mode switch, because those
 * change the lead's score.
 */
export const LeadDrawer = ({ leadId, open, onClose, onChanged, onDeleted }) => {
  const { statuses, services, budgets } = useMeta();
  const toast = useToast();

  const { data, error, loading, reload, mutate } = useRequest(
    (options) => (leadId ? api.getLead(leadId, options) : Promise.resolve(null)),
    [leadId],
  );

  const lead = data?.lead ?? null;

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [busyField, setBusyField] = useState('');
  const [note, setNote] = useState('');
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  // Leave edit mode whenever a different lead is opened, so the form can never
  // show one lead's values above another lead's name.
  useEffect(() => {
    setEditing(false);
    setFieldErrors({});
    setNote('');
  }, [leadId]);

  const applyUpdate = (updated) => {
    mutate({ lead: updated });
    onChanged?.(updated);
  };

  const patch = async (changes, { field, successMessage } = {}) => {
    setBusyField(field ?? '');
    try {
      const result = await api.updateLead(lead.id, changes);
      applyUpdate(result.lead);
      if (successMessage) toast.success(successMessage);
      return result.lead;
    } catch (requestError) {
      toast.error(requestError.message);
      return null;
    } finally {
      setBusyField('');
    }
  };

  const startEditing = () => {
    setForm({
      name: lead.name,
      email: lead.email,
      phone: lead.phone ?? '',
      service: lead.service,
      budget: lead.budget,
      message: lead.message ?? '',
    });
    setFieldErrors({});
    setEditing(true);
  };

  const saveEdits = async (event) => {
    event.preventDefault();
    setSaving(true);
    setFieldErrors({});

    try {
      const result = await api.updateLead(lead.id, form);
      applyUpdate(result.lead);
      setEditing(false);
      toast.success('Lead updated successfully');
    } catch (requestError) {
      setFieldErrors(requestError.fieldErrors ?? {});
      if (!requestError.errors?.length) toast.error(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const addNote = async (event) => {
    event.preventDefault();
    if (!note.trim()) return;

    setBusyField('note');
    try {
      const result = await api.addNote(lead.id, note.trim());
      applyUpdate(result.lead);
      setNote('');
      toast.success('Note added');
    } catch (requestError) {
      toast.error(requestError.message);
    } finally {
      setBusyField('');
    }
  };

  const remove = async () => {
    setBusyField('delete');
    try {
      await api.deleteLead(lead.id);
      setConfirmingDelete(false);
      toast.success('Lead deleted');
      onDeleted?.(lead.id);
      onClose();
    } catch (requestError) {
      toast.error(requestError.message);
    } finally {
      setBusyField('');
    }
  };

  const updateField = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
  };

  return (
    <>
      <Drawer
        open={open}
        onClose={onClose}
        title={lead?.name ?? 'Lead'}
        subtitle={lead?.email}
        footer={
          lead ? (
            editing ? (
              <div className="flex items-center justify-end gap-2">
                <Button onClick={() => setEditing(false)} disabled={saving}>
                  Cancel
                </Button>
                <Button variant="primary" icon="check" onClick={saveEdits} loading={saving}>
                  Save changes
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <Button variant="danger" icon="trash" onClick={() => setConfirmingDelete(true)}>
                  Delete
                </Button>
                <div className="flex items-center gap-2">
                  <Button onClick={onClose}>Close</Button>
                  <Button variant="primary" icon="note" onClick={startEditing}>
                    Edit lead
                  </Button>
                </div>
              </div>
            )
          ) : null
        }
      >
        {loading ? (
          <DrawerSkeleton />
        ) : error ? (
          <ErrorState error={error} onRetry={reload} title="We couldn't load this lead" />
        ) : !lead ? null : editing ? (
          <form className="space-y-4" onSubmit={saveEdits} noValidate>
            <p className="rounded-md bg-brand-50 px-3 py-2.5 text-xs text-brand-700">
              Changing the budget, service or message re-scores this lead automatically.
            </p>

            <TextField
              label="Full name"
              required
              error={fieldErrors.name}
              input={{ value: form.name, onChange: updateField('name') }}
            />
            <TextField
              label="Email address"
              required
              error={fieldErrors.email}
              input={{ type: 'email', value: form.email, onChange: updateField('email') }}
            />
            <TextField
              label="Phone number"
              error={fieldErrors.phone}
              input={{ type: 'tel', value: form.phone, onChange: updateField('phone') }}
            />
            <SelectField
              label="Service"
              required
              options={services}
              error={fieldErrors.service}
              input={{ value: form.service, onChange: updateField('service') }}
            />
            <SelectField
              label="Budget range"
              required
              options={budgets}
              error={fieldErrors.budget}
              input={{ value: form.budget, onChange: updateField('budget') }}
            />
            <TextAreaField
              label="Message"
              rows={6}
              error={fieldErrors.message}
              input={{ value: form.message, onChange: updateField('message') }}
            />
          </form>
        ) : (
          <div className="space-y-6">
            <Section title="Lead score">
              <div className="rounded-lg border border-line bg-surface-sunken p-4">
                <ScoreMeter
                  score={lead.score}
                  band={lead.scoreBand}
                  label={labelFor(
                    [
                      { value: 'hot', label: 'Hot' },
                      { value: 'warm', label: 'Warm' },
                      { value: 'cool', label: 'Cool' },
                      { value: 'cold', label: 'Cold' },
                    ],
                    lead.scoreBand,
                  )}
                  size="lg"
                />
                <details className="mt-4 border-t border-line pt-3">
                  <summary className="cursor-pointer list-none text-xs font-medium text-brand-600 hover:text-brand-700">
                    Why this score?
                  </summary>
                  <div className="mt-3">
                    <ScoreBreakdown factors={lead.scoreFactors} />
                  </div>
                </details>
              </div>
            </Section>

            <Section title="Status and follow-up">
              <div className="space-y-3">
                <div>
                  <label className="field-label" htmlFor="lead-status">
                    Status
                  </label>
                  <span className="relative block">
                    <select
                      id="lead-status"
                      className="field-control appearance-none pr-9"
                      value={lead.status}
                      disabled={busyField === 'status'}
                      onChange={(event) =>
                        patch(
                          { status: event.target.value },
                          { field: 'status', successMessage: 'Lead status updated' },
                        )
                      }
                    >
                      {statuses.map((status) => (
                        <option key={status.value} value={status.value}>
                          {status.label}
                        </option>
                      ))}
                    </select>
                    <Icon
                      name="chevronRight"
                      className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 rotate-90 text-ink-muted"
                    />
                  </span>
                </div>

                <div>
                  <label className="field-label" htmlFor="lead-follow-up">
                    Follow-up date
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      id="lead-follow-up"
                      type="date"
                      className="field-control"
                      min={todayInputValue()}
                      value={toDateInputValue(lead.followUpAt)}
                      disabled={busyField === 'followUp'}
                      onChange={(event) =>
                        patch(
                          { followUpAt: fromDateInputValue(event.target.value) },
                          {
                            field: 'followUp',
                            successMessage: event.target.value
                              ? 'Follow-up scheduled'
                              : 'Follow-up cleared',
                          },
                        )
                      }
                    />
                    {lead.followUpAt ? (
                      <Button
                        onClick={() =>
                          patch(
                            { followUpAt: null },
                            { field: 'followUp', successMessage: 'Follow-up cleared' },
                          )
                        }
                        className="h-9 shrink-0 px-2.5 text-xs"
                      >
                        Clear
                      </Button>
                    ) : null}
                  </div>
                  <p className="field-hint">
                    <FollowUp date={lead.followUpAt} status={lead.status} />
                  </p>
                </div>
              </div>
            </Section>

            <Section title="Contact information">
              <dl className="divide-y divide-line">
                <Detail label="Email">
                  <a className="text-brand-600 hover:text-brand-700" href={`mailto:${lead.email}`}>
                    {lead.email}
                  </a>
                </Detail>
                <Detail label="Phone">
                  {lead.phone ? (
                    <a className="text-brand-600 hover:text-brand-700" href={`tel:${lead.phone}`}>
                      {lead.phone}
                    </a>
                  ) : (
                    <span className="text-ink-muted">Not provided</span>
                  )}
                </Detail>
              </dl>
            </Section>

            <Section title="Project information">
              <dl className="divide-y divide-line">
                <Detail label="Service">{labelFor(services, lead.service)}</Detail>
                <Detail label="Budget">{labelFor(budgets, lead.budget)}</Detail>
                <Detail label="Source">
                  <SourceBadge source={lead.source} />
                </Detail>
                <Detail label="Received">{formatDate(lead.createdAt)}</Detail>
                {lead.origin?.pageUrl ? (
                  <Detail label="Submitted from">
                    <span className="break-all text-xs text-ink-muted">{lead.origin.pageUrl}</span>
                  </Detail>
                ) : null}
              </dl>

              {/* The message is the only long-form content here, so it gets its
                  own readable block rather than being crammed into the list. */}
              {lead.message ? (
                <div className="mt-3 rounded-lg border border-line bg-surface-sunken p-3.5">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-soft">
                    {lead.message}
                  </p>
                </div>
              ) : (
                <p className="mt-3 text-sm text-ink-muted">They did not leave a message.</p>
              )}
            </Section>

            <Section title="Activity">
              <form className="mb-4 flex items-start gap-2" onSubmit={addNote}>
                <label className="sr-only" htmlFor="lead-note">
                  Add a note
                </label>
                <input
                  id="lead-note"
                  className="field-control"
                  placeholder="Add a note — called, emailed, quoted…"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  maxLength={1000}
                />
                <Button
                  type="submit"
                  variant="secondary"
                  loading={busyField === 'note'}
                  disabled={!note.trim()}
                  className="shrink-0"
                >
                  Add
                </Button>
              </form>

              <ol className="space-y-3.5">
                {lead.activity.map((entry) => (
                  <li key={entry.id} className="flex gap-3">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-ink-muted ring-1 ring-line">
                      <Icon name={ACTIVITY_ICONS[entry.type] ?? 'note'} className="h-3 w-3" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm text-ink">{entry.message}</span>
                      <span className="mt-0.5 block text-xs text-ink-muted">
                        {entry.actor} · {formatDateTime(entry.at)}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            </Section>
          </div>
        )}
      </Drawer>

      <Modal
        open={confirmingDelete}
        onClose={() => setConfirmingDelete(false)}
        title="Delete this lead?"
        description="This removes the lead from the CRM. The original submission stays in WordPress."
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button onClick={() => setConfirmingDelete(false)}>Keep it</Button>
            <Button variant="danger" icon="trash" onClick={remove} loading={busyField === 'delete'}>
              Delete lead
            </Button>
          </div>
        }
      >
        <p className="text-sm text-ink-soft">
          {lead?.name} and everything recorded against them here will be removed. This cannot be
          undone.
        </p>
      </Modal>
    </>
  );
};
