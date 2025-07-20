// Placeholder for tagging utilities
export function generateTag(prefix: string, timestamp?: number): string {
    return `${prefix}_${timestamp || Date.now()}`;
}

export function parseTag(tag: string): { prefix: string; timestamp: number } | null {
    const parts = tag.split('_');
    if (parts.length !== 2) return null;
    
    const timestamp = parseInt(parts[1]);
    if (isNaN(timestamp)) return null;
    
    return { prefix: parts[0], timestamp };
}