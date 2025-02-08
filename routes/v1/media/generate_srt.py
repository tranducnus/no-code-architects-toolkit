
from flask import Blueprint, request
from app_utils import validate_payload, queue_task_wrapper
import logging
from services.v1.media.media_transcribe import process_transcribe_media
from services.authentication import authenticate
from services.cloud_storage import upload_file
import os

v1_media_srt_bp = Blueprint('v1_media_srt', __name__)
logger = logging.getLogger(__name__)

@v1_media_srt_bp.route('/v1/media/generate-srt', methods=['POST'])
def generate_srt():
    if 'video' not in request.form:
        return 'No video specified', 400
        
    video_name = request.form['video']
    video_path = os.path.join('static', 'uploaded', video_name)
    
    if not os.path.exists(video_path):
        return 'Video file not found', 404

    try:
        result = process_transcribe_media(
            f"file://{video_path}",
            "transcribe",
            include_text=False,
            include_srt=True,
            include_segments=False,
            word_timestamps=True,
            response_type="direct",
            language="en",
            job_id=None,
            output_format='srt'
        )
        
        return result[1] if result[1] else "No transcript generated", 200
    except Exception as e:
        logger.error(f"Error generating transcript: {str(e)}")
        return str(e), 500
