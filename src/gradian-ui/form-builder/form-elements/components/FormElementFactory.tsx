// Form Element Factory Component

import React from 'react';
import { FormElementConfig, FormElementProps, ToggleGroupOption } from '../types';
import { FormField } from '@/gradian-ui/schema-manager/types/form-schema';
import { TextInput } from './TextInput';
import { Textarea } from './Textarea';
import { Checkbox } from './Checkbox';
import { CheckboxList } from './CheckboxList';
import { RadioGroup } from './RadioGroup';
import { Select } from './Select';
import { NormalizedOption, normalizeOptionArray } from '../utils/option-normalizer';
import { ImageText } from './ImageText';
import { Button } from './Button';
import { Input } from './Input';
import { Avatar } from './Avatar';
import { ColorPicker } from './ColorPicker';
import { Rating } from './Rating';
import { Badge } from './Badge';
import { Countdown } from './Countdown';
import { EmailInput } from './EmailInput';
import { URLInput } from './URLInput';
import { PhoneInput } from './PhoneInput';
import { PasswordInput } from './PasswordInput';
import { NumberInput } from './NumberInput';
import { DateInput } from './DateInput';
import { DateTimeInput } from './DateTimeInput';
import { FileInput } from './FileInput';
import { PickerInput } from './PickerInput';
import { IconInput } from './IconInput';
import { Toggle } from './Toggle';
import { ToggleGroup } from './ToggleGroup';
import { UnknownControl } from './UnknownControl';
import { OTPInput } from './OTPInput';
import { NameInput } from './NameInput';
import { ListInput } from './ListInput';
import { TagInput } from './TagInput';

// Support both config-based and field-based interfaces
export interface FormElementFactoryProps extends Omit<FormElementProps, 'config' | 'touched'> {
  config?: any;
  field?: FormField;
  touched?: boolean | boolean[];
  tabIndex?: number;
}

