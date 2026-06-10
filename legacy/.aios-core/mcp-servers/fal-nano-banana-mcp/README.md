# Nano Banana Pro MCP Server

MCP server for fal.ai's Nano Banana Pro model with full support for reference image editing.

## Features

- **Text-to-Image Generation**: Generate images from text prompts
- **Image Editing with References**: Edit/transform images using 1-2 reference images
- **Base64 Support**: Send images directly as base64-encoded data
- **Multiple Output Support**: Generate up to 4 images at once

## Tools Available

### 1. `nano_banana_generate`
Generate images from text prompts.

```json
{
  "prompt": "A serene mountain landscape at sunset",
  "aspect_ratio": "16:9",
  "num_images": 2
}
```

### 2. `nano_banana_edit`
Edit images using reference URLs with text prompts.

```json
{
  "prompt": "Make the person wear a red dress instead",
  "image_urls": [
    "https://example.com/reference-image.jpg"
  ]
}
```

### 3. `nano_banana_edit_base64`
Edit images using base64-encoded data.

```json
{
  "prompt": "Change the background to a beach scene",
  "images_base64": [
    {
      "data": "iVBORw0KGgo...",
      "mime_type": "image/png"
    }
  ]
}
```

## Installation

### Option 1: Direct from source (recommended)

```bash
cd .aios-core/mcp-servers/fal-nano-banana-mcp
npm install
npm run build
```

Add to Claude Desktop config (`~/.claude.json`):

```json
{
  "mcpServers": {
    "fal-nano-banana": {
      "type": "stdio",
      "command": "node",
      "args": ["/path/to/aios-core-meta-gpt/.aios-core/mcp-servers/fal-nano-banana-mcp/dist/index.js"],
      "env": {
        "FAL_KEY": "your-fal-api-key-here"
      }
    }
  }
}
```

### Option 2: Using npx (after publishing)

```json
{
  "mcpServers": {
    "fal-nano-banana": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "fal-nano-banana-mcp"],
      "env": {
        "FAL_KEY": "your-fal-api-key-here"
      }
    }
  }
}
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `FAL_KEY` | Yes | Your fal.ai API key |

## API Endpoints Used

- `fal-ai/nano-banana-pro` - Text-to-image generation
- `fal-ai/nano-banana-pro/edit` - Image editing with references

## Pricing

- **Generation**: ~$0.15 per image
- **Editing**: ~$0.15 per image

## Usage Examples

### Generate a thumbnail for YouTube
```
Use nano_banana_generate with prompt: "Professional YouTube thumbnail showing a massage therapist demonstrating trigger point therapy, vibrant colors, text overlay space on left"
```

### Edit an existing photo
```
Use nano_banana_edit with:
- prompt: "Add a professional clinic background, soft lighting"
- image_urls: ["https://your-cdn.com/expert-photo.jpg"]
```

### Combine two reference images
```
Use nano_banana_edit with:
- prompt: "Create a composite image with the person from the first image in the setting from the second image"
- image_urls: ["https://example.com/person.jpg", "https://example.com/background.jpg"]
```

## Limitations

- Maximum 2 reference images per edit request
- Maximum 4 output images per request
- Images must be publicly accessible URLs or valid base64 data URIs
- Supported formats: PNG, JPEG, WebP, AVIF, HEIF

## License

MIT
