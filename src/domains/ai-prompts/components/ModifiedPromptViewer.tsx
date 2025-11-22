/**
 * Modified Prompt Viewer Component
 * Displays details of a modified prompt in a sheet
 */

'use client';

import React from 'react';
import type { AiPrompt } from '../types';
import { CodeViewer } from '@/gradian-ui/shared/components/CodeViewer';
import { CopyContent } from '@/gradian-ui/form-builder/form-elements/components/CopyContent';
import { IconRenderer } from '@/gradian-ui/shared/utils/icon-renderer';
import { Hash, DollarSign } from 'lucide-react';
import { format } from 'date-fns';

interface ModifiedPromptViewerProps {
  prompt: AiPrompt;
  agentMap: Map<string, { id: string; label: string; icon?: string; model?: string }>;
  userMap?: Map<string, { id: string; name: string; lastname?: string; username?: string }>;
}

export function ModifiedPromptViewer({ prompt, agentMap, userMap = new Map() }: ModifiedPromptViewerProps) {
  const agent = agentMap.get(prompt.aiAgent);
  const user = userMap.get(prompt.username);
  const date = new Date(prompt.timestamp);
  const isJson = prompt.agentResponse.trim().startsWith('{') || 
                 prompt.agentResponse.trim().startsWith('[');

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          {agent?.icon && (
            <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-900/30">
              <IconRenderer
                iconName={agent.icon}
                className="h-5 w-5 text-violet-600 dark:text-violet-400"
              />
            </div>
          )}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              {agent?.label || prompt.aiAgent}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {format(date, 'PPpp')} • by {user?.name || prompt.username}
            </p>
          </div>
        </div>
      </div>

      {/* User Prompt */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            User Prompt:
          </h4>
          <CopyContent content={prompt.userPrompt} />
        </div>
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-4">
          <pre className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words">
            {prompt.userPrompt}
          </pre>
        </div>
      </div>

      {/* Annotations */}
      {prompt.annotations && prompt.annotations.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-3 text-gray-900 dark:text-gray-100">
            Annotations ({prompt.annotations.length} schema{prompt.annotations.length !== 1 ? 's' : ''})
          </h4>
          <div className="space-y-3">
            {prompt.annotations.map((schemaAnnotation) => (
              <div
                key={schemaAnnotation.schemaId}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800/50"
              >
                <h5 className="text-sm font-semibold mb-2 text-gray-900 dark:text-gray-100">
                  {schemaAnnotation.schemaName}
                </h5>
                {schemaAnnotation.annotations.length > 0 ? (
                  <ul className="space-y-1">
                    {schemaAnnotation.annotations.map((annotation, index) => (
                      <li
                        key={annotation.id}
                        className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300"
                      >
                        <span className="text-violet-600 dark:text-violet-400 font-medium shrink-0">
                          {index + 1}.
                        </span>
                        <span>{annotation.label}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                    No annotations
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Response */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            AI Response:
          </h4>
          <CopyContent content={prompt.agentResponse} />
        </div>
        <CodeViewer
          code={prompt.agentResponse}
          programmingLanguage={isJson ? 'json' : 'text'}
          title=""
          initialLineNumbers={10}
        />
      </div>

      {/* Token Usage */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div className="flex items-center gap-2">
          <Hash className="h-4 w-4 text-gray-500" />
          <div>
            <div className="font-medium">Input</div>
            <div className="text-xs text-gray-500">
              {prompt.inputTokens.toLocaleString()} tokens
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-gray-500" />
          <div>
            <div className="font-medium">Input Cost</div>
            <div className="text-xs text-gray-500">
              ${prompt.inputPrice.toFixed(4)}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Hash className="h-4 w-4 text-gray-500" />
          <div>
            <div className="font-medium">Output</div>
            <div className="text-xs text-gray-500">
              {prompt.outputTokens.toLocaleString()} tokens
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-gray-500" />
          <div>
            <div className="font-medium">Output Cost</div>
            <div className="text-xs text-gray-500">
              ${prompt.outputPrice.toFixed(4)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

