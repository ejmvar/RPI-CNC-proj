/**
 * Integration tests for collaborative editing in front.html
 */

const fs = require('fs');
const path = require('path');

describe('Collaborative Editing Integration', () => {
  let frontHtmlContent;

  beforeAll(() => {
    const frontPath = path.join(__dirname, '../../Simulator/web/front.html');
    frontHtmlContent = fs.readFileSync(frontPath, 'utf8');
  });

  test('imports collaborative-client module', () => {
    expect(frontHtmlContent).toContain(
      "import * as COLLABORATIVE_CLIENT from './js/collaborative-client.mjs'"
    );
  });

  test('exposes COLLABORATIVE_CLIENT on window object', () => {
    expect(frontHtmlContent).toContain('window.COLLABORATIVE_CLIENT = COLLABORATIVE_CLIENT');
  });

  test('declares collabClient variable', () => {
    expect(frontHtmlContent).toContain('let collabClient = null');
  });

  test('declares collabEnabled variable', () => {
    expect(frontHtmlContent).toContain('let collabEnabled = false');
  });

  test('has collaborate button', () => {
    expect(frontHtmlContent).toContain('id="collab-btn"');
    expect(frontHtmlContent).toContain('onclick="toggleCollaboration()"');
    expect(frontHtmlContent).toContain('👥 Collaborate');
  });

  test('has collaboration status panel', () => {
    expect(frontHtmlContent).toContain('id="collab-status"');
    expect(frontHtmlContent).toContain('id="collab-status-text"');
    expect(frontHtmlContent).toContain('id="collab-users"');
  });

  test('has chat panel', () => {
    expect(frontHtmlContent).toContain('id="chat-panel"');
    expect(frontHtmlContent).toContain('id="chat-messages"');
    expect(frontHtmlContent).toContain('id="chat-input"');
  });

  test('defines toggleCollaboration function', () => {
    expect(frontHtmlContent).toContain('async function toggleCollaboration()');
  });

  test('defines disconnectCollaboration function', () => {
    expect(frontHtmlContent).toContain('function disconnectCollaboration()');
  });

  test('defines setupCollaborationEvents function', () => {
    expect(frontHtmlContent).toContain('function setupCollaborationEvents()');
  });

  test('defines sendChatMessage function', () => {
    expect(frontHtmlContent).toContain('function sendChatMessage()');
  });

  test('toggleCollaboration creates client instance', () => {
    expect(frontHtmlContent).toContain('new COLLABORATIVE_CLIENT.CollaborativeClient');
  });

  test('toggleCollaboration prompts for session ID', () => {
    expect(frontHtmlContent).toMatch(/prompt.*session\s+ID/i);
  });

  test('toggleCollaboration prompts for user name', () => {
    expect(frontHtmlContent).toMatch(/prompt.*name/i);
  });

  test('toggleCollaboration connects to session', () => {
    expect(frontHtmlContent).toContain('collabClient.connect(sessionId)');
  });

  test('setupCollaborationEvents registers user-joined handler', () => {
    expect(frontHtmlContent).toContain("collabClient.on('user-joined'");
  });

  test('setupCollaborationEvents registers user-left handler', () => {
    expect(frontHtmlContent).toContain("collabClient.on('user-left'");
  });

  test('setupCollaborationEvents registers remote-operation handler', () => {
    expect(frontHtmlContent).toContain("collabClient.on('remote-operation'");
  });

  test('setupCollaborationEvents registers cursor handler', () => {
    expect(frontHtmlContent).toContain("collabClient.on('cursor'");
  });

  test('setupCollaborationEvents registers chat handler', () => {
    expect(frontHtmlContent).toContain("collabClient.on('chat'");
  });

  test('setupCollaborationEvents registers disconnected handler', () => {
    expect(frontHtmlContent).toContain("collabClient.on('disconnected'");
  });

  test('setupCollaborationEvents tracks textarea input', () => {
    expect(frontHtmlContent).toContain("gcodeTextarea.addEventListener('input'");
  });

  test('calculateOperation detects insertions', () => {
    expect(frontHtmlContent).toContain('function calculateOperation');
    expect(frontHtmlContent).toMatch(/type:\s*'insert'/);
  });

  test('calculateOperation detects deletions', () => {
    expect(frontHtmlContent).toMatch(/type:\s*'delete'/);
  });

  test('applyRemoteOperation applies insert operations', () => {
    expect(frontHtmlContent).toContain('function applyRemoteOperation');
    expect(frontHtmlContent).toContain("operation.type === 'insert'");
  });

  test('applyRemoteOperation applies delete operations', () => {
    expect(frontHtmlContent).toContain("operation.type === 'delete'");
  });

  test('applyRemoteOperation suppresses textarea events', () => {
    expect(frontHtmlContent).toContain('suppressTextareaEvents = true');
  });

  test('updateUserList updates DOM', () => {
    expect(frontHtmlContent).toContain('function updateUserList');
    expect(frontHtmlContent).toContain("document.getElementById('collab-users')");
  });

  test('addUserToList creates user element', () => {
    expect(frontHtmlContent).toContain('function addUserToList');
    expect(frontHtmlContent).toContain('user.userName');
    expect(frontHtmlContent).toContain('user.color');
  });

  test('addChatMessage formats message correctly', () => {
    expect(frontHtmlContent).toContain('function addChatMessage');
    expect(frontHtmlContent).toContain('data.userName');
    expect(frontHtmlContent).toContain('data.message');
    expect(frontHtmlContent).toContain('data.timestamp');
  });

  test('sendChatMessage reads input field', () => {
    expect(frontHtmlContent).toContain("document.getElementById('chat-input')");
    expect(frontHtmlContent).toContain('collabClient.sendChat');
  });

  test('escapeHtml function prevents XSS', () => {
    expect(frontHtmlContent).toContain('function escapeHtml');
    expect(frontHtmlContent).toContain('textContent');
  });

  test('disconnectCollaboration cleans up UI', () => {
    expect(frontHtmlContent).toContain('collabClient.disconnect()');
    expect(frontHtmlContent).toContain("classList.add('hidden')");
  });
});
