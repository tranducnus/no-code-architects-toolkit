from flask import Blueprint
from app_utils import *
import logging
import os
from services.v1.media.media_transcribe import process_transcribe_media
from services.authentication import authenticate
from services.cloud_storage import upload_file

v1_media_transcribe_bp = Blueprint('v1_media_transcribe', __name__)
logger = logging.getLogger(__name__)

@v1_media_transcribe_bp.route('/v1/media/transcribe', methods=['POST'])
@authenticate
@validate_payload({
    "type": "object",
    "properties": {
        "media_url": {"type": "string", "format": "uri"},
        "task": {"type": "string", "enum": ["transcribe", "translate"]},
        "include_text": {"type": "boolean"},
        "include_srt": {"type": "boolean"},
        "include_segments": {"type": "boolean"},
        "word_timestamps": {"type": "boolean"},
        "response_type": {"type": "string", "enum": ["direct", "cloud"]},
        "language": {"type": "string"},
        "webhook_url": {"type": "string", "format": "uri"},
        "id": {"type": "string"}
    },
    "required": ["media_url"],
    "additionalProperties": False
})
@queue_task_wrapper(bypass_queue=False)
def transcribe(job_id, data):
    media_url = data['media_url']
    task = data.get('task', 'transcribe')
    include_text = data.get('include_text', True)
    include_srt = data.get('include_srt', False)
    include_segments = data.get('include_segments', False)
    word_timestamps = data.get('word_timestamps', False)
    response_type = data.get('response_type', 'direct')
    language = data.get('language', None)
    webhook_url = data.get('webhook_url')
    id = data.get('id')

    logger.info(f"Job {job_id}: Received transcription request for {media_url}")

    try:
        result = process_transcribe_media(media_url, task, include_text, include_srt, include_segments, word_timestamps, response_type, language, job_id)
        logger.info(f"Job {job_id}: Transcription process completed successfully")

        # If the result is a file path, upload it using the unified upload_file() method
        if response_type == "direct":
           
            result_json = {
                "text": result[0],
                "srt": result[1],
                "segments": result[2]
            }

            return result_json, "/v1/transcribe/media", 200

        else:

            cloud_urls = {
                "text": upload_file(result[0]) if include_text is True else None,
                "srt": upload_file(result[1]) if include_srt is True else None,
                "segments": upload_file(result[2]) if include_segments is True else None,
            }

            if include_text is True:
                os.remove(result[0])  # Remove the temporary file after uploading
            
            if include_srt is True:
                os.remove(result[1])

            if include_segments is True:
                os.remove(result[2])
            
            return cloud_urls, "/v1/transcribe/media", 200

    except Exception as e:
        logger.error(f"Job {job_id}: Error during transcription process - {str(e)}")
        return str(e), "/v1/transcribe/media", 500
