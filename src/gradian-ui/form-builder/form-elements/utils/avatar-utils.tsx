import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '../../../../components/ui/avatar';

/**
 * Get initials from a name string
 * Maximum 3 characters: first two words + last word if more than 2 words
 * Examples:
 * - "Git Sync Environment Variables" -> "GSV" (G from Git, S from Sync, V from Variables)
 * - "John Doe" -> "JD" (J from John, D from Doe)
 * - "Single" -> "SI" (first two characters)
 */
export const getInitials = (name: string): string => {
  if (!name) return 'A';
  
  const words = name.trim().split(/\s+/).filter(word => word.length > 0);
  
  if (words.length === 0) return 'A';
  
  if (words.length === 1) {
    // Single word: take first two characters
    return words[0].substring(0, 2).toUpperCase();
  }
  
  if (words.length === 2) {
    // Two words: take first letter of each
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  
  // More than 2 words: first letter of first two words + first letter of last word
  return (words[0][0] + words[1][0] + words[words.length - 1][0]).toUpperCase();
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

