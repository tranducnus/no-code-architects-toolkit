import os
import whisper
import srt
from datetime import timedelta
from whisper.utils import WriteSRT, WriteVTT
from services.file_management import download_file
import logging
import uuid

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

STORAGE_PATH = "/tmp/"

def process_transcription(media_url, max_chars=56, language=None):
    """Transcribe media and return all formats."""
    logger.info(f"Starting transcription for media URL: {media_url}")
    input_filename = download_file(media_url, os.path.join(STORAGE_PATH, 'input_media'))
    logger.info(f"Downloaded media to local file: {input_filename}")

    try:
        model = whisper.load_model("base")
        logger.info("Loaded Whisper model")

        # Get transcription result once
        result = model.transcribe(input_filename, language=language)
        logger.info("Transcription completed")

        # Generate all formats
        outputs = {}

        # Plain text
        outputs['plain'] = result['text']

        # SRT format
        srt_subtitles = []
        for i, segment in enumerate(result['segments'], start=1):
            start = timedelta(seconds=segment['start'])
            end = timedelta(seconds=segment['end'])
            text = segment['text'].strip()
            srt_subtitles.append(srt.Subtitle(i, start, end, text))

        srt_content = srt.compose(srt_subtitles)
        outputs['srt'] = srt_content

        # VTT format (similar to SRT with different formatting)
        vtt_content = "WEBVTT\n\n" + srt_content.replace(',', '.')
        outputs['vtt'] = vtt_content

        # ASS format
        ass_content = generate_ass_subtitle(result, max_chars)
        outputs['ass'] = ass_content

        # Write all formats to files
        file_id = str(uuid.uuid4())
        file_paths = {}

        # Save each format
        for fmt, content in outputs.items():
            ext = {'plain': 'txt', 'srt': 'srt', 'vtt': 'vtt', 'ass': 'ass'}[fmt]
            output_path = os.path.join('static', 'transcripted', f"{file_id}.{ext}")
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(content)
            file_paths[fmt] = output_path

        os.remove(input_filename)
        logger.info(f"Removed local file: {input_filename}")
        logger.info("All formats generated successfully")
        return file_paths

    except Exception as e:
        logger.error(f"Transcription failed: {str(e)}")
        raise

def generate_ass_subtitle(result, max_chars):
    """Generate ASS subtitle content with highlighted current words."""
    # ASS header
    ass_content = "[Script Info]\nScriptType: v4.00+\nPlayResX: 384\nPlayResY: 288\nScaledBorderAndShadow: yes\n\n"
    ass_content += "[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\n"
    ass_content += "Style: Default,Arial,20,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,2,2,2,10,10,10,1\n\n"
    ass_content += "[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n"

    def format_time(t):
        hours = int(t // 3600)
        minutes = int((t % 3600) // 60)
        seconds = int(t % 60)
        centiseconds = int((t % 1) * 100)
        return f"{hours}:{minutes:02d}:{seconds:02d}.{centiseconds:02d}"

    for segment in result['segments']:
        start_time = format_time(segment['start'])
        end_time = format_time(segment['end'])
        text = segment['text'].strip()

        # Split into lines if exceeds max_chars
        while len(text) > max_chars:
            split_index = text.rfind(' ', 0, max_chars)
            if split_index == -1:
                split_index = max_chars
            line = text[:split_index]
            text = text[split_index:].strip()
            ass_content += f"Dialogue: 0,{start_time},{end_time},Default,,0,0,0,,{line}\n"

        if text:
            ass_content += f"Dialogue: 0,{start_time},{end_time},Default,,0,0,0,,{text}\n"

    return ass_content