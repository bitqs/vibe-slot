# build/gen-audio.py — ElevenLabs 生成 BGM + 机械 SFX。
# ⚠️ 计费！每次生成消耗 ElevenLabs 额度（music ~每分钟计费，sound-generation 按次）。
#   ELEVENLABS_API_KEY=sk_... python3 build/gen-audio.py          # 全部生成
#   ELEVENLABS_API_KEY=sk_... python3 build/gen-audio.py bgm coin # 只生成指定项
# BGM 生成后自动用 ffmpeg 做首尾 4s crossfade 无缝循环 → audio/bgm.mp3
import json
import os
import subprocess
import sys
import urllib.request

KEY = os.environ["ELEVENLABS_API_KEY"]

BGM_PROMPT = (
    "1950s vintage lounge swing jazz trio, instrumental: brushed drum kit, "
    "walking upright bass, warm mellow piano comping, occasional muted trumpet. "
    "Relaxed unhurried tempo, intimate smoky bar atmosphere with subtle vinyl "
    "crackle warmth. Consistent gentle dynamics suitable for quiet background "
    "looping in a casino game, never dramatic, no vocals. Smooth seamless loop."
)

# 机械老虎机 SFX（文件名 → 提示词 + 时长秒）
SFX = {
    "coin": (
        "A single coin inserted into a vintage metal slot machine coin slot: "
        "bright metallic clink then short rattle inside the mechanism. Clean, close-mic, no reverb tail.",
        1.2,
    ),
    "lever": (
        "Vintage slot machine lever pulled and released: mechanical ratchet crank, "
        "spring tension release, solid metal thunk. Punchy, tight, no music.",
        1.5,
    ),
    "spin": (
        "Vintage mechanical slot machine reels spinning: continuous rapid ticking whirr "
        "of metal reels rotating, steady texture, loopable, no start or end accent.",
        2.5,
    ),
    "stop": (
        "A single mechanical slot machine reel stopping abruptly: heavy metal clunk "
        "with a tiny rattle settle. Short, punchy, dry.",
        0.8,
    ),
    "bell": (
        "Single vintage slot machine win bell ring: bright brass bell ding, "
        "short natural decay, cheerful, clean, no music.",
        1.0,
    ),
    "coins": (
        "A burst of many coins pouring into a metal tray of a vintage slot machine: "
        "cascading metallic clinks and jingles, about one second of coin shower.",
        1.6,
    ),
    "jackpot": (
        "Vintage casino slot machine jackpot celebration: rapid ringing mechanical bells, "
        "coins cascading into metal tray, triumphant, energetic, about three seconds, no music.",
        3.5,
    ),
}


def api(url, body):
    req = urllib.request.Request(
        url,
        data=json.dumps(body).encode(),
        headers={"xi-api-key": KEY, "Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=600) as r:
        return r.read()


def gen_bgm():
    print("生成 bgm（90s，计费较重）…")
    audio = api(
        "https://api.elevenlabs.io/v1/music",
        {"prompt": BGM_PROMPT, "music_length_ms": 90000, "model_id": "music_v1"},
    )
    raw = "audio/bgm-raw.mp3"
    os.makedirs("audio", exist_ok=True)
    with open(raw, "wb") as f:
        f.write(audio)
    print(f"{raw}: {len(audio)} bytes")
    # 首尾 4s crossfade → 无缝循环
    dur = float(
        subprocess.check_output(
            [
                "ffprobe",
                "-v",
                "quiet",
                "-show_entries",
                "format=duration",
                "-of",
                "csv=p=0",
                raw,
            ]
        ).strip()
    )
    d1 = dur - 4
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-v",
            "error",
            "-i",
            raw,
            "-filter_complex",
            f"[0]atrim=start=4:end={d1},asetpts=PTS-STARTPTS[mid];"
            f"[0]atrim=0:4,asetpts=PTS-STARTPTS[head];"
            f"[0]atrim=start={d1},asetpts=PTS-STARTPTS[tail];"
            "[tail][head]acrossfade=d=4:c1=tri:c2=tri[x];"
            "[x][mid]concat=n=2:v=0:a=1",
            "-b:a",
            "160k",
            "audio/bgm.mp3",
        ],
        check=True,
    )
    os.remove(raw)
    print(f"audio/bgm.mp3 无缝循环（{d1:.0f}s）")


def gen_sfx(name):
    prompt, dur = SFX[name]
    print(f"生成 sfx/{name}（{dur}s）…")
    audio = api(
        "https://api.elevenlabs.io/v1/sound-generation",
        {"text": prompt, "duration_seconds": dur, "prompt_influence": 0.4},
    )
    os.makedirs("audio/sfx", exist_ok=True)
    out = f"audio/sfx/{name}.mp3"
    with open(out, "wb") as f:
        f.write(audio)
    print(f"{out}: {len(audio)} bytes")


def main():
    targets = sys.argv[1:] or ["bgm", *SFX]
    for t in targets:
        if t == "bgm":
            gen_bgm()
        elif t in SFX:
            gen_sfx(t)
        else:
            print(f"未知目标 {t}，可用: bgm {' '.join(SFX)}")


if __name__ == "__main__":
    main()
