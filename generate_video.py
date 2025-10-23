import requests, subprocess, os

# ==== CONFIG ====
HF_TOKEN = os.getenv("HF_TOKEN") or "<YOUR_HF_TOKEN>"  # or set in Codespaces secrets
API_URL = "https://api-inference.huggingface.co/models/damo-vilab/text-to-video-ms-1.7b"

prompt = input("🎬 Enter your prompt: ") or "a futuristic city skyline at sunset, cinematic lighting"

headers = {"Authorization": f"Bearer {HF_TOKEN}"}

print("\n🚀 Generating base 4-second clip from Hugging Face GPU...")
response = requests.post(API_URL, headers=headers, json={"inputs": prompt})
if response.status_code != 200:
    print("❌ Error:", response.text)
    exit()

with open("base.mp4", "wb") as f:
    f.write(response.content)

print("✅ Saved base.mp4 (≈4 s video)")

# ==== Extend to 10 s by looping 3× ====
print("🎞️ Extending to ~10 s using FFmpeg looping...")
cmd = [
    "ffmpeg", "-y",
    "-stream_loop", "2", "-i", "base.mp4",
    "-c", "copy", "output_10s.mp4"
]
subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
print("✅ Saved output_10s.mp4 (≈10 s)")
