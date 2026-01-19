/**
 * Convert total seconds to DD:HH:MM:SS format
 */
export const secondsToWatchTime = (totalSeconds: number | null): string => {
  if (!totalSeconds || totalSeconds <= 0) return "";
  
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  return `${days.toString().padStart(2, '0')}:${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

/**
 * Parse DD:HH:MM:SS format to total seconds
 * Supports flexible input: "1:30" → 90s, "1:01:30" → 3690s
 */
export const watchTimeToSeconds = (timeString: string): number | null => {
  if (!timeString || !timeString.trim()) return null;
  
  const parts = timeString.split(':').map(p => parseInt(p, 10) || 0);
  
  // Pad to 4 parts from the right (seconds, minutes, hours, days)
  while (parts.length < 4) {
    parts.unshift(0);
  }
  
  const [days, hours, minutes, seconds] = parts;
  return (days * 86400) + (hours * 3600) + (minutes * 60) + seconds;
};

/**
 * Format seconds for display in table
 */
export const formatWatchTimeDisplay = (totalSeconds: number | null): string => {
  if (!totalSeconds || totalSeconds <= 0) return "-";
  return secondsToWatchTime(totalSeconds);
};

/**
 * Convert total seconds to ##d ##h ##m ##s format (readable)
 */
export const secondsToReadableTime = (totalSeconds: number | null): string => {
  if (!totalSeconds || totalSeconds <= 0) return "-";
  
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  
  return `${days}d ${hours}h ${minutes}m ${seconds}s`;
};
