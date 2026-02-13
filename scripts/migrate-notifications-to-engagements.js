/**
 * One-time migration: notifications.json -> engagements.json + engagement-interactions.json
 * Run from project root: node scripts/migrate-notifications-to-engagements.js
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(process.cwd(), 'data');
const NOTIFICATIONS_PATH = path.join(DATA_DIR, 'notifications.json');
const ENGAGEMENTS_PATH = path.join(DATA_DIR, 'engagements.json');
const INTERACTIONS_PATH = path.join(DATA_DIR, 'engagement-interactions.json');

const DEFAULT_USER_ID = 'mahyar';

function loadJson(filePath, defaultVal = []) {
  if (!fs.existsSync(filePath)) return defaultVal;
  const raw = fs.readFileSync(filePath, 'utf-8');
  const data = JSON.parse(raw);
  return Array.isArray(data) ? data : defaultVal;
}

function saveJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

function mapType(t) {
  if (t === 'error') return 'error';
  return t; // success, info, warning, important
}

function main() {
  const notifications = loadJson(NOTIFICATIONS_PATH);
  const engagements = [];
  const interactions = [];

  for (const n of notifications) {
    const meta = { ...(n.metadata || {}) };
    if (n.title) meta.title = n.title;
    if (n.category) meta.category = n.category;
    if (n.actionUrl) meta.actionUrl = n.actionUrl;

    const engagement = {
      id: n.id,
      engagementGroupId: null,
      engagementType: 'notification',
      message: n.message || '',
      metadata: Object.keys(meta).length ? meta : undefined,
      priority: n.priority || undefined,
      type: mapType(n.type) || undefined,
      interactionType: n.interactionType || 'canRead',
      createdBy: n.createdBy,
      createdAt: n.createdAt || new Date().toISOString(),
      updatedAt: n.updatedAt,
    };
    engagements.push(engagement);

    const userId = DEFAULT_USER_ID;
    const interaction = {
      id: `ei-${n.id}-${userId}-migrated`,
      engagementId: n.id,
      userId,
      isRead: n.isRead === true,
      readAt: n.readAt || undefined,
      interactedAt: n.acknowledgedAt || undefined,
      outputType: n.acknowledgedAt ? 'approved' : undefined,
    };
    interactions.push(interaction);

    if (n.assignedTo && Array.isArray(n.assignedTo)) {
      for (const a of n.assignedTo) {
        if (a.userId && a.userId !== userId) {
          interactions.push({
            id: `ei-${n.id}-${a.userId}-migrated`,
            engagementId: n.id,
            userId: a.userId,
            isRead: false,
            readAt: undefined,
            interactedAt: a.interactedAt,
            outputType: undefined,
            comment: a.comment,
          });
        }
      }
    }
  }

  saveJson(ENGAGEMENTS_PATH, engagements);
  saveJson(INTERACTIONS_PATH, interactions);
  console.log(`Migrated ${notifications.length} notifications -> ${engagements.length} engagements, ${interactions.length} interactions.`);
}

main();
