/**
 * AI Form Filler Dialog Component
 * Specialized dialog for AI-powered form filling
 */

'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Modal } from '@/gradian-ui/data-display/components/Modal';
import { Button } from '@/components/ui/button';
import { AiBuilderWrapper } from './AiBuilderWrapper';
import { ConfirmationMessage } from '@/gradian-ui/form-builder/form-elements/components/ConfirmationMessage';
import type { FormSchema } from '@/gradian-ui/schema-manager/types/form-schema';
import { replaceDynamicContextInObject } from '@/gradian-ui/form-builder/utils/dynamic-context-replacer';
import { useAiAgents } from '../hooks/useAiAgents';
import { buildFormFillerPreloadRoutes } from '../utils/form-filler-routes';
import { validateAndTransformFormData } from '../utils/form-filler-validator';
import { populateFormFields } from '../utils/form-filler-populator';
import { useAiResponseStore } from '@/stores/ai-response.store';
import { useLanguageStore } from '@/stores/language.store';
import { getT, getDefaultLanguage } from '@/gradian-ui/shared/utils/translation-utils';
import { TRANSLATION_KEYS } from '@/gradian-ui/shared/constants/translations';

export interface AiFormFillerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  schema: FormSchema;
  formData: Record<string, any>; // Current form values
  setValue: (fieldName: string, value: any) => void; // Function to set form field values
  onFillComplete?: (data: Record<string, any>) => void; // Callback with filled data
}

