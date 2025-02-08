from flask import Blueprint
from app_utils import *
import logging
import os
from services.transcription import process_transcription
from services.authentication import authenticate
from services.cloud_storage import upload_file

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
        result = model.transcribe(input_filename)
        
        formatted_transcript = []
        for segment in result['segments']:
            start_time = timedelta(seconds=segment['start'])
            end_time = timedelta(seconds=segment['end'])
            text = segment['text'].strip()
            formatted_line = f"[{start_time} --> {end_time}] {text}"
            formatted_transcript.append(formatted_line)
            
        os.remove(input_filename)
        return "\n".join(formatted_transcript), 200
        
    except Exception as e:
        logger.error(f"Job {job_id}: Error during transcription process - {str(e)}")
        return str(e), "/transcribe-media", 500
