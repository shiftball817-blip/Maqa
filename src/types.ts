export type ImageStatus = 'idle' | 'generating' | 'success' | 'failed';

export interface ScenePrompt {
  id: string;
  label: string;      // e.g. "Scene 1" or "Sahne 1"
  prompt: string;     // The editable prompt text
  status: ImageStatus;
  imageUrl?: string;  // Base64 image data or URL
  error?: string;     // Error message if generation failed
  selected: boolean;  // Whether it is selected for generation/download
}

export type AspectRatio = '1:1' | '16:9' | '9:16' | '4:3' | '3:4';

export type ArtStyle = 
  | 'none'
  | 'photorealistic'
  | 'digital-art'
  | 'anime'
  | 'watercolor'
  | '3d-render'
  | 'cyberpunk'
  | 'oil-painting'
  | 'fantasy'
  | 'comic-book';
