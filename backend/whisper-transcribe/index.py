import os
import json
import base64
import tempfile
import urllib.request
import urllib.error


def handler(event: dict, context) -> dict:
    """Транскрибация аудиофайла через OpenAI Whisper API."""

    cors = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
    }

    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors, "body": ""}

    try:
        body = json.loads(event.get("body") or "{}")
    except Exception:
        return {"statusCode": 400, "headers": cors, "body": json.dumps({"error": "Invalid JSON"})}

    audio_b64 = body.get("audio")
    language = body.get("language", "ru")
    file_name = body.get("fileName", "audio.m4a")

    if not audio_b64:
        return {"statusCode": 400, "headers": cors, "body": json.dumps({"error": "audio field required"})}

    api_key = os.environ.get("OPENAI_API_KEY", "")
    if not api_key:
        return {"statusCode": 500, "headers": cors, "body": json.dumps({"error": "OPENAI_API_KEY not set"})}

    # Декодируем base64 → временный файл
    try:
        audio_bytes = base64.b64decode(audio_b64)
    except Exception:
        return {"statusCode": 400, "headers": cors, "body": json.dumps({"error": "Invalid base64"})}

    # Определяем расширение для корректного mime-type
    ext = file_name.rsplit(".", 1)[-1].lower() if "." in file_name else "m4a"
    allowed = {"mp3", "mp4", "mpeg", "mpga", "m4a", "wav", "webm", "ogg"}
    if ext not in allowed:
        ext = "m4a"

    suffix = f".{ext}"

    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(audio_bytes)
        tmp_path = tmp.name

    try:
        # Формируем multipart/form-data вручную (без внешних зависимостей)
        boundary = "----WhisperBoundary7f3a9b"
        body_parts = []

        # file field
        with open(tmp_path, "rb") as f:
            file_data = f.read()

        mime_map = {
            "mp3": "audio/mpeg", "mp4": "audio/mp4", "m4a": "audio/mp4",
            "wav": "audio/wav", "webm": "audio/webm", "ogg": "audio/ogg",
            "mpeg": "audio/mpeg", "mpga": "audio/mpeg",
        }
        mime = mime_map.get(ext, "audio/mpeg")

        body_parts.append(
            f'--{boundary}\r\n'
            f'Content-Disposition: form-data; name="file"; filename="{file_name}"\r\n'
            f'Content-Type: {mime}\r\n\r\n'
        )

        # model field
        model_part = (
            f'--{boundary}\r\n'
            f'Content-Disposition: form-data; name="model"\r\n\r\n'
            f'whisper-1\r\n'
        )

        # language field
        lang_part = (
            f'--{boundary}\r\n'
            f'Content-Disposition: form-data; name="language"\r\n\r\n'
            f'{language}\r\n'
        )

        # response_format: verbose_json — даёт сегменты с timestamps
        fmt_part = (
            f'--{boundary}\r\n'
            f'Content-Disposition: form-data; name="response_format"\r\n\r\n'
            f'verbose_json\r\n'
        )

        close_part = f'--{boundary}--\r\n'

        multipart = (
            body_parts[0].encode() +
            file_data +
            f'\r\n'.encode() +
            model_part.encode() +
            lang_part.encode() +
            fmt_part.encode() +
            close_part.encode()
        )

        req = urllib.request.Request(
            "https://api.openai.com/v1/audio/transcriptions",
            data=multipart,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": f"multipart/form-data; boundary={boundary}",
            },
            method="POST",
        )

        with urllib.request.urlopen(req, timeout=120) as resp:
            result = json.loads(resp.read().decode())

    except urllib.error.HTTPError as e:
        err_body = e.read().decode()
        return {"statusCode": 502, "headers": cors, "body": json.dumps({"error": f"OpenAI error: {err_body}"})}
    except Exception as e:
        return {"statusCode": 500, "headers": cors, "body": json.dumps({"error": str(e)})}
    finally:
        try:
            os.unlink(tmp_path)
        except Exception:
            pass

    # Парсим сегменты → SpeakerLine-формат (разбиваем по паузам)
    segments = result.get("segments", [])
    full_text = result.get("text", "").strip()

    lines = []
    speaker_idx = 0
    prev_end = None
    PAUSE_THRESHOLD = 2.0  # секунды паузы → новый спикер

    for seg in segments:
        text = seg.get("text", "").strip()
        if not text:
            continue
        start = seg.get("start", 0)
        end = seg.get("end", start)

        # Определяем смену спикера по паузе
        if prev_end is not None and (start - prev_end) > PAUSE_THRESHOLD and lines:
            speaker_idx = (speaker_idx + 1) % 4

        minutes = int(start // 60)
        seconds = int(start % 60)
        time_str = f"{minutes:02d}:{seconds:02d}"

        lines.append({
            "speaker": speaker_idx,
            "text": text,
            "time": time_str,
        })
        prev_end = end

    return {
        "statusCode": 200,
        "headers": cors,
        "body": json.dumps({
            "lines": lines,
            "plain": full_text,
            "segments_count": len(lines),
        }),
    }
