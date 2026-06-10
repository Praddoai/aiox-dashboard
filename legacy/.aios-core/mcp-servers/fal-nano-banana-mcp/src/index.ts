#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { fal } from "@fal-ai/client";

// Configure fal.ai client
fal.config({
  credentials: process.env.FAL_KEY,
});

// Tool definitions
const TOOLS: Tool[] = [
  {
    name: "nano_banana_generate",
    description:
      "Generate images using Nano Banana Pro model with text prompts. Fast, high-quality image generation.",
    inputSchema: {
      type: "object" as const,
      properties: {
        prompt: {
          type: "string",
          description: "Text description of the image to generate",
        },
        aspect_ratio: {
          type: "string",
          enum: ["1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3"],
          description: "Aspect ratio of the generated image (default: 1:1)",
        },
        num_images: {
          type: "number",
          description: "Number of images to generate (1-4, default: 1)",
          minimum: 1,
          maximum: 4,
        },
      },
      required: ["prompt"],
    },
  },
  {
    name: "nano_banana_edit",
    description:
      "Edit or transform images using Nano Banana Pro with reference images. Provide up to 2 reference images along with a text prompt describing the desired edit or transformation.",
    inputSchema: {
      type: "object" as const,
      properties: {
        prompt: {
          type: "string",
          description:
            "Text description of the desired edit or transformation",
        },
        image_urls: {
          type: "array",
          items: {
            type: "string",
          },
          description:
            "Array of image URLs to use as reference (1-2 images). Can be public URLs or base64 data URIs",
          minItems: 1,
          maxItems: 2,
        },
      },
      required: ["prompt", "image_urls"],
    },
  },
  {
    name: "nano_banana_edit_base64",
    description:
      "Edit images using Nano Banana Pro with base64-encoded reference images. Use this when you have image data rather than URLs.",
    inputSchema: {
      type: "object" as const,
      properties: {
        prompt: {
          type: "string",
          description:
            "Text description of the desired edit or transformation",
        },
        images_base64: {
          type: "array",
          items: {
            type: "object",
            properties: {
              data: {
                type: "string",
                description: "Base64-encoded image data",
              },
              mime_type: {
                type: "string",
                enum: ["image/png", "image/jpeg", "image/webp"],
                description: "MIME type of the image",
              },
            },
            required: ["data", "mime_type"],
          },
          description: "Array of base64-encoded images (1-2 images)",
          minItems: 1,
          maxItems: 2,
        },
      },
      required: ["prompt", "images_base64"],
    },
  },
];

// Type definitions for fal.ai responses
interface FalImage {
  url: string;
  width?: number;
  height?: number;
  content_type?: string;
}

interface FalGenerateResult {
  images: FalImage[];
  description?: string;
}

interface FalEditResult {
  images: FalImage[];
  description?: string;
}

// Server implementation
const server = new Server(
  {
    name: "fal-nano-banana-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "nano_banana_generate": {
        type AspectRatio = "1:1" | "16:9" | "9:16" | "4:3" | "3:4" | "3:2" | "2:3";
        const input = args as {
          prompt: string;
          aspect_ratio?: AspectRatio;
          num_images?: number;
        };

        const result = await fal.subscribe("fal-ai/nano-banana-pro", {
          input: {
            prompt: input.prompt,
            aspect_ratio: (input.aspect_ratio || "1:1") as AspectRatio,
            num_images: input.num_images || 1,
          },
        });

        const data = result.data as FalGenerateResult;

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  images: data.images.map((img: FalImage) => ({
                    url: img.url,
                    width: img.width,
                    height: img.height,
                  })),
                  description: data.description,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "nano_banana_edit": {
        const input = args as {
          prompt: string;
          image_urls: string[];
        };

        if (!input.image_urls || input.image_urls.length === 0) {
          throw new Error("At least one image URL is required");
        }

        if (input.image_urls.length > 2) {
          throw new Error("Maximum 2 reference images allowed");
        }

        const result = await fal.subscribe("fal-ai/nano-banana-pro/edit", {
          input: {
            prompt: input.prompt,
            image_urls: input.image_urls,
          },
        });

        const data = result.data as FalEditResult;

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  images: data.images.map((img: FalImage) => ({
                    url: img.url,
                    width: img.width,
                    height: img.height,
                  })),
                  description: data.description,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "nano_banana_edit_base64": {
        const input = args as {
          prompt: string;
          images_base64: Array<{
            data: string;
            mime_type: string;
          }>;
        };

        if (!input.images_base64 || input.images_base64.length === 0) {
          throw new Error("At least one base64 image is required");
        }

        if (input.images_base64.length > 2) {
          throw new Error("Maximum 2 reference images allowed");
        }

        // Convert base64 to data URIs
        const imageUrls = input.images_base64.map(
          (img) => `data:${img.mime_type};base64,${img.data}`
        );

        const result = await fal.subscribe("fal-ai/nano-banana-pro/edit", {
          input: {
            prompt: input.prompt,
            image_urls: imageUrls,
          },
        });

        const data = result.data as FalEditResult;

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  images: data.images.map((img: FalImage) => ({
                    url: img.url,
                    width: img.width,
                    height: img.height,
                  })),
                  description: data.description,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              success: false,
              error: errorMessage,
            },
            null,
            2
          ),
        },
      ],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Nano Banana MCP server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
