
from flask import Blueprint
from app_utils import validate_payload, queue_task_wrapper
import logging
from services.v1.media.media_transcribe import process_transcription

v1_media_srt_bp = Blueprint('v1_media_srt', __name__)
logger = logging.getLogger(__name__)

@v1_media_srt_bp.route('/v1/media/generate-srt', methods=['POST'])
@validate_payload({
    "type": "object",
    "properties": {
        "media_url": {"type": "string"},
        "language": {"type": "string"},
        "generate_only_subtitles": {"type": "boolean"}
    },
    "required": ["media_url"]
})
def generate_srt(data):
    try:
        media_url = data['media_url']
        language = data.get('language', 'en')
        
        logger.info(f"Received SRT generation request for {media_url}")
        
        text, srt_content, segments = process_transcription(
            media_url=media_url,
            task='transcribe',
            include_text=True,
            include_srt=True,
            include_segments=True,
            word_timestamps=False,
            response_type='direct',
            language=language
        )
        
        if not srt_content:
            return {"error": "Failed to generate subtitles"}, 400
            
        return {
            "text": text,
            "srt": srt_content,
            "segments": segments
        }, 200

    except Exception as e:
        logger.error(f"Error during SRT generation: {str(e)}")
        return {"error": "Failed to generate subtitles. Please check your video file."}, 400
