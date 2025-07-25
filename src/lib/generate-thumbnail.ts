import { createCanvas, registerFont, loadImage } from 'canvas';
import path from 'path';
import fs from 'fs';

// Optionally register a custom font if needed
// registerFont(path.join(process.cwd(), 'public/fonts/YourFont.ttf'), { family: 'YourFont' });

export async function generateThumbnail(title: string, options?: { width?: number; height?: number; backgroundColor?: string; textColor?: string; }): Promise<string> {
    const width = options?.width || 1280;
    const height = options?.height || 720;
    const backgroundColor = options?.backgroundColor || '#22223b';
    const textColor = options?.textColor || '#f2e9e4';
    const fontSize = Math.floor(height / 10);
    const fontFamily = 'sans-serif'; // Change if you register a custom font

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Fill background
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    // Set text styles
    ctx.font = `bold ${fontSize}px ${fontFamily}`;
    ctx.fillStyle = textColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Word wrap if title is too long
    const maxWidth = width * 0.9;
    const lines = wrapText(ctx, title, maxWidth);
    const lineHeight = fontSize * 1.2;
    const totalTextHeight = lines.length * lineHeight;
    let y = height / 2 - totalTextHeight / 2 + lineHeight / 2;

    for (const line of lines) {
        ctx.fillText(line, width / 2, y, maxWidth);
        y += lineHeight;
    }

    // Save to file
    const fileName = `thumbnail-${Date.now()}.png`;
    const filePath = path.join('public', 'uploads', 'thumbnails', fileName);

    // Ensure directory exists
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    const out = fs.createWriteStream(filePath);
    const stream = canvas.createPNGStream();
    await new Promise<void>((resolve, reject) => {
        stream.pipe(out);
        out.on('finish', () => resolve());
        out.on('error', reject);
    });
    return filePath;
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let line = '';
    for (const word of words) {
        const testLine = line ? line + ' ' + word : word;
        const { width } = ctx.measureText(testLine);
        if (width > maxWidth && line) {
            lines.push(line);
            line = word;
        } else {
            line = testLine;
        }
    }
    if (line) lines.push(line);
    return lines;
} 