// Form Elements Types

import React from 'react';
import { BaseComponentProps, FormFieldConfig, ValidationRule } from '../../../shared/types';
import { NormalizedOption } from '../utils/option-normalizer';
import { SortType } from '@/gradian-ui/shared/utils/sort-utils';

export interface FormElementProps {
  config: any;
  value?: any;
  onChange?: (value: any) => void;
  onBlur?: () => void;
  onFocus?: () => void;
  error?: string;
  touched?: boolean;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

export interface TextInputProps extends FormElementProps {
  placeholder?: string;
  maxLength?: number;
  minLength?: number;
  pattern?: string;
  canCopy?: boolean;
}

export interface NameInputProps extends TextInputProps {
  forbiddenSymbolsMessage?: string;
  isCustomizable?: boolean;
  customMode?: boolean;
  defaultCustomMode?: boolean;
  onCustomModeChange?: (isCustom: boolean) => void;
  customizeDisabled?: boolean;
  helperText?: string;
}

export interface SearchInputProps extends FormElementProps {
  placeholder?: string;
  maxLength?: number;
  minLength?: number;
  pattern?: string;
  onClear?: () => void;
  onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
}

export interface NumberInputProps extends FormElementProps {
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  precision?: number;
  canCopy?: boolean;
}

export interface SliderProps extends FormElementProps {
  min?: number;
  max?: number;
  step?: number;
}

export interface SelectInputProps extends FormElementProps {
  options: Array<{ label: string; value: any; disabled?: boolean; icon?: string; color?: string }>;
  multiple?: boolean;
  searchable?: boolean;
  clearable?: boolean;
}

export interface TextareaProps extends FormElementProps {
  rows?: number;
  cols?: number;
  resize?: 'none' | 'both' | 'horizontal' | 'vertical';
  maxLength?: number;
  canCopy?: boolean;
  aiAgentId?: string;
  enableVoiceInput?: boolean;
  loadingTextSwitches?: string | string[];
}

export interface CheckboxProps extends FormElementProps {
  checked?: boolean;
  indeterminate?: boolean;
}

export interface SwitchProps extends FormElementProps {
  checked?: boolean;
}

export interface ToggleProps extends FormElementProps {
  pressed?: boolean;
  onLabel?: string;
  offLabel?: string;
}

export interface ToggleGroupOption {
  id: string;
  label: string;
  icon?: string;
  color?: string;
  disabled?: boolean;
}

export interface ToggleGroupProps extends FormElementProps {
  value?: string | string[] | null;
  defaultValue?: string | string[];
  type?: 'single' | 'multiple' | 'multi';
  options?: ToggleGroupOption[];
  orientation?: 'horizontal' | 'vertical';
  size?: 'sm' | 'md' | 'lg';
  selectionBehavior?: 'force' | 'default';
  onNormalizedChange?: (selection: NormalizedOption[]) => void;
  /**
   * URL to fetch options from (overrides options prop if provided)
   */
  sourceUrl?: string;
  /**
   * Query parameters to append to sourceUrl
   */
  queryParams?: Record<string, string | number | boolean | string[]>;
  /**
   * Transform function to convert API response to option format
   */
  transform?: (data: any) => Array<{ id?: string; label?: string; name?: string; title?: string; icon?: string; color?: string; disabled?: boolean; value?: string }>;
  /**
   * Sort order for options: 'ASC' (ascending), 'DESC' (descending), or null (no sorting, default)
   */
  sortType?: SortType;
}

export interface RadioProps extends FormElementProps {
  options?: Array<{ id: string; label: string; disabled?: boolean }>;
  direction?: 'horizontal' | 'vertical';
  /**
   * URL to fetch options from (overrides options prop if provided)
   */
  sourceUrl?: string;
  /**
   * Query parameters to append to sourceUrl
   */
  queryParams?: Record<string, string | number | boolean | string[]>;
  /**
   * Transform function to convert API response to option format
   */
  transform?: (data: any) => Array<{ id?: string; label?: string; name?: string; title?: string; icon?: string; color?: string; disabled?: boolean; value?: string }>;
  /**
   * Sort order for options: 'ASC' (ascending), 'DESC' (descending), or null (no sorting, default)
   */
  sortType?: SortType;
}

export interface DateInputProps extends FormElementProps {
  placeholder?: string;
  min?: string;
  max?: string;
  format?: string;
}

export interface FileInputProps extends FormElementProps {
  accept?: string;
  multiple?: boolean;
  maxFileSize?: number; // in bytes
  onFileSelect?: (files: FileList) => void;
}

export interface FormElementConfig extends FormFieldConfig {
  component: 'text' | 'email' | 'password' | 'number' | 'select' | 'textarea' | 'checkbox' | 'checkbox-list' | 'radio' | 'date' | 'file' | 'picker' | 'toggle' | 'toggle-group' | 'language-selector';
  required?: boolean;
  metadata?: {
    allowMultiselect?: boolean;
    [key: string]: any;
  };
  layout?: {
    width?: string;
    order?: number;
    hidden?: boolean;
  };
  styling?: {
    variant?: 'default' | 'outlined' | 'filled';
    size?: 'sm' | 'md' | 'lg';
    color?: 'primary' | 'secondary' | 'success' | 'error' | 'warning';
  };
  behavior?: {
    autoFocus?: boolean;
    autoComplete?: string;
    readOnly?: boolean;
    disabled?: boolean;
  };
}

export interface FormElementValidation {
  rules: ValidationRule;
  message?: string;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
}

export interface FormElementState {
  value: any;
  error: string | null;
  touched: boolean;
  focused: boolean;
  dirty: boolean;
}

export interface FormElementRef {
  focus: () => void;
  blur: () => void;
  validate: () => boolean;
  reset: () => void;
  getValue: () => any;
  setValue: (value: any) => void;
}

export interface OTPInputProps extends Omit<FormElementProps, 'config'> {
  config?: any;
  resendDuration?: number;
  resendButtonLabel?: string;
  autoStartTimer?: boolean;
  onResend?: () => Promise<void> | void;
  maxLength?: number;
  separatorIndex?: number | null;
  label?: string;
  description?: string;
  children?: React.ReactNode;
}

// Badge Component Types
export interface BadgeProps extends BaseComponentProps {
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  color?: string; // Tailwind color name for pastel styling (e.g., 'violet', 'emerald', 'yellow', 'cyan')
  tooltip?: string; // Tooltip text to display on hover
  children: React.ReactNode;
}

// Button Component Types
export interface ButtonProps extends BaseComponentProps {
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'outline' | 'ghost' | 'link';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  children: React.ReactNode;
  onClick?: React.MouseEventHandler<HTMLButtonElement> | (() => void);
  disabled?: boolean;
  loading?: boolean;
  type?: 'button' | 'submit' | 'reset';
  href?: string;
  canOpenInNewTab?: boolean;
}

// Input Component Types
export interface InputProps extends BaseComponentProps {
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyPress?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  type?: string;
}

// Select Component Types
export interface SelectProps extends BaseComponentProps {
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  value?: any;
  onValueChange?: (value: any) => void;
  disabled?: boolean;
  children?: React.ReactNode;
}

// Avatar Component Types
export interface AvatarProps extends BaseComponentProps {
  src?: string;
  alt?: string;
  fallback: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
}

// Label Component Types
export interface LabelProps extends BaseComponentProps {
  htmlFor?: string;
  required?: boolean;
  error?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}
