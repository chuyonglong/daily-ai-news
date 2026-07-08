"use client";

type AutoSubmitSelectProps = {
  name: string;
  value: string;
  label: string;
  options: Array<{ value: string; label: string }>;
  className?: string;
};

export function AutoSubmitSelect({ name, value, label, options, className }: AutoSubmitSelectProps) {
  return (
    <label className={className}>
      <span>{label}</span>
      <select
        name={name}
        defaultValue={value}
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
      >
        {options.map((option) => (
          <option value={option.value} key={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
