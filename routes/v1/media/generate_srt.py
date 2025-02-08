
from flask import Blueprint, send_file
from app_utils import validate_payload, queue_task_wrapper
import logging
from services.transcription import process_transcription
from services.authentication import authenticate
import os

v1_media_srt_bp = Blueprint('v1_media_srt', __name__)
logger = logging.getLogger(__name__)

@v1_media_srt_bp.route('/api/v1/media/generate-srt-video', methods=['POST'])
@authenticate
@validate_payload({
    "type": "object",
    "properties": {
        "video_url": {"type": "string"},
        "language": {"type": "string"}
    },
    "required": ["video_url"],
    "additionalProperties": False
})
@queue_task_wrapper(bypass_queue=False)
def generate_srt_video(job_id, data):
    video_url = data['video_url']
    language = data.get('language', 'auto')

    logger.info(f"Job {job_id}: Received SRT generation request for video {video_url}")

    try:
        srt_result = process_transcription(video_url, output_type='srt', language=language)
        logger.info(f"Job {job_id}: SRT generation completed successfully")

        return {
            "job_id": job_id,
            "status": "completed",
            "result": srt_result,
            "type": "srt"
        }, 200

    except Exception as e:
        logger.error(f"Job {job_id}: Error during SRT generation - {str(e)}")
        return {"error": str(e)}, 500
