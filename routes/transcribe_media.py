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
        "media_url": {"type": "string", "format": "uri"},
        "output": {"type": "string", "enum": ["transcript", "srt", "vtt", "ass"]},
        "webhook_url": {"type": "string", "format": "uri"},
        "max_chars": {"type": "integer"},
        "id": {"type": "string"}
    },
    "required": ["media_url"],
    "additionalProperties": False
})
@queue_task_wrapper(bypass_queue=False)
def transcribe(job_id, data):
    media_url = data['media_url']
    output = data.get('output', 'transcript')
    webhook_url = data.get('webhook_url')
    max_chars = data.get('max_chars', 56)
    id = data.get('id')

    logger.info(f"Job {job_id}: Received transcription request for {media_url}")

    try:
        result = process_transcription(media_url, output, max_chars)
        logger.info(f"Job {job_id}: Transcription process completed successfully")

        if output == 'srt':
            # For SRT, return as a job result
            with open(result, 'r') as f:
                content = f.read()
            os.remove(result)  # Clean up the temporary file
            return {"job_id": job_id, "status": "completed", "result": content}, 200
        elif output in ['vtt', 'ass']:
            cloud_url = upload_file(result)
            os.remove(result)  # Remove the temporary file after uploading
            return cloud_url, "/transcribe-media", 200
        else:
            return result, "/transcribe-media", 200
        
    except Exception as e:
        logger.error(f"Job {job_id}: Error during transcription process - {str(e)}")
        return str(e), "/transcribe-media", 500
