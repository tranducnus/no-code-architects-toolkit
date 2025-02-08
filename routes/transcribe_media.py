
from flask import Blueprint
from app_utils import *
import logging
import os
import whisper
from datetime import timedelta

transcribe_bp = Blueprint('transcribe', __name__)
logger = logging.getLogger(__name__)

@transcribe_bp.route('/transcribe-media', methods=['POST'])
@authenticate
@validate_payload({
    "type": "object",
    "properties": {
        "media_url": {"type": "string", "format": "uri"}
    },
    "required": ["media_url"],
    "additionalProperties": False
})
def transcribe(data):
    media_url = data['media_url']
    logger.info(f"Received transcription request for {media_url}")

    try:
        model = whisper.load_model("base")
        input_filename = download_file(media_url, os.path.join(STORAGE_PATH, 'input_media'))
        logger.info(f"Downloaded file to {input_filename}")
        result = model.transcribe(input_filename)
        logger.info("Transcription completed")
        
        formatted_transcript = []
        for segment in result['segments']:
            start_time = timedelta(seconds=segment['start'])
            end_time = timedelta(seconds=segment['end'])
            text = segment['text'].strip()
            formatted_line = f"[{start_time} --> {end_time}] {text}"
            formatted_transcript.append(formatted_line)
            
        transcript_text = "\n".join(formatted_transcript)
        os.remove(input_filename)
        return transcript_text, 200
            end_time = timedelta(seconds=segment['end'])
            text = segment['text'].strip()
            formatted_line = f"[{start_time} --> {end_time}] {text}"
            formatted_transcript.append(formatted_line)
        
        os.remove(input_filename)
        transcript_text = "\n".join(formatted_transcript)
        return transcript_text, 200
    except Exception as e:
        logger.error(f"Error during transcription process - {str(e)}")
        return str(e), 500
