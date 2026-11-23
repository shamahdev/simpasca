"use client";

import { FieldError, Label, ListBox, Select } from "@heroui/react";

/** Form select over a fixed list of [value, label] options; controlled when `onChange` is given. */
export function OptionSelect<T extends string>({
  name,
  label,
  placeholder,
  options,
  defaultValue,
  value,
  onChange,
  isRequired = true,
  isDisabled,
}: {
  name: string;
  label: string;
  placeholder: string;
  options: [T, string][];
  defaultValue?: T;
  value?: T;
  onChange?: (value: T) => void;
  isRequired?: boolean;
  isDisabled?: boolean;
}) {
  return (
    <Select
      name={name}
      isRequired={isRequired}
      isDisabled={isDisabled}
      placeholder={placeholder}
      defaultValue={defaultValue}
      {...(onChange && { value: value ?? null, onChange: (key) => onChange(key as T) })}
    >
      <Label>{label}</Label>
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <FieldError />
      <Select.Popover>
        <ListBox>
          {options.map(([id, text]) => (
            <ListBox.Item key={id} id={id} textValue={text}>
              {text}
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}
