import { useState } from 'react';
import { Button } from '../ui/Button.jsx';
import { Icon } from '../ui/Icon.jsx';
import { Modal } from '../ui/Overlay.jsx';
import { Field, SelectField, TextAreaField, TextField } from '../ui/Field.jsx';
import { useMeta } from '../../context/MetaContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { api } from '../../lib/api.js';
import { fromDateInputValue, todayInputValue } from '../../lib/format.js';

/**
 * A titled group of fields.
 *
 * A plain heading rather than a fieldset legend: legends are positioned
 * against the fieldset's own border box, which collides with the divider rule
 * between groups and renders differently across browsers.
 */
const FormSection = ({ title, divided = false, children }) => (
  <section className={divided ? 'border-t border-line pt-5' : undefined}>
    <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-muted">{title}</h3>
    <div className="space-y-4">{children}</div>
  </section>
);

const EMPTY = {
  name: '',
  email: '',
  phone: '',
  service: '',
  budget: '',
  message: '',
  followUpAt: '',
};

/**
 * Add a lead by hand — for the ones that arrive by phone or at an event.
 *
 * The fields are grouped the way they are asked for in a conversation rather
 * than packed into one row: who they are, then what they want, then when to
 * chase them. Validation messages come from the API, so this form and the
 * WordPress form enforce exactly the same rules.
 */
export const CreateLeadModal = ({ open, onClose, onCreated, onOpenExisting }) => {
  const { services, budgets } = useMeta();
  const toast = useToast();

  const [form, setForm] = useState(EMPTY);
  const [fieldErrors, setFieldErrors] = useState({});
  const [duplicate, setDuplicate] = useState(null);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const close = () => {
    setForm(EMPTY);
    setFieldErrors({});
    setDuplicate(null);
    setFormError('');
    onClose();
  };

  const update = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
    setDuplicate(null);
    setFormError('');
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setFieldErrors({});
    setDuplicate(null);
    setFormError('');

    try {
      const result = await api.createLead({
        ...form,
        followUpAt: fromDateInputValue(form.followUpAt),
      });

      toast.success('Lead created successfully');
      onCreated?.(result.lead);
      close();
    } catch (error) {
      // A 409 is not really an error — it means the work is already done, and
      // the most useful thing this form can do is offer the lead that exists.
      if (error.status === 409 && error.data?.existingLead) {
        setDuplicate(error.data.existingLead);
      } else if (error.errors?.length) {
        setFieldErrors(error.fieldErrors);
      } else {
        setFormError(error.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Add a lead"
      description="For enquiries that came in by phone, email or in person."
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button onClick={close} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" icon="check" onClick={onSubmit} loading={submitting}>
            {submitting ? 'Creating lead' : 'Create lead'}
          </Button>
        </div>
      }
    >
      <form className="space-y-5" onSubmit={onSubmit} noValidate>
        {formError ? (
          <div className="flex items-start gap-2.5 rounded-md bg-danger-bg px-3 py-2.5 text-sm text-danger-fg" role="alert">
            <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{formError}</span>
          </div>
        ) : null}

        {duplicate ? (
          <div className="rounded-md border border-contacted-dot/30 bg-contacted-bg px-3 py-2.5" role="alert">
            <p className="text-sm font-medium text-contacted-fg">This lead is already in the CRM</p>
            <p className="mt-1 text-sm text-contacted-fg/90">
              {duplicate.name} ({duplicate.email}) was added earlier with the same email address or
              phone number.
            </p>
            <button
              type="button"
              onClick={() => {
                onOpenExisting?.(duplicate.id);
                close();
              }}
              className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-contacted-fg underline underline-offset-2"
            >
              Open the existing lead
              <Icon name="chevronRight" className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : null}

        <FormSection title="Contact">

          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="Full name"
              required
              error={fieldErrors.name}
              input={{
                value: form.name,
                onChange: update('name'),
                placeholder: 'Ali Khan',
                autoComplete: 'off',
              }}
            />
            <TextField
              label="Email address"
              required
              error={fieldErrors.email}
              input={{
                type: 'email',
                value: form.email,
                onChange: update('email'),
                placeholder: 'ali@company.com',
                autoComplete: 'off',
              }}
            />
          </div>

          <TextField
            label="Phone number"
            hint="Helps the score — a lead you can call is worth more than one you can only email."
            error={fieldErrors.phone}
            input={{
              type: 'tel',
              value: form.phone,
              onChange: update('phone'),
              placeholder: '+92 300 1234567',
              autoComplete: 'off',
            }}
          />
        </FormSection>

        <FormSection title="Project" divided>

          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              label="Service"
              required
              options={services}
              placeholder="Choose a service"
              error={fieldErrors.service}
              input={{ value: form.service, onChange: update('service') }}
            />
            <SelectField
              label="Budget range"
              required
              options={budgets}
              placeholder="Choose a range"
              error={fieldErrors.budget}
              input={{ value: form.budget, onChange: update('budget') }}
            />
          </div>

          <TextAreaField
            label="What do they need?"
            rows={4}
            hint="Detail here raises the lead score, so paste in what they actually told you."
            error={fieldErrors.message}
            input={{
              value: form.message,
              onChange: update('message'),
              placeholder: 'What are they building, and when do they need it live?',
            }}
          />
        </FormSection>

        <FormSection title="Follow-up" divided>

          <Field label="Chase them on" hint="Leave blank if you have not agreed a date yet.">
            {(controlProps) => (
              <input
                type="date"
                min={todayInputValue()}
                value={form.followUpAt}
                onChange={update('followUpAt')}
                {...controlProps}
              />
            )}
          </Field>
        </FormSection>
      </form>
    </Modal>
  );
};
