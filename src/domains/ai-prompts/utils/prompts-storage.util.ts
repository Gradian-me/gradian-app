/**
 * AI Prompts Storage Utility
 * Handles reading and writing AI prompts to JSON file
 */

import 'server-only';
import fs from 'fs';
import path from 'path';
import { ulid } from 'ulid';
import type { AiPrompt, CreateAiPromptRequest } from '../types';

const PROMPTS_FILE = path.join(process.cwd(), 'data', 'ai-prompts.json');

/**
 * Ensure the prompts file exists
 */
function ensurePromptsFile(): void {
  if (!fs.existsSync(PROMPTS_FILE)) {
    fs.writeFileSync(PROMPTS_FILE, JSON.stringify([], null, 2), 'utf-8');
  }
}

/**
 * Read all prompts from file
 */
export function readAllPrompts(): AiPrompt[] {
  ensurePromptsFile();
  
  try {
    const fileContents = fs.readFileSync(PROMPTS_FILE, 'utf-8');
    return JSON.parse(fileContents) as AiPrompt[];
  } catch (error) {
    console.error('Error reading AI prompts file:', error);
    return [];
  }
}

/**
 * Write all prompts to file
 */
export function writeAllPrompts(prompts: AiPrompt[]): void {
  ensurePromptsFile();
  
  try {
    fs.writeFileSync(PROMPTS_FILE, JSON.stringify(prompts, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error writing AI prompts file:', error);
    throw new Error('Failed to save AI prompt');
  }
}

/**
 * Create a new prompt
 */
export function createPrompt(data: CreateAiPromptRequest): AiPrompt {
  const prompts = readAllPrompts();
  
  const newPrompt: AiPrompt = {
    id: ulid(),
    timestamp: new Date().toISOString(),
    username: data.username,
    aiAgent: data.aiAgent,
    userPrompt: data.userPrompt,
    agentResponse: data.agentResponse,
    inputTokens: data.inputTokens,
    inputPrice: data.inputPrice,
    outputTokens: data.outputTokens,
    outputPrice: data.outputPrice,
    totalTokens: data.totalTokens,
    totalPrice: data.totalPrice,
    responseTime: data.responseTime,
    duration: data.duration,
    referenceId: data.referenceId,
    annotations: data.annotations,
  };
  
  prompts.push(newPrompt);
  writeAllPrompts(prompts);
  
  return newPrompt;
}

/**
 * Get prompt by ID
 */
export function getPromptById(id: string): AiPrompt | null {
  const prompts = readAllPrompts();
  return prompts.find(p => p.id === id) || null;
}

/**
 * Filter prompts
 */
export function filterPrompts(filters: {
  username?: string;
  aiAgent?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}): AiPrompt[] {
  let prompts = readAllPrompts();
  
  if (filters.username) {
    prompts = prompts.filter(p => 
      p.username.toLowerCase().includes(filters.username!.toLowerCase())
    );
  }
  
  if (filters.aiAgent) {
    prompts = prompts.filter(p => p.aiAgent === filters.aiAgent);
  }
  
  if (filters.startDate) {
    const startDate = new Date(filters.startDate);
    prompts = prompts.filter(p => new Date(p.timestamp) >= startDate);
  }
  
  if (filters.endDate) {
    const endDate = new Date(filters.endDate);
    endDate.setHours(23, 59, 59, 999); // End of day
    prompts = prompts.filter(p => new Date(p.timestamp) <= endDate);
  }
  
  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    prompts = prompts.filter(p =>
      p.userPrompt.toLowerCase().includes(searchLower) ||
      p.agentResponse.toLowerCase().includes(searchLower) ||
      p.username.toLowerCase().includes(searchLower)
    );
  }
  
  // Sort by timestamp descending (newest first)
  return prompts.sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

