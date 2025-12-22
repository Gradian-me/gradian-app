import { readFile, writeFile, mkdir, rm } from 'fs/promises';
import { dirname, join, resolve } from 'path';

export type StoredEmailTemplate = {
  id: string;
  name: string;
  description: string;
  subject: string;
  filePath: string;
  createdAt?: string;
  updatedAt?: string;
};

const normalizePath = (value: string) => value.replace(/\\/g, '/');

export const templateDirRelativePath = (fileName: string) => {
  // SECURITY: Sanitize fileName to prevent path traversal
  const sanitizedFileName = fileName.replace(/\.\./g, '').replace(/[\/\\]/g, '');
  return normalizePath(join('src', 'app', 'builder', 'email-templates', 'templates', sanitizedFileName));
};

const DATA_FILE = join(process.cwd(), 'data', 'all-templates.json');
const TEMPLATE_DIR = join(process.cwd(), 'src', 'app', 'builder', 'email-templates', 'templates');
const DEFAULT_TEMPLATE_ID = 'password-reset';
const DEFAULT_TEMPLATE_PATH = templateDirRelativePath('reset-password.html');

const getAbsolutePath = (filePath: string) => {
  // SECURITY: Validate and sanitize path to prevent path traversal
  // Normalize the path and remove any .. sequences
  const sanitizedPath = filePath.replace(/\.\./g, '').replace(/\\/g, '/');
  const absolute = resolve(process.cwd(), sanitizedPath);
  const normalizedAbsolute = normalizePath(absolute);
  const normalizedTemplateDir = normalizePath(TEMPLATE_DIR);
  
  // Ensure the resolved path is within the template directory
  if (!normalizedAbsolute.startsWith(normalizedTemplateDir)) {
    throw new Error('Invalid template path: path traversal detected');
  }
  return absolute;
};

export const readTemplatesFile = async (): Promise<StoredEmailTemplate[]> => {
  try {
    const content = await readFile(DATA_FILE, 'utf-8');
    const templates = JSON.parse(content);
    return templates.map((template: StoredEmailTemplate) => ({
      ...template,
      filePath:
        template.filePath ||
        templateDirRelativePath(`${template.id || DEFAULT_TEMPLATE_ID}.html`),
    }));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw error;
  }
};

export const writeTemplatesFile = async (templates: StoredEmailTemplate[]) => {
  await writeFile(DATA_FILE, JSON.stringify(templates, null, 2), 'utf-8');
};

export const ensureTemplatesSeeded = async () => {
  const existing = await readTemplatesFile();
  if (existing.length > 0) {
    return existing;
  }

  const timestamp = new Date().toISOString();
  const defaultTemplate: StoredEmailTemplate = {
    id: DEFAULT_TEMPLATE_ID,
    name: 'Password reset',
    description: 'Secure link email sent when a user requests a reset.',
    subject: 'Reset your Gradian.me password',
    filePath: DEFAULT_TEMPLATE_PATH,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  await writeTemplatesFile([defaultTemplate]);
  return [defaultTemplate];
};

export const readTemplateHtml = async (filePath: string) => {
  try {
    const absolutePath = getAbsolutePath(filePath);
    return await readFile(absolutePath, 'utf-8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return '';
    }
    throw error;
  }
};

export const writeTemplateHtml = async (filePath: string, html: string) => {
  const absolutePath = getAbsolutePath(filePath);
  await mkdir(dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, html, 'utf-8');
};

export const deleteTemplateHtml = async (filePath: string) => {
  try {
    const absolutePath = getAbsolutePath(filePath);
    await rm(absolutePath, { force: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }
};

export const renameTemplateHtml = async (oldFilePath: string, newFilePath: string) => {
  // Read the content from the old file
  const content = await readTemplateHtml(oldFilePath);
  
  // Write to the new file
  await writeTemplateHtml(newFilePath, content);
  
  // Delete the old file
  await deleteTemplateHtml(oldFilePath);
};

