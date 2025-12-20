/**
 * Maps BadgeColor type to Badge component variant type
 * BadgeColor includes values like "destructive" that Badge variant doesn't accept
 */
export const mapBadgeColorToVariant = (
  color: string
): 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'outline' => {
  const colorMap: Record<string, 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'outline'> = {
    'default': 'default',
    'secondary': 'secondary',
    'outline': 'outline',
    'destructive': 'danger',
    'success': 'success',
    'warning': 'warning',
    'info': 'primary',
    'muted': 'secondary',
    'gradient': 'default',
  };
  return colorMap[color] || 'default';
};

/**
 * Safely converts color string to valid Badge variant
 * Supports all Badge component variants including Tailwind color names
 */
export const getValidBadgeVariant = (
  color: string | undefined
): 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info' | 'gradient' | 'muted' | 'slate' | 'gray' | 'zinc' | 'neutral' | 'stone' | 'red' | 'orange' | 'amber' | 'yellow' | 'lime' | 'green' | 'emerald' | 'teal' | 'cyan' | 'sky' | 'blue' | 'indigo' | 'violet' | 'purple' | 'fuchsia' | 'pink' | 'rose' => {
  const validVariants = [
    'default', 'secondary', 'destructive', 'outline', 'success', 'warning', 'info', 'gradient', 'muted',
    'slate', 'gray', 'zinc', 'neutral', 'stone', 'red', 'orange', 'amber', 'yellow', 'lime', 'green',
    'emerald', 'teal', 'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose'
  ] as const;
  
  if (color && validVariants.includes(color as any)) {
    return color as typeof validVariants[number];
  }
  return 'outline';
};

