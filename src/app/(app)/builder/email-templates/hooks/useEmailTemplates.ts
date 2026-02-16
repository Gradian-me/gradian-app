import { useCallback, useEffect, useState } from 'react';
import { EmailTemplate, EmailTemplatePayload } from '../types';

type MutationState = {
  create: boolean;
  update: boolean;
  delete: boolean;
};

const initialMutationState: MutationState = {
  create: false,
  update: false,
  delete: false,
};

const fetchJson = async (input: RequestInfo, init?: RequestInit) => {
  const response = await fetch(input, init);
  const data = await response.json();

  if (!response.ok || data.success === false) {
    const message: string = data.error || data.message || 'Request failed.';
    throw new Error(message);
  }

  return data;
};

export const useEmailTemplates = () => {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mutationState, setMutationState] = useState<MutationState>(initialMutationState);

  const loadTemplates = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchJson('/api/email-templates');
      setTemplates(data.data);
      setError(null);
      return data.data as EmailTemplate[];
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load templates.';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTemplates().catch(() => {
      /* error handled in loadTemplates */
    });
  }, [loadTemplates]);

  const createTemplate = useCallback(
    async (payload: EmailTemplatePayload) => {
      setMutationState((previous) => ({ ...previous, create: true }));
      try {
        const data = await fetchJson('/api/email-templates', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
        const template = data.data as EmailTemplate;
        setTemplates((current) => [...current, template]);
        return template;
      } finally {
        setMutationState((previous) => ({ ...previous, create: false }));
      }
    },
    [],
  );

  const updateTemplate = useCallback(
    async (id: string, payload: EmailTemplatePayload) => {
      setMutationState((previous) => ({ ...previous, update: true }));
      try {
        const data = await fetchJson(`/api/email-templates/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
        const template = data.data as EmailTemplate;
        setTemplates((current) => {
          // If ID changed, remove old template and add new one
          if (template.id !== id) {
            return current.filter((existing) => existing.id !== id).concat(template);
          }
          // Otherwise, just update the existing template
          return current.map((existing) => (existing.id === template.id ? template : existing));
        });
        return template;
      } finally {
        setMutationState((previous) => ({ ...previous, update: false }));
      }
    },
    [],
  );

  const deleteTemplate = useCallback(async (id: string) => {
    setMutationState((previous) => ({ ...previous, delete: true }));
    try {
      await fetchJson(`/api/email-templates/${id}`, {
        method: 'DELETE',
      });
      setTemplates((current) => current.filter((template) => template.id !== id));
    } finally {
      setMutationState((previous) => ({ ...previous, delete: false }));
    }
  }, []);

  return {
    templates,
    isLoading,
    error,
    mutationState,
    loadTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    setError,
  };
};

