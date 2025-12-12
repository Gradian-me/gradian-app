/**
 * Professional Writing Hook
 * React hook for managing professional writing requests
 */

'use client';

import { useState, useCallback, useRef } from 'react';
import type { ProfessionalWritingRequest, ProfessionalWritingResponse } from '../types';
import { SUPPORTED_LANGUAGES } from '../types';

interface UseProfessionalWritingReturn {
  enhancedText: string;
  tokenUsage: ProfessionalWritingResponse['tokenUsage'];
  isLoading: boolean;
  error: string | null;
  generateEnhancedText: (request: ProfessionalWritingRequest) => Promise<void>;
  stopGeneration: () => void;
  clearResponse: () => void;
  clearError: () => void;
}

/**
 * Hook to manage professional writing operations
 */
export function useProfessionalWriting(): UseProfessionalWritingReturn {
  const [enhancedText, setEnhancedText] = useState('');
  const [tokenUsage, setTokenUsage] = useState<ProfessionalWritingResponse['tokenUsage']>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const getLanguageName = useCallback((code: string): string => {
    const language = SUPPORTED_LANGUAGES.find(lang => lang.code === code);
    return language?.label || code;
  }, []);

  const generateEnhancedText = useCallback(async (request: ProfessionalWritingRequest) => {
    if (!request.text.trim()) {
      setError('Please enter text to enhance');
      return;
    }

    if (request.style === 'translate' && !request.targetLanguage) {
      setError('Please select a target language for translation');
      return;
    }

    // Abort any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new AbortController for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setIsLoading(true);
    setError(null);
    setEnhancedText('');

    try {
      // Build user prompt with style instruction
      let userPrompt = '';
      if (request.style === 'translate' && request.targetLanguage) {
        const languageName = getLanguageName(request.targetLanguage);
        userPrompt = `Please translate the following text to ${languageName}. Maintain the original tone, meaning, and context. Ensure cultural accuracy and natural phrasing:\n\n${request.text.trim()}`;
      } else if (request.style === 'professional') {
        userPrompt = `Please enhance the following text to a professional tone. Transform it into a polished, professional tone suitable for business communications, formal documents, and professional contexts. Fix all grammatical errors, improve sentence structure, and enhance clarity:\n\n${request.text.trim()}`;
      } else if (request.style === 'casual') {
        userPrompt = `Please convert the following text to a casual, friendly, and conversational tone. Make it more approachable and relatable while maintaining clarity and readability. Use everyday language and a warm, friendly voice:\n\n${request.text.trim()}`;
      } else if (request.style === 'solution-advisor') {
        userPrompt = `You are a Solution Advisor. Analyze the following question or problem and provide a comprehensive solution proposal following this exact structure:

## Step 1: Expanded Question Context
First, expand and clarify the user's question with additional context, background information, and related considerations that help frame the problem more comprehensively.

## Step 2: Best Practices Research
Search and identify industry best practices, proven methodologies, and expert recommendations relevant to this question. Categorize these findings into logical groups (e.g., Technical Approaches, Process Improvements, Tool Recommendations, etc.).

## Step 3: Solution Summary
Provide a concise executive summary (2-3 paragraphs) that synthesizes the key findings and presents the overall recommended approach.

## Step 4: Best Solutions
List the top solutions as bullet points, each with:
- Clear, actionable recommendation
- Brief explanation of why it's effective
- When/where to apply it

## Step 5: Considerations
List important considerations, trade-offs, and potential challenges as bullet points, including:
- Implementation challenges
- Resource requirements
- Risk factors
- Alternative approaches
- Success factors

User's Question/Problem:
${request.text.trim()}`;
      } else {
        userPrompt = request.text.trim();
      }

      // Use the new route format: /api/ai-builder/[agent-id]
      const response = await fetch('/api/ai-builder/professional-writing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userPrompt,
        }),
        signal: abortController.signal,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to enhance text');
      }

      const builderResponse = data.data;
      setEnhancedText(builderResponse.response || '');
      setTokenUsage(builderResponse.tokenUsage || null);
    } catch (err) {
      // Don't show error if request was aborted
      if (err instanceof Error && err.name === 'AbortError') {
        setError(null);
        setEnhancedText('');
      } else {
        setError(err instanceof Error ? err.message : 'An error occurred');
        setEnhancedText('');
        setTokenUsage(null);
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [getLanguageName]);

  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
      setError(null);
      setEnhancedText('');
      setTokenUsage(null);
      abortControllerRef.current = null;
    }
  }, []);

  const clearResponse = useCallback(() => {
    setEnhancedText('');
    setTokenUsage(null);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    enhancedText,
    tokenUsage,
    isLoading,
    error,
    generateEnhancedText,
    stopGeneration,
    clearResponse,
    clearError,
  };
}

