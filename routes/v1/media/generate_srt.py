
from flask import Blueprint
from app_utils import validate_payload, queue_task_wrapper
import logging
from services.v1.media.media_transcribe import process_transcription
from services.authentication import authenticate
from services.cloud_storage import upload_file

v1_media_srt_bp = Blueprint('v1_media_srt', __name__)
logger = logging.getLogger(__name__)

@v1_media_srt_bp.route('/v1/media/generate-srt', methods=['POST'])
@validate_payload({
    "type": "object",
    "properties": {
        "media_url": {"type": "string"},
        "language": {"type": "string"}
    },
    "required": ["media_url"],
    "additionalProperties": False
})
@queue_task_wrapper(bypass_queue=False)
def generate_srt(job_id, data):
    media_url = data['media_url']
    language = data.get('language', 'auto')
    webhook_url = data.get('webhook_url')
    id = data.get('id')

    logger.info(f"Job {job_id}: Received SRT generation request for {media_url}")

    try:
        result = process_transcription(media_url, output_type='srt')
        logger.info(f"Job {job_id}: SRT generation completed successfully")

        cloud_url = upload_file(result)
        logger.info(f"Job {job_id}: SRT file uploaded to cloud storage: {cloud_url}")

        return cloud_url, "/v1/media/generate-srt", 200

    except Exception as e:
        logger.error(f"Job {job_id}: Error during SRT generation - {str(e)}")
        return str(e), "/v1/media/generate-srt", 500
