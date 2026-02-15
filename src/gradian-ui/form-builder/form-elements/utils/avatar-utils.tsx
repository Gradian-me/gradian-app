import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '../../../../components/ui/avatar';

const ZWNJ = '\u200C'; // Zero-width non-joiner (semi-space for fa/ar)

/** fa/ar use ZWNJ between initials to prevent unwanted cursive joining */
function addSemiSpaceIfRTL(initials: string, lang?: string): string {
  if (!lang || (lang !== 'fa' && lang !== 'ar')) return initials;
  return initials.split('').join(ZWNJ);
}

/**
 * Get initials from a name string (or value that will be coerced to string).
 * Safe for translation arrays/objects: only strings get trimmed/split; otherwise returns 'A'.
 * Maximum 3 characters: first two words + last word if more than 2 words
 * When lang is fa or ar, inserts ZWNJ (semi-space) between initials for proper RTL rendering.
 * Examples:
 * - "Git Sync Environment Variables" -> "GSV" (G from Git, S from Sync, V from Variables)
 * - "John Doe" -> "JD" (J from John, D from Doe)
 * - "Single" -> "SI" (first two characters)
 */
export const getInitials = (name: unknown, lang?: string): string => {
  const str = typeof name === 'string' ? name : '';
  if (!str) return 'A';
  
  const words = str.trim().split(/\s+/).filter(word => word.length > 0);
  
  if (words.length === 0) return 'A';
  
  let result: string;
  if (words.length === 1) {
    result = words[0].substring(0, 2).toUpperCase();
  } else if (words.length === 2) {
    result = (words[0][0] + words[1][0]).toUpperCase();
  } else {
    result = (words[0][0] + words[1][0] + words[words.length - 1][0]).toUpperCase();
  }
  return addSemiSpaceIfRTL(result, lang);
};

interface GetAvatarContentProps {
  metadata: any;
  formSchema: any;
  data: any;
  getInitials: (name: string) => string;
}

/**
 * Get avatar content using role-based resolution
 */
export const getAvatarContent = ({
  metadata,
  formSchema,
  data,
  getInitials
}: GetAvatarContentProps): React.ReactNode | null => {
  if (!metadata.avatar || !formSchema) return null;

  // Find field with role='avatar' or 'title' for fallback
  let avatarField: any;
  let fallbackField: any;
  
  if (formSchema.fields) {
    for (const field of formSchema.fields) {
      if (field.role === 'avatar' && data[field.name]) {
        avatarField = data[field.name];
      }
      if (field.role === 'title' && data[field.name]) {
        fallbackField = data[field.name];
      }
    }
  }

  const initials = getInitials(avatarField || fallbackField || 'A');
  
  return (
    <Avatar className="h-12 w-12">
      {metadata.avatar.imagePath && avatarField ? (
        <img
          src={`${metadata.avatar.imagePath}/${avatarField.toLowerCase().replace(/\s+/g, '-')}.jpg`}
          alt={avatarField || 'Avatar'}
          className="h-12 w-12 rounded-full object-cover"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      ) : null}
      <AvatarFallback className="h-12 w-12 rounded-full bg-gray-300 flex items-center justify-center text-sm font-medium text-gray-700">
        {initials}
      </AvatarFallback>
    </Avatar>
  );
};

