// Form Wrapper Types

import { BaseComponentProps, FormFieldConfig } from '../../../shared/types';
import { FormElementConfig } from '../../form-elements/types';

export interface FormWrapperProps extends BaseComponentProps {
  config: FormConfig;
  onSubmit?: (data: Record<string, any>) => void;
  onReset?: () => void;
  onFieldChange?: (fieldName: string, value: any) => void;
  initialValues?: Record<string, any>;
  validationMode?: 'onChange' | 'onBlur' | 'onSubmit';
  disabled?: boolean;
  /**
   * Reference entity data to support dynamic defaultValue replacement.
   */
  referenceEntityData?: Record<string, any>;
}

export interface FormConfig {
  id: string;
  name: string;
  title?: string;
  description?: string;
  fields: FormElementConfig[];
  layout?: {
    columns?: number;
    gap?: number;
    direction?: 'row' | 'column';
  };
  actions?: {
    submit?: {
      label: string;
      variant?: 'primary' | 'secondary' | 'danger';
      disabled?: boolean;
    };
    reset?: {
      label: string;
      variant?: 'primary' | 'secondary' | 'danger';
      disabled?: boolean;
    };
    cancel?: {
      label: string;
      variant?: 'primary' | 'secondary' | 'danger';
      disabled?: boolean;
      onClick?: () => void;
    };
  };
  validation?: {
    mode?: 'onChange' | 'onBlur' | 'onSubmit';
    showErrors?: boolean;
    showSuccess?: boolean;
  };
  styling?: {
    variant?: 'default' | 'card' | 'minimal';
    size?: 'sm' | 'md' | 'lg';
    spacing?: 'compact' | 'normal' | 'relaxed';
  };
}

export interface FormHeaderProps extends BaseComponentProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
}

export interface FormContentProps extends BaseComponentProps {
  fields: FormElementConfig[];
  values: Record<string, any>;
  errors: Record<string, string>;
  onChange: (fieldName: string, value: any) => void;
  onBlur: (fieldName: string) => void;
  onFocus: (fieldName: string) => void;
  disabled?: boolean;
  layout?: {
    columns?: number;
    gap?: number;
    direction?: 'row' | 'column';
  };
}

export interface FormFooterProps extends BaseComponentProps {
  actions?: FormActionProps[] | {
    submit?: {
      label: string;
      variant?: 'primary' | 'secondary' | 'danger';
      disabled?: boolean;
    };
    reset?: {
      label: string;
      variant?: 'primary' | 'secondary' | 'danger';
      disabled?: boolean;
    };
    cancel?: {
      label: string;
      variant?: 'primary' | 'secondary' | 'danger';
      disabled?: boolean;
      onClick?: () => void;
    };
  };
  showReset?: boolean;
  showCancel?: boolean;
  onSubmit?: () => void;
  onReset?: () => void;
  onCancel?: () => void;
  disabled?: boolean;
  loading?: boolean;
}

export interface FormActionProps {
  type: 'submit' | 'reset' | 'cancel' | 'custom';
  label: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  icon?: React.ReactNode;
}

export interface FormActionsProps extends BaseComponentProps, Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
  actions: FormActionProps[];
  direction?: 'row' | 'column';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around';
  align?: 'start' | 'center' | 'end' | 'stretch';
  spacing?: 'sm' | 'md' | 'lg';
}

export interface FormState {
  values: Record<string, any>;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  dirty: boolean;
  isValid: boolean;
  isSubmitting: boolean;
}

export interface FormContextType {
  state: FormState;
  actions: {
    setValue: (fieldName: string, value: any) => void;
    setError: (fieldName: string, error: string) => void;
    setTouched: (fieldName: string, touched: boolean) => void;
    validateField: (fieldName: string) => boolean;
    validateForm: () => boolean;
    reset: () => void;
    submit: () => void;
  };
  config: FormConfig;
}
