#!/usr/bin/env python3
"""
Tiny Edge TTS server — converts text to speech using Microsoft Edge neural voices.
Runs on port 5174. No API key required.

Usage:
    python3 scripts/edge-tts-server.py

Endpoint:
    POST /tts
    Body: { "text": "...", "voice": "pt-BR-AntonioNeural" }
    Returns: audio/mpeg binary
"""

import asyncio
import json
import io
from http.server import HTTPServer, BaseHTTPRequestHandler
import edge_tts

DEFAULT_VOICE = "pt-BR-AntonioNeural"
PORT = 5174


class TTSHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        if self.path != "/tts":
            self.send_error(404)
            return

        length = int(self.headers.get("Content-Length", 0))
        body = json.loads(self.rfile.read(length)) if length else {}

        text = body.get("text", "")
        voice = body.get("voice", DEFAULT_VOICE)

        if not text:
            self.send_error(400, "Missing 'text' field")
            return

        try:
            audio = asyncio.run(self._generate(text, voice))
            self.send_response(200)
            self.send_header("Content-Type", "audio/mpeg")
            self.send_header("Content-Length", str(len(audio)))
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(audio)
        except Exception as e:
            self.send_error(500, str(e))

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def log_message(self, format, *args):
        print(f"[edge-tts] {args[0]}")

    async def _generate(self, text: str, voice: str) -> bytes:
        communicate = edge_tts.Communicate(text, voice)
        buf = io.BytesIO()
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                buf.write(chunk["data"])
        return buf.getvalue()


if __name__ == "__main__":
    print(f"[edge-tts] Server starting on http://localhost:{PORT}")
    print(f"[edge-tts] Default voice: {DEFAULT_VOICE}")
    server = HTTPServer(("127.0.0.1", PORT), TTSHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[edge-tts] Stopped")
