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

