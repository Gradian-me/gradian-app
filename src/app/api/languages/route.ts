import { NextResponse } from 'next/server';
import { getAvailableLanguageCodes } from '@/gradian-ui/shared/configs/env-config';
import { SUPPORTED_LOCALES } from '@/gradian-ui/shared/utils/language-availables';

export async function GET() {
  try {
    const availableCodes = getAvailableLanguageCodes();
    const locales = availableCodes.length
      ? SUPPORTED_LOCALES.filter((locale) => availableCodes.includes(locale.code))
      : SUPPORTED_LOCALES;

    const result = locales.map((locale) => ({
      id: locale.code,
      label: locale.label,
    }));

    // Wrap result in a standard app API envelope so shared
    // option loaders (fetchOptionsFromSchemaOrUrl) can consume it.
    return NextResponse.json({
      success: true,
      data: result,
      meta: {
        totalItems: result.length,
      },
    });
  } catch (error) {
    console.error('Error in /api/languages:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load languages' },
      { status: 500 },
    );
  }
}

export function POST() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 },
  );
}

export function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 },
  );
}

export function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 },
  );
}