export const FormElementFactory: React.FC<FormElementFactoryProps> = (props) => {
  // Support both config and field interfaces
  const isFieldInterface = !!props.field;
  
  let config: any;
  let restProps: any;
  
  if (isFieldInterface) {
    // Convert field to config format
    const { field, value, error, touched, onChange, onBlur, onFocus, disabled, ...otherProps } = props;
    config = field;
    // Merge disabled from field.disabled with passed disabled prop
    const fieldDisabled = field?.disabled;
    const mergedDisabled = disabled || (typeof fieldDisabled === 'string' ? fieldDisabled === 'true' : Boolean(fieldDisabled)) || false;
    restProps = {
      value,
      error,
      touched,
      onChange,
      onBlur,
      onFocus,
      disabled: mergedDisabled,
      ...otherProps,
    };
    // Prioritize field.required over field.validation?.required
    const derivedRequired = field?.required ?? field?.validation?.required ?? false;
    if (typeof restProps.required === 'undefined') {
      restProps.required = derivedRequired;
    }
  } else {
    // Use config directly
    const { config: configProp, ...otherProps } = props;
    config = configProp;
    // Merge disabled from config.disabled with passed disabled prop
    const configDisabled = configProp?.disabled;
    const mergedDisabled = (otherProps as any).disabled || (typeof configDisabled === 'string' ? configDisabled === 'true' : Boolean(configDisabled)) || false;
    restProps = {
      ...otherProps,
      disabled: mergedDisabled,
    };
    // Prioritize config.required over config.validation?.required
    const derivedRequired =
      configProp?.required ??
      configProp?.validation?.required ??
      false;
    if (typeof restProps.required === 'undefined') {
      restProps.required = derivedRequired;
    }
  }

  if (!config) {
    console.error('FormElementFactory: config or field is required', props);
    return null;
  }

  // Skip inactive fields (don't render them)
  if ((config as any).inactive === true) {
    return null;
  }

  // Use component if available, otherwise fall back to type
  const elementType = (config as any).component || config.type;
  
  // Extract canCopy from config or restProps if it exists
  const canCopy = Boolean((config as any)?.canCopy ?? (restProps as any)?.canCopy ?? false);
  
  // Extract tabIndex from props or restProps
  const tabIndex = props.tabIndex ?? (restProps as any)?.tabIndex;
  
  // Remove canCopy and tabIndex from restProps to avoid conflicts when we explicitly pass them
  const { canCopy: _, tabIndex: __, ...restPropsWithoutCanCopy } = restProps;

  // Common props to pass to all form elements
  const commonProps = {
    ...restPropsWithoutCanCopy,
    tabIndex,
  };

  switch (elementType) {
    case 'text':
      return <TextInput config={config} {...commonProps} canCopy={canCopy} />;
    
    case 'email':
      return <EmailInput config={config} {...commonProps} canCopy={canCopy} />;
    
    case 'url':
    case 'url-input':
      return <URLInput config={config} {...commonProps} canCopy={canCopy} />;
    
    case 'phone':
    case 'tel':
      return <PhoneInput config={config} {...commonProps} canCopy={canCopy} />;
    
    case 'password':
      return <PasswordInput config={config} {...commonProps} />;

    case 'name':
      return (
        <NameInput
          config={config}
          {...commonProps}
          canCopy={canCopy}
          isCustomizable={(restProps as any)?.isCustomizable ?? (config as any)?.isCustomizable}
          customMode={(restProps as any)?.customMode ?? (config as any)?.customMode}
          defaultCustomMode={(restProps as any)?.defaultCustomMode ?? (config as any)?.defaultCustomMode}
          onCustomModeChange={(restProps as any)?.onCustomModeChange ?? (config as any)?.onCustomModeChange}
          customizeDisabled={(restProps as any)?.customizeDisabled ?? (config as any)?.customizeDisabled}
          helperText={(restProps as any)?.helperText ?? (config as any)?.helperText}
        />
      );

    case 'otp':
    case 'otp-input':
      return (
        <OTPInput
          config={config}
          value={restProps.value}
          onChange={restProps.onChange}
          disabled={restProps.disabled}
          error={restProps.error}
          required={restProps.required}
          className={restProps.className}
          tabIndex={tabIndex}
          resendDuration={config.resendDuration}
          resendButtonLabel={config.resendButtonLabel}
          autoStartTimer={config.autoStartTimer}
          onResend={config.onResend}
          maxLength={config.maxLength || config.length}
          separatorIndex={config.separatorIndex}
        />
      );
    
    case 'number':
      // Merge componentTypeConfig into config for NumberInput
      const numberConfig = {
        ...config,
        ...((config as any)?.componentTypeConfig || {}),
      };
      return <NumberInput config={numberConfig} {...commonProps} canCopy={canCopy} />;
    
    case 'select':
      // Convert options to SelectOption[] format if they have icon/color
      const selectOptions = config.options
        ?.filter((opt: any) => opt?.id)
        .map((opt: any) => ({
          id: String(opt.id),
        value: opt.value,
        label: opt.label,
        disabled: opt.disabled,
        icon: opt.icon,
        color: opt.color,
      }));

      const handleSelectNormalizedChange = (selection: NormalizedOption[]) => {
        if (restProps.onChange) {
          (restProps.onChange as any)(selection);
        }
      };
      
      return (
        <Select
          config={config}
          value={restProps.value}
          onNormalizedChange={handleSelectNormalizedChange}
          disabled={restProps.disabled}
          options={selectOptions}
          className={restProps.className}
          error={restProps.error}
          required={config.required ?? config.validation?.required ?? false}
          placeholder={config.placeholder}
        />
      );
    
    case 'textarea':
      return <Textarea config={config} {...commonProps} canCopy={canCopy} />;
    
    case 'checkbox':
      return <Checkbox config={config} {...commonProps} />;
    
    case 'checkbox-list':
      return <CheckboxList config={config} options={config.options || []} {...commonProps} />;

    case 'toggle':
      return (
        <Toggle
          config={config}
          {...commonProps}
          required={
            restProps.required ??
            config.required ??
            config.validation?.required ??
            false
          }
        />
      );

    case 'toggle-group': {
      const toggleGroupOptions: ToggleGroupOption[] = normalizeOptionArray(
        (restProps as any).options ?? config.options ?? []
      ).map((option) => ({
        id: option.id,
        label: option.label ?? option.id,
        icon: option.icon,
        color: option.color,
        disabled: option.disabled,
      }));

      const handleToggleGroupChange = (selection: NormalizedOption[]) => {
        restProps.onChange?.(selection);
      };

      const resolvedType =
        (config.selectionType ||
          config.selectionMode ||
          config.mode ||
          (config.multiple ? 'multiple' : undefined)) ??
        undefined;

      return (
        <ToggleGroup
          config={config}
          value={restProps.value}
          defaultValue={(restProps as any).defaultValue}
          disabled={restProps.disabled}
          error={restProps.error}
          onBlur={restProps.onBlur}
          onFocus={restProps.onFocus}
          className={restProps.className}
          required={
            restProps.required ??
            config.required ??
            config.validation?.required ??
            false
          }
          options={toggleGroupOptions}
          type={resolvedType}
          orientation={config.orientation}
          selectionBehavior={config.selectionBehavior}
          onNormalizedChange={handleToggleGroupChange}
          tabIndex={tabIndex}
        />
      );
    }
    
    case 'radio':
      const radioOptions = (config.options || [])
        .filter((opt: any) => opt?.id)
        .map((opt: any) => ({
          ...opt,
          id: String(opt.id),
        }));
      return <RadioGroup config={config} options={radioOptions} {...commonProps} />;
    
    case 'date':
      return <DateInput config={config} {...commonProps} />;
    
    case 'datetime-local':
    case 'datetime':
      return <DateTimeInput config={config} {...commonProps} />;
    
    case 'file':
      return <FileInput config={config} {...commonProps} />;
    
    case 'picker':
      return <PickerInput config={config} {...commonProps} />;
    
    case 'icon':
      return <IconInput config={config} {...commonProps} canCopy={canCopy} />;
    
    case 'image-text':
      return <ImageText config={config} value={restProps.value} {...commonProps} />;
    
    case 'button':
      return (
        <Button
          variant={(config as any).variant || 'default'}
          size={(config as any).size || 'md'}
          disabled={restProps.disabled}
          onClick={(config as any).onClick || restProps.onChange}
          className={restProps.className}
        >
          {(config as any).label || restProps.value || 'Button'}
        </Button>
      );
    
    case 'input':
      return (
        <Input
          variant={(config as any).variant || 'default'}
          size={(config as any).size || 'md'}
          value={restProps.value || ''}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => restProps.onChange?.(e.target.value)}
          disabled={restProps.disabled}
          placeholder={(config as any).placeholder}
          className={restProps.className}
          tabIndex={tabIndex}
          {...(restProps.onBlur ? { onBlur: restProps.onBlur } as any : {})}
          {...(restProps.onFocus ? { onFocus: restProps.onFocus } as any : {})}
        />
      );
    
    case 'avatar':
      return (
        <Avatar
          src={restProps.value?.src || restProps.value || (config as any).src}
          alt={(config as any).alt}
          fallback={(config as any).fallback || restProps.value?.fallback || '?'}
          size={(config as any).size || 'md'}
          variant={(config as any).variant || 'default'}
          className={restProps.className}
        />
      );
    
    case 'color-picker':
      return (
        <ColorPicker
          config={config}
          value={restProps.value || (config as any).defaultValue}
          onChange={(value: string) => restProps.onChange?.(value)}
          onBlur={restProps.onBlur}
          onFocus={restProps.onFocus}
          error={restProps.error}
          disabled={restProps.disabled}
          required={restProps.required}
          id={(config as any).name || (config as any).id}
          className={restProps.className}
        />
      );
    
    case 'rating':
      return (
        <Rating
          value={Number(restProps.value) || 0}
          maxValue={(config as any).maxValue || 5}
          size={(config as any).size || 'md'}
          showValue={(config as any).showValue || false}
          className={restProps.className}
        />
      );
    
    case 'badge':
      return (
        <Badge
          variant={(config as any).variant || 'default'}
          size={(config as any).size || 'md'}
          className={restProps.className}
        >
          {restProps.value || (config as any).label || 'Badge'}
        </Badge>
      );
    
    case 'countdown':
      return (
        <Countdown
          expireDate={restProps.value?.expireDate || restProps.value || (config as any).expireDate}
          startDate={restProps.value?.startDate || (config as any).startDate}
          includeTime={(config as any).includeTime !== false}
          showIcon={(config as any).showIcon !== false}
          size={(config as any).size || 'md'}
          className={restProps.className}
          fieldLabel={(config as any).label || (config as any).name || ''}
        />
      );
    
    case 'list-input':
      return (
        <ListInput
          value={restProps.value || []}
          onChange={(items) => restProps.onChange?.(items)}
          placeholder={(config as any).placeholder || 'Enter annotation...'}
          addButtonText={(config as any).addButtonText || 'Add Item'}
          className={restProps.className}
        />
      );
    
    case 'tag-input':
      return (
        <TagInput
          config={config}
          {...commonProps}
          validateEmail={(config as any)?.validateEmail ?? false}
          maxTags={(config as any)?.maxTags}
        />
      );
    
    default:
      console.warn(`Unknown form element type: ${elementType}`, config);
      return <UnknownControl config={config} componentType={elementType} {...commonProps} />;
  }
};

FormElementFactory.displayName = 'FormElementFactory';
