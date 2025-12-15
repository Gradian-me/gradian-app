/**
 * Maps color identifiers to pastel color schemes
 * Returns lighter background color and darker border color
 */
export interface ColorScheme {
  background: string;
  border: string;
  text?: string;
}

const COLOR_MAP: Record<string, ColorScheme> = {
  // Red
  red: {
    background: '#fef2f2', // red-50
    border: '#dc2626', // red-600
    text: '#991b1b', // red-800
  },
  // Blue
  blue: {
    background: '#eff6ff', // blue-50
    border: '#2563eb', // blue-600
    text: '#1e40af', // blue-800
  },
  // Green
  green: {
    background: '#f0fdf4', // green-50
    border: '#16a34a', // green-600
    text: '#166534', // green-800
  },
  // Yellow/Amber
  yellow: {
    background: '#fffbeb', // amber-50
    border: '#d97706', // amber-600
    text: '#92400e', // amber-800
  },
  amber: {
    background: '#fffbeb', // amber-50
    border: '#d97706', // amber-600
    text: '#92400e', // amber-800
  },
  // Orange
  orange: {
    background: '#fff7ed', // orange-50
    border: '#ea580c', // orange-600
    text: '#9a3412', // orange-800
  },
  // Purple/Violet
  purple: {
    background: '#faf5ff', // purple-50
    border: '#9333ea', // purple-600
    text: '#6b21a8', // purple-800
  },
  violet: {
    background: '#f5f3ff', // violet-50
    border: '#7c3aed', // violet-600
    text: '#5b21b6', // violet-800
  },
  // Indigo
  indigo: {
    background: '#eef2ff', // indigo-50
    border: '#4f46e5', // indigo-600
    text: '#3730a3', // indigo-800
  },
  // Pink
  pink: {
    background: '#fdf2f8', // pink-50
    border: '#db2777', // pink-600
    text: '#9f1239', // pink-800
  },
  // Cyan
  cyan: {
    background: '#ecfeff', // cyan-50
    border: '#0891b2', // cyan-600
    text: '#155e75', // cyan-800
  },
  // Teal
  teal: {
    background: '#f0fdfa', // teal-50
    border: '#0d9488', // teal-600
    text: '#115e59', // teal-800
  },
  // Emerald
  emerald: {
    background: '#ecfdf5', // emerald-50
    border: '#059669', // emerald-600
    text: '#065f46', // emerald-800
  },
  // Sky
  sky: {
    background: '#f0f9ff', // sky-50
    border: '#0284c7', // sky-600
    text: '#0c4a6e', // sky-800
  },
  // Slate/Gray
  slate: {
    background: '#f8fafc', // slate-50
    border: '#475569', // slate-600
    text: '#1e293b', // slate-800
  },
  gray: {
    background: '#f9fafb', // gray-50
    border: '#4b5563', // gray-600
    text: '#1f2937', // gray-800
  },
  // Rose
  rose: {
    background: '#fff1f2', // rose-50
    border: '#e11d48', // rose-600
    text: '#9f1239', // rose-800
  },
  // Fuchsia
  fuchsia: {
    background: '#fdf4ff', // fuchsia-50
    border: '#c026d3', // fuchsia-600
    text: '#86198f', // fuchsia-800
  },
};

/**
 * Gets color scheme for a color identifier
 * If the identifier is already a hex color, returns it as both background and border
 * If it's a tailwind color name, returns the mapped pastel scheme
 */
export function getColorScheme(color: string): ColorScheme {
  // If it's already a hex color, use it
  if (color.startsWith('#')) {
    return {
      background: color,
      border: color,
    };
  }

  // Normalize color name (lowercase, trim)
  const normalized = color.toLowerCase().trim();
  
  // Check if it's in our map
  if (COLOR_MAP[normalized]) {
    return COLOR_MAP[normalized];
  }

  // Default fallback
  return {
    background: '#f9fafb', // gray-50
    border: '#6b7280', // gray-500
    text: '#1f2937', // gray-800
  };
}

/**
 * Gets the background color for a node
 */
export function getNodeBackgroundColor(color: string): string {
  return getColorScheme(color).background;
}

/**
 * Gets the border color for a node
 */
export function getNodeBorderColor(color: string): string {
  return getColorScheme(color).border;
}

/**
 * Gets the edge color (uses border color for edges)
 */
export function getEdgeColor(color: string): string {
  return getColorScheme(color).border;
}

/**
 * Generates a badge SVG data URI for node type badges
 * @param label - The text to display in the badge
 * @param colorName - The color identifier (e.g., 'red', 'blue')
 * @returns Data URI string for the badge SVG
 */
export function generateBadgeSvg(label: string, colorName: string): string {
  const nodeBackgroundColor = getNodeBackgroundColor(colorName);
  const borderColor = getNodeBorderColor(colorName);
  const textColor = COLOR_MAP[colorName]?.text || '#1e293b';
  
  // Badge uses white/light background with border color for contrast
  // This ensures the badge is readable against the pastel node background
  const badgeBackground = '#ffffff'; // White background for maximum contrast
  const badgeBorder = borderColor; // Use the border color for the badge border
  
  // Truncate label if too long
  const displayLabel = label.length > 10 ? label.substring(0, 9) + '…' : label;
  
  // Create a small rounded badge SVG with padding for positioning
  // The badge is positioned at top center of the node
  // Node width is 82px, so badge can be wider while staying within bounds
  const nodeWidth = 82;
  const nodeHeight = 46;
  const badgeWidth = 64; // Increased width for better text display
  const badgeHeight = 14;
  const badgeX = (nodeWidth - badgeWidth) / 2; // Center horizontally: (82 - 64) / 2 = 9
  const badgeY = 4; // Top with gap from edge
  const textX = badgeX + badgeWidth / 2; // Center text in badge
  
  const svg = `
    <svg width="${nodeWidth}" height="${nodeHeight}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <style>
          .badge-text {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 6px;
            font-weight: 600;
            fill: ${textColor};
          }
        </style>
      </defs>
      <!-- Transparent background for positioning -->
      <rect x="0" y="0" width="${nodeWidth}" height="${nodeHeight}" fill="transparent"/>
      <!-- Badge in top center - white background with colored border for contrast -->
      <rect x="${badgeX}" y="${badgeY}" width="${badgeWidth}" height="${badgeHeight}" rx="8" fill="${badgeBackground}" stroke="${badgeBorder}" stroke-width="1.5"/>
      <text x="${textX}" y="${badgeY + 10}" text-anchor="middle" class="badge-text">${displayLabel}</text>
    </svg>
  `.trim();
  
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
}

