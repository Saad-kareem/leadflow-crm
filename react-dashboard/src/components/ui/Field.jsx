import { useId } from 'react';
import { Icon } from './Icon.jsx';

/**
 * A labelled form control.
 *
 * The label, the hint and the error are wired to the input with real `for`,
 * `aria-describedby` and `aria-invalid` attributes, so a screen reader
 * announces "Email address, invalid, please enter a valid email address"
 * rather than reading a red sentence that floats unattached somewhere nearby.
 */
export const Field = ({ label, hint, error, required = false, children }) => {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div>
      <label className="field-label" htmlFor={id}>
        {label}
        {required ? (
          <span className="text-danger-fg" aria-hidden="true">
            {' '}
            *
          </span>
        ) : (
          <span className="ml-1.5 text-xs font-normal text-ink-muted">optional</span>
        )}
      </label>

      {children({
        id,
        'aria-describedby': [hintId, errorId].filter(Boolean).join(' ') || undefined,
        'aria-invalid': error ? true : undefined,
        className: `field-control ${error ? 'field-control-error' : ''}`,
      })}

      {hint && !error ? (
        <p className="field-hint" id={hintId}>
          {hint}
        </p>
      ) : null}

      {error ? (
        <p className="field-error" id={errorId}>
          {error}
        </p>
      ) : null}
    </div>
  );
};

export const TextField = (props) => (
  <Field {...props}>{(controlProps) => <input type="text" {...controlProps} {...props.input} />}</Field>
);

/**
 * The native arrow differs on every platform, so it is replaced with the same
 * chevron the filter bar uses — otherwise a select in a form and a select in
 * the toolbar look like two different controls.
 */
export const SelectField = ({ options, placeholder, ...props }) => (
  <Field {...props}>
    {(controlProps) => (
      <span className="relative block">
        <select
          {...controlProps}
          {...props.input}
          className={`${controlProps.className} appearance-none pr-9`}
        >
          {placeholder ? <option value="">{placeholder}</option> : null}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <Icon
          name="chevronRight"
          className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 rotate-90 text-ink-muted"
        />
      </span>
    )}
  </Field>
);

export const TextAreaField = ({ rows = 4, ...props }) => (
  <Field {...props}>
    {(controlProps) => <textarea rows={rows} {...controlProps} {...props.input} />}
  </Field>
);
