import { UI_COLORS } from '@/lib/brand';

const C = UI_COLORS;

interface FormFieldProps {
  label: string | React.ReactNode;
  error?: string;
  children: React.ReactNode;
  helperText?: string;
  required?: boolean;
  id?: string;
}

export function FormField({ label, error, children, helperText, required, id }: FormFieldProps) {
  const errorId = id ? `${id}-error` : undefined;
  const helperId = id ? `${id}-helper` : undefined;

  return (
    <div>
      <label htmlFor={id} style={{
        display: 'block',
        fontSize: '0.875rem',
        fontWeight: '600',
        color: C.primary,
        marginBottom: '0.4rem'
      }}>
        {label}
        {required && <span style={{ color: C.error }} aria-label="required">*</span>}
      </label>
      {children}
      {error && (
        <p id={errorId} role="alert" style={{
          fontSize: '0.75rem',
          color: C.error,
          marginTop: '0.3rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.25rem'
        }}>
          ⚠ {error}
        </p>
      )}
      {helperText && !error && (
        <p id={helperId} style={{
          fontSize: '0.75rem',
          color: C.gray500,
          marginTop: '0.3rem',
          lineHeight: 1.4
        }}>
          {helperText}
        </p>
      )}
    </div>
  );
}

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export function FormInput({ error, style, id, ...props }: FormInputProps) {
  const ariaDescribedBy = props['aria-describedby']
    ? `${props['aria-describedby']}${id ? ` ${id}-error` : ''}`
    : (id ? `${id}-error` : undefined);

  return (
    <input
      id={id}
      {...props}
      aria-describedby={ariaDescribedBy}
      aria-invalid={!!error}
      style={{
        width: '100%',
        padding: '0.75rem 1rem',
        border: error ? '1.5px solid #ef4444' : '1.5px solid #e5e7eb',
        borderRadius: '0.5rem',
        fontSize: '0.9rem',
        outline: 'none',
        boxSizing: 'border-box',
        color: C.primary,
        transition: 'border-color 0.2s',
        ...style,
      }}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = error ? '#ef4444' : C.accent;
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = error ? '#ef4444' : '#e5e7eb';
      }}
    />
  );
}

interface FormSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: string;
  options: Array<{ value: string; label: string }>;
}

export function FormSelect({ error, options, style, ...props }: FormSelectProps) {
  return (
    <select
      {...props}
      style={{
        width: '100%',
        padding: '0.75rem 1rem',
        border: error ? '1.5px solid #ef4444' : '1.5px solid #e5e7eb',
        borderRadius: '0.5rem',
        fontSize: '0.9rem',
        color: C.primary,
        background: 'white',
        outline: 'none',
        boxSizing: 'border-box',
        transition: 'border-color 0.2s',
        ...style,
      }}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = error ? '#ef4444' : C.accent;
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = error ? '#ef4444' : '#e5e7eb';
      }}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