export function AiFormFillerDialog({
  isOpen,
  onClose,
  schema,
  formData,
  setValue,
  onFillComplete,
}: AiFormFillerDialogProps) {
  const [formFillerAgent, setFormFillerAgent] = useState<any>(null);
  const [preloadRoutes, setPreloadRoutes] = useState<Array<{
    route: string;
    title: string;
    description: string;
    method?: 'GET' | 'POST';
    jsonPath?: string;
    body?: any;
    queryParameters?: Record<string, string>;
    outputFormat?: 'json' | 'string' | 'toon';
    includedFields?: string[];
  }>>([]);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingData, setPendingData] = useState<Record<string, any> | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en');

  const language = useLanguageStore((s) => s.language) ?? getDefaultLanguage();
  const defaultLang = getDefaultLanguage();

  // Get latest response from store
  const latestResponse = useAiResponseStore((state) => {
    if (!formFillerAgent?.id) return null;
    const latestKey = `ai-response-${formFillerAgent.id}-json-latest`;
    const latestDatetime = state.latestResponses[latestKey];
    if (!latestDatetime) return null;
    const storageKey = `ai-response-${formFillerAgent.id}-json-${latestDatetime}`;
    return state.responses[storageKey] || null;
  });

  const aiResponse = latestResponse?.content || '';

  // Fetch form-filler agent only when dialog is open (not on every form/modal open)
  const { agents, loading: isLoadingAgent } = useAiAgents({
    agentId: 'form-filler',
    enabled: isOpen,
  });

  useEffect(() => {
    if (agents && agents.length > 0) {
      const agent = agents.find((a: any) => a.id === 'form-filler');
      setFormFillerAgent(agent || null);
    }
  }, [agents]);

  // Build preload routes: resolve agent preload (e.g. /api/schemas/{{formSchema.id}}) with context, then add data routes (picker/reference)
  useEffect(() => {
    if (!isOpen || !schema) {
      setPreloadRoutes([]);
      return;
    }

    const resolvedAgentRoutes = (formFillerAgent?.preloadRoutes || [])
      .map((route: { route?: string; outputFormat?: string; [k: string]: any }) => {
        const resolved = replaceDynamicContextInObject(route, { formSchema: schema, formData });
        // Schema routes: always use JSON so the model sees full fields/sections (cached agent may have toon)
        if (resolved.route && typeof resolved.route === 'string' && resolved.route.includes('/api/schemas/')) {
          return { ...resolved, outputFormat: 'json' as const };
        }
        return resolved;
      })
      .filter(
        (r: { route?: string }) =>
          typeof r.route === 'string' && !r.route.includes('{{')
      );

    const dataRoutes = buildFormFillerPreloadRoutes(schema, formData, {
      skipSchemaRoute: true,
    });

    setPreloadRoutes([...resolvedAgentRoutes, ...dataRoutes]);
  }, [isOpen, schema, formData, formFillerAgent?.preloadRoutes]);

  // Check if form has existing data
  const hasExistingData = useMemo(() => {
    if (!formData) return false;
    const keys = Object.keys(formData);
    if (keys.length === 0) return false;
    
    // Filter out internal/system fields that shouldn't count as user data
    const systemFields = ['id', '_id', 'Id', 'createdAt', 'updatedAt', 'created_at', 'updated_at', 'incomplete'];
    
    // Check if any field has a non-empty value (excluding system fields)
    const hasData = keys.some((key) => {
      // Skip system fields (except check if form is in edit mode - if it has an id, it's existing data)
      if (systemFields.includes(key) && key !== 'id' && key !== '_id' && key !== 'Id') return false;
      
      // If form has an id, it's definitely existing data (edit mode)
      if ((key === 'id' || key === '_id' || key === 'Id') && formData[key]) {
        return true;
      }
      
      const value = formData[key];
      
      // Skip undefined, null, and empty strings
      if (value === undefined || value === null || value === '') return false;
      
      // Skip empty arrays
      if (Array.isArray(value) && value.length === 0) return false;
      
      // Skip empty objects (but allow objects with properties)
      if (typeof value === 'object' && !Array.isArray(value)) {
        const objKeys = Object.keys(value);
        if (objKeys.length === 0) return false;
        // Check if object has meaningful data (not just empty strings/null)
        return objKeys.some(objKey => {
          const objValue = value[objKey];
          return objValue !== undefined && objValue !== null && objValue !== '';
        });
      }
      
      // For other types (string, number, boolean), if it exists, it's data
      return true;
    });
    
    return hasData;
  }, [formData]);

  // Handle Fill Form button click
  const handleFillForm = useCallback(() => {
    if (!aiResponse || !aiResponse.trim()) {
      setValidationErrors(['No AI response available. Please generate a response first.']);
      return;
    }

    try {
      // Parse JSON response
      const parsedData = JSON.parse(aiResponse);
      
      // Validate and transform
      const validationResult = validateAndTransformFormData(parsedData, schema);
      
      // Filter out errors about missing required fields - user can complete them later
      const criticalErrors = validationResult.errors.filter(
        err => !err.toLowerCase().includes('is required')
      );
      
      // Show warnings but still allow filling if we have transformed data
      if (criticalErrors.length > 0 && Object.keys(validationResult.transformedData).length === 0) {
        setValidationErrors(criticalErrors);
        return;
      }

      // Show warnings about missing required fields as info, but still proceed
      if (validationResult.errors.length > 0 && criticalErrors.length < validationResult.errors.length) {
        // Some fields are missing but we have data to fill - show info message
        const missingRequiredFields = validationResult.errors
          .filter(err => err.toLowerCase().includes('is required'))
          .map(err => err.replace(' is required', ''))
          .join(', ');
        if (missingRequiredFields) {
          // Don't block, just show as info
          console.info(`Some required fields were not filled: ${missingRequiredFields}. User can complete them later.`);
        }
      }

      setValidationErrors(criticalErrors.length > 0 ? criticalErrors : []);
      
      // Always check for existing data before populating
      // Check if form has any meaningful data (re-check here to ensure we have latest state)
      const currentHasData = hasExistingData || (() => {
        if (!formData) return false;
        const keys = Object.keys(formData);
        if (keys.length === 0) return false;
        const systemFields = ['id', '_id', 'Id', 'createdAt', 'updatedAt', 'created_at', 'updated_at', 'incomplete'];
        return keys.some((key) => {
          if (systemFields.includes(key) && key !== 'id' && key !== '_id' && key !== 'Id') return false;
          if ((key === 'id' || key === '_id' || key === 'Id') && formData[key]) return true;
          const value = formData[key];
          if (value === undefined || value === null || value === '') return false;
          if (Array.isArray(value) && value.length === 0) return false;
          if (typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0) return false;
          return true;
        });
      })();
      
      if (currentHasData) {
        setPendingData(validationResult.transformedData);
        setShowConfirmation(true);
      } else {
        // No existing data, populate directly (even if some required fields are missing)
        populateFormFields(validationResult.transformedData, schema, setValue);
        onFillComplete?.(validationResult.transformedData);
        onClose();
      }
    } catch (error) {
      setValidationErrors([
        `Failed to parse AI response: ${error instanceof Error ? error.message : String(error)}. Please ensure the response is valid JSON.`,
      ]);
    }
  }, [aiResponse, schema, hasExistingData, formData, setValue, onFillComplete, onClose]);

  // Handle confirmation
  const handleConfirmReplace = useCallback(() => {
    if (!pendingData) return;
    
    // Populate form with new data
    populateFormFields(pendingData, schema, setValue);
    onFillComplete?.(pendingData);
    setShowConfirmation(false);
    setPendingData(null);
    onClose();
  }, [pendingData, schema, setValue, onFillComplete, onClose]);

  const handleCancelReplace = useCallback(() => {
    setShowConfirmation(false);
    setPendingData(null);
  }, []);

  if (!formFillerAgent && !isLoadingAgent) {
    return null;
  }

  const titleFillForm = getT(TRANSLATION_KEYS.TITLE_FILL_FORM_WITH_AI, language, defaultLang);
  const descriptionFillForm = getT(TRANSLATION_KEYS.DESCRIPTION_FILL_FORM_WITH_AI, language, defaultLang);
  const buttonFillForm = getT(TRANSLATION_KEYS.BUTTON_FILL_FORM, language, defaultLang);

  return (
    <>
      <Modal
        isOpen={isOpen && !showConfirmation}
        onClose={onClose}
        title={titleFillForm}
        description={descriptionFillForm}
        size="xl"
        showCloseButton={true}
        footerLeftActions={
          aiResponse && aiResponse.trim() ? (
            <div className="flex items-center gap-2 w-full">
              {validationErrors.length > 0 && (
                <div className="flex-1 text-sm text-red-600 dark:text-red-400">
                  {validationErrors[0]}
                </div>
              )}
              <Button
                onClick={handleFillForm}
                className="ml-auto"
              >
                {buttonFillForm}
              </Button>
            </div>
          ) : undefined
        }
      >
        {formFillerAgent && (
          <AiBuilderWrapper
            initialAgentId="form-filler"
            initialUserPrompt=""
            mode="dialog"
            customPreloadRoutes={preloadRoutes}
            showResetButton={false}
            displayType="default"
            runType="manual"
            agent={formFillerAgent}
            hideAgentSelector={true}
            hideSearchConfig={true}
            hideImageConfig={true}
            hideEditAgent={true}
            hidePromptHistory={true}
            hideNextActionButton={true}
            hideLanguageSelector={false}
            initialSelectedLanguage={selectedLanguage}
            onLanguageChange={setSelectedLanguage}
            onClose={onClose}
          />
        )}
      </Modal>

      <ConfirmationMessage
        isOpen={showConfirmation}
        onOpenChange={setShowConfirmation}
        title={[{ en: 'Replace Form Data?' }, { fa: 'جایگزینی داده‌های فرم؟' }, { ar: 'استبدال بيانات النموذج؟' }, { es: '¿Reemplazar datos del formulario?' }, { fr: 'Remplacer les données du formulaire ?' }, { de: 'Formulardaten ersetzen?' }, { it: 'Sostituire i dati del modulo?' }, { ru: 'Заменить данные формы?' }]}
        message={[{ en: 'This will replace all current form values with the AI-generated data. Are you sure you want to continue?' }, { fa: 'تمام مقادیر فعلی فرم با داده‌های تولیدشده توسط هوش مصنوعی جایگزین می‌شوند. آیا مطمئن هستید که می‌خواهید ادامه دهید؟' }, { ar: 'سيستبدل هذا جميع قيم النموذج الحالية ببيانات الذكاء الاصطناعي. هل أنت متأكد أنك تريد المتابعة؟' }, { es: 'Esto reemplazará todos los valores actuales del formulario con los datos generados por IA. ¿Está seguro de que desea continuar?' }, { fr: 'Cela remplacera toutes les valeurs actuelles du formulaire par les données générées par l\'IA. Voulez-vous vraiment continuer ?' }, { de: 'Dies ersetzt alle aktuellen Formularwerte durch die KI-generierten Daten. Möchten Sie fortfahren?' }, { it: 'Questo sostituirà tutti i valori attuali del modulo con i dati generati dall\'IA. Sei sicuro di voler continuare?' }, { ru: 'Все текущие значения формы будут заменены данными, сгенерированными ИИ. Вы уверены, что хотите продолжить?' }]}
        variant="warning"
        buttons={[
          {
            label: getT(TRANSLATION_KEYS.BUTTON_CANCEL, language, defaultLang),
            variant: 'outline',
            action: handleCancelReplace,
          },
          {
            label: getT(TRANSLATION_KEYS.BUTTON_REPLACE_ALL, language, defaultLang),
            variant: 'destructive',
            action: handleConfirmReplace,
            icon: 'AlertTriangle',
          },
        ]}
      />
    </>
  );
}

