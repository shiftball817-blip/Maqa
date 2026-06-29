import { ScenePrompt } from './types';

/**
 * Generates a random unique ID
 */
export function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

/**
 * Parses a script/text block and extracts prompts based on keywords (e.g., "scene", "sahne").
 * It handles both inline prompts:
 *   "Scene 1: A majestic dragon flying over a castle"
 * And multi-line/next-line prompts:
 *   "Scene 2"
 *   "A dark sorcerer brewing a green potion in a dark room."
 * 
 * @param text The full raw input text containing multiple scenes.
 * @param keywords A comma-separated list of keywords to identify scenes.
 */
export function parseScenePrompts(text: string, keywords: string = 'scene, sahne'): ScenePrompt[] {
  if (!text || text.trim() === '') return [];

  // Split keywords and create a list of lowercase trimmed terms
  const terms = keywords
    .toLowerCase()
    .split(',')
    .map((k) => k.trim())
    .filter((k) => k.length > 0);

  if (terms.length === 0) return [];

  // Create a regex to match any line starting with a keyword
  // Matches e.g. "Scene 1:", "sahne - 4", "scene: something", "scene something"
  const escapedKeywords = terms.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const sceneRegex = new RegExp(`^\\s*(${escapedKeywords})\\s*(\\d+)?\\s*[:\\-\\s\\.]*(.*)`, 'i');

  const lines = text.split(/\r?\n/);
  const parsedScenes: ScenePrompt[] = [];

  let currentScene: {
    id: string;
    label: string;
    promptLines: string[];
  } | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(sceneRegex);

    if (match) {
      // If we already have a scene we were collecting, save it
      if (currentScene) {
        const finalPrompt = currentScene.promptLines.join(' ').trim();
        parsedScenes.push({
          id: currentScene.id,
          label: currentScene.label,
          prompt: finalPrompt || `No prompt provided for ${currentScene.label}`,
          status: 'idle',
          selected: true,
        });
      }

      // Start a new scene
      const keyword = match[1]; // e.g. "Scene" or "sahne"
      const number = match[2] || ''; // e.g. "1" or ""
      const inlinePrompt = match[3] || '';

      const label = `${keyword.charAt(0).toUpperCase() + keyword.slice(1).toLowerCase()} ${number}`.trim();
      currentScene = {
        id: generateId(),
        label: label || 'Scene',
        promptLines: inlinePrompt.trim() ? [inlinePrompt.trim()] : [],
      };
    } else {
      // If we are currently collecting lines for a scene and this line isn't empty,
      // append it to the current scene's prompt list.
      if (currentScene) {
        const trimmedLine = line.trim();
        if (trimmedLine) {
          currentScene.promptLines.push(trimmedLine);
        } else if (currentScene.promptLines.length > 0) {
          // Empty line can be a separator, but let's keep accumulating until the next scene
          // or end of file, unless the user added a blank space.
        }
      }
    }
  }

  // Add the last scene if there is one
  if (currentScene) {
    const finalPrompt = currentScene.promptLines.join(' ').trim();
    parsedScenes.push({
      id: currentScene.id,
      label: currentScene.label,
      prompt: finalPrompt || `No prompt provided for ${currentScene.label}`,
      status: 'idle',
      selected: true,
    });
  }

  return parsedScenes;
}

/**
 * Triggers browser download of a blob
 */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
