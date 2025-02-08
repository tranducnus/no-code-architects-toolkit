
from flask import Blueprint
from app_utils import validate_payload, queue_task_wrapper
import logging
from services.v1.media.media_transcribe import process_transcription
from services.authentication import authenticate
from services.cloud_storage import upload_file

v1_media_srt_bp = Blueprint('v1_media_srt', __name__)
logger = logging.getLogger(__name__)

@v1_media_srt_bp.route('/v1/media/generate-srt', methods=['POST'])
@authenticate
@validate_payload({
    "type": "object",
    "properties": {
        "media_url": {"type": "string", "format": "uri"},
        "language": {"type": "string"},
        "webhook_url": {"type": "string", "format": "uri"},
        "id": {"type": "string"}
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
from flask import Blueprint, jsonify
from app_utils import validate_payload, queue_task_wrapper
import logging
from services.transcription import process_transcription
from services.authentication import authenticate

v1_media_srt_bp = Blueprint('v1_media_srt', __name__)
logger = logging.getLogger(__name__)

@v1_media_srt_bp.route('/v1/media/generate-srt', methods=['POST'])
@authenticate
@validate_payload({
    "type": "object",
    "properties": {
        "media_url": {"type": "string", "format": "uri"},
        "language": {"type": "string"}
    },
    "required": ["media_url"],
    "additionalProperties": False
})
@queue_task_wrapper(bypass_queue=False)
def generate_srt(job_id, data):
    """Generate SRT file from media."""
    media_url = data['media_url']
    language = data.get('language')

    logger.info(f"Job {job_id}: Received SRT generation request for {media_url}")

    try:
        result = process_transcription(media_url, output_type='srt', language=language)
        logger.info(f"Job {job_id}: SRT generation completed successfully")

        # Read the generated SRT content
        with open(result, 'r') as f:
            srt_content = f.read()
            
        return jsonify({
            "job_id": job_id,
            "status": "completed",
            "srt": srt_content
        }), 200

    except Exception as e:
        logger.error(f"Job {job_id}: Error during SRT generation - {str(e)}")
        return jsonify({
            "error": str(e),
            "status": "failed"
        }), 500
