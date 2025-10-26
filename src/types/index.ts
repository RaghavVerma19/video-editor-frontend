export type Split = {
  id: string;
  start: number; // seconds
  end: number; // seconds
  duration: number; // seconds
  thumbnail?: string; // dataURL
  prompt?: string;
};