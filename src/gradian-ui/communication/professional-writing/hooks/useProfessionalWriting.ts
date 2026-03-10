/**
 * Professional Writing Hook
 * React hook for managing professional writing requests
 */

'use client';

import { useState, useCallback, useRef } from 'react';
import type { ProfessionalWritingRequest, ProfessionalWritingResponse, WritingStyle } from '../types';
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

  const generateEnhancedText = useCallback(async (request: ProfessionalWritingRequest & { customStyle?: string }) => {
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
      } else if (request.style === 'extended') {
        userPrompt = `Please significantly expand the following text by adding comprehensive details, context, examples, explanations, and supporting information. Enhance depth and richness while preserving the original message, intent, and core meaning. Add relevant background, clarify concepts, provide illustrations, and elaborate on key points to create a more thorough and informative version:\n\n${request.text.trim()}`;
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
      } else if (request.style === 'summarizer') {
        userPrompt = `Deeply analyze the following text to understand meaning, context, relationships, and key details. Then synthesize and completely rephrase all content into one or two flowing narrative paragraphs that capture the essence, main ideas, and critical information. Output MUST be plain text only - NO headings, sections, bullet points, markdown, or structured formatting. Create continuous, natural-flowing prose that reads as if written from scratch based on comprehensive understanding, not a condensed or reorganized version of the original:\n\n${request.text.trim()}`;
      } else if (request.style === 'email-writer') {
        userPrompt = `Analyze the following text and rewrite it as a complete, professional email. Automatically infer the appropriate greeting and closing, and structure the message with clear paragraphs, context, and calls to action. Maintain the original intent and key details while improving clarity, tone, and professionalism. Always include a suitable opening (e.g., “Dear [Name],” or “Hi [Name],”) and a courteous sign-off with regards:\n\n${request.text.trim()}`;
      } else if (request.style === 'custom' && request.customStyle) {
        userPrompt = `You are a professional writing assistant. Rewrite and enhance the following text according to these style instructions:\n\n${request.customStyle.trim()}\n\n---\n\nText to enhance:\n\n${request.text.trim()}`;
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
          stream: true,
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        const contentType = response.headers.get('content-type') || '';
        const isJsonResponse = contentType.includes('application/json');
        const errorPayload = isJsonResponse ? await response.json() : null;
        const textFallback = isJsonResponse ? '' : await response.text();
        throw new Error(
          errorPayload?.error ||
            textFallback ||
            'Failed to enhance text'
        );
      }

      const responseMode = response.headers.get('x-response-mode');
      if (responseMode === 'stream' && response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let combinedText = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (!value) continue;

          const chunk = decoder.decode(value, { stream: true });
          combinedText += chunk;
          setEnhancedText(combinedText);
        }

        // Flush any remaining buffered bytes.
        combinedText += decoder.decode();
        setEnhancedText(combinedText);
        setTokenUsage(null);
        return;
      }

      const contentType = response.headers.get('content-type') || '';
      const isJsonResponse = contentType.includes('application/json');
      const data = isJsonResponse ? await response.json() : { success: false, error: await response.text() };

      if (!data.success) {
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

