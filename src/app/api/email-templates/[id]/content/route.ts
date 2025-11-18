import { NextRequest, NextResponse } from 'next/server';
import { ensureTemplatesSeeded, readTemplateHtml } from '@/domains/email-templates/server';

type Params = {
  params: Promise<{
    id: string;
  }>;
};

const errorResponse = (message: string, status = 500) =>
  NextResponse.json({ success: false, error: message }, { status });

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const templates = await ensureTemplatesSeeded();
    const template = templates.find((item) => item.id === id);

    if (!template) {
      return errorResponse('Template not found.', 404);
    }

    const html = await readTemplateHtml(template.filePath);

    return NextResponse.json({
      success: true,
      data: {
        id: template.id,
        htmlContent: html,
      },
    });
  } catch (error) {
    console.error(`Failed to load email template ${id}:`, error);
    return errorResponse('Failed to load email template.');
  }
}

