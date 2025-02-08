from flask import Blueprint, jsonify, request
from app_utils import validate_payload
import logging
from services.v1.media.media_transcribe import process_transcription
from services.authentication import authenticate
import os

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
def generate_srt():
    """Generate SRT file from media."""
    try:
        data = request.get_json()
        media_url = data['media_url']
        language = data.get('language')

        logger.info(f"Received SRT generation request for {media_url}")

        if not media_url:
            raise ValueError("No media URL provided")

        logger.info(f"Processing media from {media_url}")
        result = process_transcription(media_url, output_type='srt', language=language)

        if not result:
            raise ValueError("No SRT content generated")

        logger.info(f"SRT generation completed successfully")

        return jsonify({
            "status": "completed",
            "srt": result
        }), 200

    except Exception as e:
        error_msg = f"Error during SRT generation - {str(e)}"
        logger.error(error_msg)
        return jsonify({
            "error": str(e),
            "status": "failed",
            "details": error_msg
        }), 500