#!/usr/bin/env python3
"""
ElevenLabs Audio Ingestion and Generation Utility
Module: tools/elevenlabs_generator.py

Use this script to generate or slice voice guidance clips using the ElevenLabs API.
Voice profile: Matches Hugh (British, warm, deep, contemplative).
"""

import os
import sys
import json
import argparse
import urllib.request
import urllib.error

ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1/text-to-speech"
# Hugh default voice ID (or user specified voice ID)
DEFAULT_VOICE_ID = "EXAVITQu4vr4xnSDxMaL"  # Contemplative warm voice

def generate_clip(text: str, output_path: str, api_key: str, voice_id: str = DEFAULT_VOICE_ID):
    headers = {
        "Accept": "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": api_key
    }
    
    payload = {
        "text": text,
        "model_id": "eleven_turbo_v2_5",
        "voice_settings": {
            "stability": 0.65,
            "similarity_boost": 0.85,
            "style": 0.15,
            "use_speaker_boost": True
        }
    }
    
    url = f"{ELEVENLABS_API_URL}/{voice_id}"
    req = urllib.request.Request(url, data=json.dumps(payload).encode("utf-8"), headers=headers, method="POST")
    
    print(f"Generating clip: \"{text}\" -> {output_path}")
    try:
        with urllib.request.urlopen(req) as response:
            with open(output_path, "wb") as f:
                f.write(response.read())
        print(f"Successfully saved {output_path}")
    except urllib.error.HTTPError as e:
        print(f"Error calling ElevenLabs API: {e.code} - {e.read().decode('utf-8')}", file=sys.stderr)
        sys.exit(1)

def main():
    parser = argparse.ArgumentParser(description="Generate meditation clips via ElevenLabs")
    parser.add_argument("--text", required=True, help="Instructional meditation sentence to synthesize")
    parser.add_argument("--out", required=True, help="Output mp3 file path")
    parser.add_argument("--voice-id", default=DEFAULT_VOICE_ID, help="ElevenLabs Voice ID")
    args = parser.parse_args()

    api_key = os.environ.get("ELEVENLABS_API_KEY")
    if not api_key:
        print("Error: ELEVENLABS_API_KEY environment variable is not set.", file=sys.stderr)
        print("Please set your key: export ELEVENLABS_API_KEY='your_key_here'", file=sys.stderr)
        sys.exit(1)

    os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)
    generate_clip(args.text, args.out, api_key, args.voice_id)

if __name__ == "__main__":
    main()
