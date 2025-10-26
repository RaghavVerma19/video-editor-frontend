export async function captureThumbnail(video: HTMLVideoElement, time: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const wasPaused = video.paused;
    const handleSeeked = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 320;
        canvas.height = video.videoHeight || 180;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('2d context not available');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const data = canvas.toDataURL('image/png');
        if (!wasPaused) video.play().catch(() => {});
        video.removeEventListener('seeked', handleSeeked);
        resolve(data);
      } catch (e) {
        reject(e);
      }
    };
    video.addEventListener('seeked', handleSeeked);
    try {
      // clamp
      const t = Math.min(Math.max(time, 0), video.duration || 0);
      video.currentTime = t;
    } catch (e) {
      video.removeEventListener('seeked', handleSeeked);
      reject(e);
    }
  });
}
