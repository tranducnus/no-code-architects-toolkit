
from flask import Blueprint, jsonify
from app_utils import validate_payload, queue_task_wrapper
import logging
from services.transcription import process_transcription
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
        # Use existing process_transcription with srt output type
        srt_result = process_transcription(media_url, output_type='srt', language=language)
        logger.info(f"Job {job_id}: SRT generation completed successfully")

        if not srt_result or not os.path.exists(srt_result):
            logger.error(f"Job {job_id}: SRT file not generated")
            return {"error": "Failed to generate SRT file"}, "/v1/media/generate-srt", 400

        # Return SRT content directly
        try:
            with open(srt_result, 'r') as f:
                srt_content = f.read()
            
            if not srt_content.strip():
                raise ValueError("Generated SRT file is empty")

            return {
                "job_id": job_id,
                "status": "completed",
                "result": srt_content,
                "type": "srt"
            }, "/v1/media/generate-srt", 200
        finally:
            # Clean up the temporary file
            if os.path.exists(srt_result):
                os.remove(srt_result)

    except Exception as e:
        logger.error(f"Job {job_id}: Error during SRT generation - {str(e)}")
        error_message = str(e)
        if "No such file" in error_message:
            return {"error": "Video file not found"}, "/v1/media/generate-srt", 404
        return {"error": error_message}, "/v1/media/generate-srt", 500
