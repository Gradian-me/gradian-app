import { NextRequest, NextResponse } from 'next/server';
import {
  deleteTemplateHtml,
  ensureTemplatesSeeded,
  readTemplateHtml,
  renameTemplateHtml,
  templateDirRelativePath,
  writeTemplateHtml,
  writeTemplatesFile,
} from '@/domains/email-templates/server';

const errorResponse = (message: string, status = 500) =>
  NextResponse.json({ success: false, error: message }, { status });

type Params = {
  params: {
    id: string;
  };
};

const normalizeId = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export async function PUT(request: NextRequest, context: Params) {
  try {
    const params = await Promise.resolve(context.params);
    const body = await request.json();
    const { name, description = '', subject, html, id: newId } = body;

    if (!name || !subject || !html) {
      return errorResponse('Missing required fields: name, subject, html.', 400);
    }

    const templates = await ensureTemplatesSeeded();
    const templateIndex = templates.findIndex((template) => template.id === params.id);
    const timestamp = new Date().toISOString();

    if (templateIndex === -1) {
      const sanitizedId = normalizeId(newId || params.id);
      if (!sanitizedId) {
        return errorResponse('Template not found.', 404);
      }
      
      // Check if new ID already exists
      if (templates.some((t) => t.id === sanitizedId)) {
        return errorResponse(`Template with id "${sanitizedId}" already exists.`, 409);
      }
      
      const filePath = templateDirRelativePath(`${sanitizedId}.html`);
      await writeTemplateHtml(filePath, html);

      const createdTemplate = {
        id: sanitizedId,
        name,
        description,
        subject,
        filePath,
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      const updatedTemplates = [...templates, createdTemplate];
      await writeTemplatesFile(updatedTemplates);

      return NextResponse.json({
        success: true,
        data: {
          id: createdTemplate.id,
          name: createdTemplate.name,
          description: createdTemplate.description,
          subject: createdTemplate.subject,
          createdAt: createdTemplate.createdAt,
          updatedAt: createdTemplate.updatedAt,
          html,
        },
      });
    }

    const template = templates[templateIndex];
    const sanitizedNewId = newId ? normalizeId(newId) : template.id;
    
    // Check if ID is being changed
    if (sanitizedNewId !== template.id) {
      // Check if new ID already exists
      if (templates.some((t) => t.id === sanitizedNewId && t.id !== template.id)) {
        return errorResponse(`Template with id "${sanitizedNewId}" already exists.`, 409);
      }
      
      // Rename the file
      const newFilePath = templateDirRelativePath(`${sanitizedNewId}.html`);
      await renameTemplateHtml(template.filePath, newFilePath);
      
      // Update template with new ID and file path
      const updatedTemplate = {
        ...template,
        id: sanitizedNewId,
        name,
        description,
        subject,
        filePath: newFilePath,
        updatedAt: timestamp,
      };

      const updatedTemplates = [...templates];
      updatedTemplates[templateIndex] = updatedTemplate;
      await writeTemplatesFile(updatedTemplates);

      return NextResponse.json({
        success: true,
        data: {
          id: updatedTemplate.id,
          name: updatedTemplate.name,
          description: updatedTemplate.description,
          subject: updatedTemplate.subject,
          createdAt: updatedTemplate.createdAt,
          updatedAt: updatedTemplate.updatedAt,
          html,
        },
      });
    }

    // ID not changed, just update content
    await writeTemplateHtml(template.filePath, html);

    const updatedTemplate = {
      ...template,
      name,
      description,
      subject,
      updatedAt: timestamp,
    };

    const updatedTemplates = [...templates];
    updatedTemplates[templateIndex] = updatedTemplate;
    await writeTemplatesFile(updatedTemplates);

    return NextResponse.json({
      success: true,
      data: {
        id: updatedTemplate.id,
        name: updatedTemplate.name,
        description: updatedTemplate.description,
        subject: updatedTemplate.subject,
        createdAt: updatedTemplate.createdAt,
        updatedAt: updatedTemplate.updatedAt,
        html,
      },
    });
  } catch (error) {
    console.error(`Failed to update email template ${params.id}:`, error);
    return errorResponse('Failed to update email template.');
  }
}

export async function DELETE(_request: NextRequest, context: Params) {
  try {
    const params = await Promise.resolve(context.params);
    const templates = await ensureTemplatesSeeded();
    const templateIndex = templates.findIndex((template) => template.id === params.id);

    if (templateIndex === -1) {
      return errorResponse('Template not found.', 404);
    }

    const template = templates[templateIndex];
    templates.splice(templateIndex, 1);
    await deleteTemplateHtml(template.filePath);
    await writeTemplatesFile(templates);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`Failed to delete email template ${params.id}:`, error);
    return errorResponse('Failed to delete email template.');
  }
}

export async function GET(_request: NextRequest, context: Params) {
  try {
    const params = await Promise.resolve(context.params);
    const templates = await ensureTemplatesSeeded();
    const template = templates.find((item) => item.id === params.id);

    if (!template) {
      return errorResponse('Template not found.', 404);
    }

    const html = await readTemplateHtml(template.filePath);

    return NextResponse.json({
      success: true,
      data: {
        id: template.id,
        name: template.name,
        description: template.description,
        subject: template.subject,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt,
        html,
      },
    });
  } catch (error) {
    console.error(`Failed to load email template ${params.id}:`, error);
    return errorResponse('Failed to load email template.');
  }
}

