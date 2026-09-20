import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { Button } from '../components/ui/Button.jsx';
import { TextField } from '../components/ui/Field.jsx';
import { Icon } from '../components/ui/Icon.jsx';

/**
 * Sign in.
 *
 * Field errors sit under their field; the "those details do not match"
 * response has no field to sit under, so it goes in a summary above the form.
 * The API deliberately does not say which of the two was wrong, and neither
 * does this screen.
 */
export const LoginPage = () => {
  const { signIn } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const update = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setFormError('');
    setFieldErrors({});

    try {
      await signIn(form);
    } catch (error) {
      setFieldErrors(error.fieldErrors ?? {});
      // Only surface the summary when there is nothing field-level to show,
      // so the same problem is never reported twice on one screen.
      if (!error.errors?.length) setFormError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col justify-center px-4 py-12">
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-7 flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500 text-white">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
              <path d="M6 5v14h12" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M9.5 14.5 13 10l2.5 2.5L19 7" stroke="#a9c0ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="text-lg font-semibold tracking-tight">LeadFlow</span>
        </div>

        <div className="card p-6">
          <h1 className="text-lg font-semibold tracking-tight text-ink">Sign in</h1>
          <p className="mt-1 text-sm text-ink-soft">Manage the leads coming in from your website.</p>

          {formError ? (
            <div
              className="mt-5 flex items-start gap-2.5 rounded-md bg-danger-bg px-3 py-2.5 text-sm text-danger-fg"
              role="alert"
            >
              <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{formError}</span>
            </div>
          ) : null}

          <form className="mt-5 space-y-4" onSubmit={onSubmit} noValidate>
            <TextField
              label="Email address"
              required
              error={fieldErrors.email}
              input={{
                type: 'email',
                value: form.email,
                onChange: update('email'),
                placeholder: 'you@agency.com',
                autoComplete: 'username',
                autoFocus: true,
              }}
            />

            <TextField
              label="Password"
              required
              error={fieldErrors.password}
              input={{
                type: 'password',
                value: form.password,
                onChange: update('password'),
                placeholder: '••••••••',
                autoComplete: 'current-password',
              }}
            />

            <Button type="submit" variant="primary" loading={submitting} className="w-full">
              {submitting ? 'Signing in' : 'Sign in'}
            </Button>
          </form>
        </div>

        <p className="mt-4 text-center text-xs text-ink-muted">
          Use the admin account created by the API&apos;s seed script.
        </p>
      </div>
    </div>
  );
};
