import React, { useState } from 'react';

export function Input({
  label, id, type = 'text', placeholder, value, onChange, helper, error,
  required = false, disabled = false, tone = 'light', iconLeft, multiline = false, rows = 4
}) {
  const [focus, setFocus] = useState(false);
  const dark = tone === 'dark';
  const fieldId = id || (label ? 'f-' + String(label).toLowerCase().replace(/[^a-z0-9]+/g, '-') : undefined);
  const border = error ? 'var(--nhr-danger)' : focus ? 'var(--nhr-turquoise)' : (dark ? 'var(--border-dark)' : 'var(--border-subtle)');
  const field = {
    width: '100%', fontFamily: 'var(--font-core)', fontSize: 'var(--text-body-sm)',
    lineHeight: 'var(--lh-snug)', color: dark ? 'var(--text-heading-dark)' : 'var(--text-heading)',
    background: disabled ? (dark ? 'rgba(255,255,255,.03)' : 'var(--nhr-light)') : (dark ? 'rgba(255,255,255,.04)' : 'var(--nhr-white)'),
    border: '1px solid ' + border, borderRadius: 'var(--radius-btn)',
    padding: iconLeft ? '13px 14px 13px 42px' : '13px 14px',
    boxShadow: focus && !error ? '0 0 0 3px rgba(0,229,212,.20)' : 'none',
    outline: 'none', transition: 'border-color var(--dur-base) var(--ease-out), box-shadow var(--dur-base) var(--ease-out)',
    resize: multiline ? 'vertical' : undefined, opacity: disabled ? 0.6 : 1
  };
  const Tag = multiline ? 'textarea' : 'input';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {label && (
        <label htmlFor={fieldId} style={{
          fontSize: 'var(--text-caption)', fontWeight: 'var(--fw-semibold)',
          letterSpacing: 'var(--tracking-normal)',
          color: dark ? 'var(--text-body-dark)' : 'var(--text-heading)'
        }}>{label}{required && <span style={{ color: 'var(--nhr-turquoise-deep)' }}> *</span>}</label>
      )}
      <div style={{ position: 'relative', display: 'flex' }}>
        {iconLeft && <span style={{ position: 'absolute', left: 14, top: 13, color: 'var(--text-muted)' }}>{iconLeft}</span>}
        <Tag
          id={fieldId} type={multiline ? undefined : type} rows={multiline ? rows : undefined}
          placeholder={placeholder} value={value} onChange={onChange}
          required={required} disabled={disabled}
          aria-invalid={error ? true : undefined}
          onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
          style={field}
        />
      </div>
      {(error || helper) && (
        <span style={{ fontSize: 'var(--text-caption)', color: error ? 'var(--nhr-danger)' : (dark ? 'var(--text-muted-dark)' : 'var(--text-muted)') }}>{error || helper}</span>
      )}
    </div>
  );
}
