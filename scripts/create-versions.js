const fs = require('fs');
const path = require('path');

// Calculate dates between 2025-09-01 and 2025-12-01
const startDate = new Date('2025-09-01T00:00:00Z');
const endDate = new Date('2025-12-01T00:00:00Z');
const totalDays = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24)); // 91 days
const versionCount = 12;
const intervalDays = totalDays / (versionCount - 1); // ~8.27 days between versions

function getVersionDate(index) {
  const daysToAdd = index * intervalDays;
  const date = new Date(startDate);
  date.setDate(date.getDate() + Math.round(daysToAdd));
  return date.toISOString();
}

const versionsData = [
  {
    version: '0.1.000',
    timestamp: getVersionDate(0),
    changes: [
      {
        changeType: 'add',
        description: 'Next.js 16 application setup with App Router and TypeScript configuration',
        priority: 'High',
        affectedDomains: ['infrastructure']
      },
      {
        changeType: 'add',
        description: 'Tailwind CSS and ShadCN UI component library integration',
        priority: 'High',
        affectedDomains: ['ui', 'infrastructure']
      },
      {
        changeType: 'add',
        description: 'Project structure and build configuration',
        priority: 'High',
        affectedDomains: ['infrastructure']
      }
    ]
  },
  {
    version: '0.2.000',
    timestamp: getVersionDate(1),
    changes: [
      {
        changeType: 'add',
        description: 'Base domain-driven architecture with Repository pattern',
        priority: 'High',
        affectedDomains: ['architecture', 'domain']
      },
      {
        changeType: 'add',
        description: 'Service layer implementation for business logic',
        priority: 'High',
        affectedDomains: ['architecture', 'domain']
      },
      {
        changeType: 'add',
        description: 'Controller layer for HTTP request handling',
        priority: 'High',
        affectedDomains: ['architecture', 'api']
      },
      {
        changeType: 'add',
        description: 'Base types, interfaces, and error handling system',
        priority: 'Medium',
        affectedDomains: ['shared', 'types']
      }
    ]
  },
  {
    version: '0.3.000',
    timestamp: getVersionDate(2),
    changes: [
      {
        changeType: 'add',
        description: 'JSON-based data storage utilities and file management system',
        priority: 'High',
        affectedDomains: ['data', 'storage']
      },
      {
        changeType: 'add',
        description: 'Dynamic CRUD architecture with automatic API route generation',
        priority: 'High',
        affectedDomains: ['api', 'crud', 'architecture']
      },
      {
        changeType: 'add',
        description: 'ULID generation system for entity identification',
        priority: 'Medium',
        affectedDomains: ['utils', 'data']
      },
      {
        changeType: 'add',
        description: 'Shared utilities, constants, and helper functions',
        priority: 'Medium',
        affectedDomains: ['shared', 'utils']
      }
    ]
  },
  {
    version: '0.4.000',
    timestamp: getVersionDate(3),
    changes: [
      {
        changeType: 'add',
        description: 'Schema-driven form generation system with dynamic field rendering',
        priority: 'High',
        affectedDomains: ['forms', 'schema-manager']
      },
      {
        changeType: 'add',
        description: 'Schema registry and management system',
        priority: 'High',
        affectedDomains: ['schema-manager']
      },
      {
        changeType: 'add',
        description: 'Form builder components with validation and field types',
        priority: 'High',
        affectedDomains: ['form-builder', 'ui']
      },
      {
        changeType: 'add',
        description: 'Zod validation schema generation from form schemas',
        priority: 'Medium',
        affectedDomains: ['validation', 'forms']
      },
      {
        changeType: 'add',
        description: 'Dynamic page rendering system for schema-based entities',
        priority: 'High',
        affectedDomains: ['pages', 'routing']
      }
    ]
  },
  {
    version: '0.5.000',
    timestamp: getVersionDate(4),
    changes: [
      {
        changeType: 'add',
        description: 'Authentication system with JWT tokens and Argon2 password hashing',
        priority: 'High',
        affectedDomains: ['auth', 'security']
      },
      {
        changeType: 'add',
        description: 'User management system with approval workflow and OTP verification',
        priority: 'High',
        affectedDomains: ['auth', 'users']
      },
      {
        changeType: 'add',
        description: 'Password reset and change password functionality',
        priority: 'Medium',
        affectedDomains: ['auth']
      },
      {
        changeType: 'add',
        description: 'Fingerprint-based device tracking for security',
        priority: 'Medium',
        affectedDomains: ['auth', 'security']
      }
    ]
  },
  {
    version: '0.6.000',
    timestamp: getVersionDate(5),
    changes: [
      {
        changeType: 'add',
        description: 'Gradian UI design system with reusable components',
        priority: 'High',
        affectedDomains: ['gradian-ui', 'ui']
      },
      {
        changeType: 'add',
        description: 'Data display components (tables, cards, lists)',
        priority: 'High',
        affectedDomains: ['data-display', 'ui']
      },
      {
        changeType: 'add',
        description: 'Search and filtering capabilities across entities',
        priority: 'Medium',
        affectedDomains: ['data-display', 'api']
      },
      {
        changeType: 'add',
        description: 'Layout components (sidebar, header, navigation)',
        priority: 'Medium',
        affectedDomains: ['layout', 'ui']
      },
      {
        changeType: 'add',
        description: 'Theme system with dark mode support',
        priority: 'Medium',
        affectedDomains: ['ui', 'theme']
      }
    ]
  },
  {
    version: '0.7.000',
    timestamp: getVersionDate(6),
    changes: [
      {
        changeType: 'add',
        description: 'Analytics components including KPI cards, charts, and metrics',
        priority: 'High',
        affectedDomains: ['analytics', 'gradian-ui']
      },
      {
        changeType: 'add',
        description: 'Graph designer with Cytoscape integration for relationship visualization',
        priority: 'High',
        affectedDomains: ['graph-designer', 'visualization']
      },
      {
        changeType: 'add',
        description: 'Business rule engine with visual condition builder',
        priority: 'High',
        affectedDomains: ['business-rule-engine', 'automation']
      },
      {
        changeType: 'add',
        description: 'Relation manager for graph relationship editing',
        priority: 'Medium',
        affectedDomains: ['relation-manager', 'graph']
      },
      {
        changeType: 'add',
        description: 'Dashboard module with KPI tracking',
        priority: 'Medium',
        affectedDomains: ['dashboard', 'analytics']
      }
    ]
  },
  {
    version: '0.8.000',
    timestamp: getVersionDate(7),
    changes: [
      {
        changeType: 'add',
        description: 'AI Builder with LLM integration (OpenAI, OpenRouter, AvalAI)',
        priority: 'High',
        affectedDomains: ['ai-builder', 'ai']
      },
      {
        changeType: 'add',
        description: 'AI Prompts management with history and token tracking',
        priority: 'Medium',
        affectedDomains: ['ai-prompts', 'ai']
      },
      {
        changeType: 'add',
        description: 'Integrations system with sync capabilities',
        priority: 'Medium',
        affectedDomains: ['integrations']
      },
      {
        changeType: 'add',
        description: 'Email templates builder with dynamic placeholder support',
        priority: 'Medium',
        affectedDomains: ['email-templates', 'communications']
      },
      {
        changeType: 'add',
        description: 'Professional writing tools',
        priority: 'LOW',
        affectedDomains: ['professional-writing', 'tools']
      }
    ]
  },
  {
    version: '0.9.000',
    timestamp: getVersionDate(8),
    changes: [
      {
        changeType: 'add',
        description: 'Notifications system with real-time updates',
        priority: 'Medium',
        affectedDomains: ['notifications']
      },
      {
        changeType: 'add',
        description: 'Health monitoring system with service status tracking',
        priority: 'Medium',
        affectedDomains: ['health', 'monitoring']
      },
      {
        changeType: 'add',
        description: 'Settings management and application variables configuration',
        priority: 'Medium',
        affectedDomains: ['settings', 'configuration']
      },
      {
        changeType: 'add',
        description: 'IndexedDB caching system for offline support',
        priority: 'Medium',
        affectedDomains: ['indexdb-manager', 'cache']
      },
      {
        changeType: 'add',
        description: 'Calendar module for temporal graph coordination',
        priority: 'Medium',
        affectedDomains: ['calendar']
      },
      {
        changeType: 'add',
        description: 'QR code generator with customizable styles',
        priority: 'LOW',
        affectedDomains: ['tools']
      },
      {
        changeType: 'add',
        description: 'Profile management and user profiles',
        priority: 'Medium',
        affectedDomains: ['profile', 'users']
      }
    ]
  },
  {
    version: '1.0.000',
    timestamp: getVersionDate(9),
    changes: [
      {
        changeType: 'feature',
        description: 'Complete platform integration with all modules working together',
        priority: 'High',
        affectedDomains: ['platform', 'integration']
      },
      {
        changeType: 'feature',
        description: 'Production-ready features with error handling and validation',
        priority: 'High',
        affectedDomains: ['platform']
      },
      {
        changeType: 'add',
        description: 'API documentation with Swagger/OpenAPI integration',
        priority: 'Medium',
        affectedDomains: ['api-docs', 'documentation']
      },
      {
        changeType: 'add',
        description: 'Builder tools integration for schema and relation management',
        priority: 'Medium',
        affectedDomains: ['builder', 'tools']
      },
      {
        changeType: 'add',
        description: 'Multi-company support with company selector',
        priority: 'High',
        affectedDomains: ['companies', 'multi-tenancy']
      },
      {
        changeType: 'enhance',
        description: 'Responsive design improvements across all modules',
        priority: 'Medium',
        affectedDomains: ['ui', 'responsive']
      },
      {
        changeType: 'enhance',
        description: 'Performance optimizations and code improvements',
        priority: 'Medium',
        affectedDomains: ['performance', 'codebase']
      }
    ]
  },
  {
    version: '1.01.000',
    timestamp: getVersionDate(10),
    changes: [
      {
        changeType: 'add',
        description: 'Version management system with automatic versioning',
        priority: 'High',
        affectedDomains: ['version-management']
      },
      {
        changeType: 'enhance',
        description: 'UI improvements and performance optimizations',
        priority: 'Medium',
        affectedDomains: ['ui', 'performance']
      },
      {
        changeType: 'refactor',
        description: 'Code organization and structure improvements',
        priority: 'Medium',
        affectedDomains: ['codebase']
      }
    ]
  },
  {
    version: '1.01.001',
    timestamp: getVersionDate(11), // 2025-12-01
    changes: [
      {
        changeType: 'update',
        description: 'Latest fixes and refinements',
        priority: 'LOW',
        affectedDomains: ['platform']
      }
    ]
  }
];

// Read existing versions
const versionsFile = path.join(process.cwd(), 'data', 'app-versions.json');
let existingVersions = [];

if (fs.existsSync(versionsFile)) {
  const content = fs.readFileSync(versionsFile, 'utf-8');
  existingVersions = JSON.parse(content);
}

// Clear existing versions and create new ones
const { ulid } = require('ulid');

const newVersions = versionsData.map(v => ({
  id: ulid(),
  timestamp: v.timestamp,
  version: v.version,
  changes: v.changes
}));

// Write new versions (replace all)
fs.writeFileSync(versionsFile, JSON.stringify(newVersions, null, 2));
console.log(`Created ${newVersions.length} version entries`);
console.log('Versions:', newVersions.map(v => v.version).join(', '));
