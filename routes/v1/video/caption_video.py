from flask import Blueprint, jsonify
from app_utils import validate_payload, queue_task_wrapper
import logging
from services.v1.video.caption_video import process_captioning_v1
from services.authentication import authenticate
from services.cloud_storage import upload_file
import os
import requests  # Ensure requests is imported for webhook handling

v1_video_caption_bp = Blueprint('v1_video/caption', __name__)
logger = logging.getLogger(__name__)

@v1_video_caption_bp.route('/v1/video/caption', methods=['POST'])
@authenticate
@validate_payload({
    "type": "object",
    "properties": {
        "video_url": {"type": "string", "format": "uri"},
        "captions": {"type": "string"},
        "settings": {
            "type": "object",
            "properties": {
                "line_color": {"type": "string"},
                "word_color": {"type": "string"},
                "outline_color": {"type": "string"},
                "all_caps": {"type": "boolean"},
                "max_words_per_line": {"type": "integer"},
                "x": {"type": "integer"},
                "y": {"type": "integer"},
                "position": {
                    "type": "string",
                    "enum": [
                        "bottom_left", "bottom_center", "bottom_right",
                        "middle_left", "middle_center", "middle_right",
                        "top_left", "top_center", "top_right"
                    ]
                },
                "alignment": {
                    "type": "string",
                    "enum": ["left", "center", "right"]
                },
                "font_family": {"type": "string"},
                "font_size": {"type": "integer"},
                "bold": {"type": "boolean"},
                "italic": {"type": "boolean"},
                "underline": {"type": "boolean"},
                "strikeout": {"type": "boolean"},
                "style": {
                    "type": "string",
                    "enum": ["classic", "karaoke", "highlight", "underline", "word_by_word"]
                },
                "outline_width": {"type": "integer"},
                "spacing": {"type": "integer"},
                "angle": {"type": "integer"},
                "shadow_offset": {"type": "integer"}
            },
            "additionalProperties": False
        },
        "replace": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "find": {"type": "string"},
                    "replace": {"type": "string"}
                },
                "required": ["find", "replace"]
            }
        },
        "webhook_url": {"type": "string", "format": "uri"},
        "id": {"type": "string"},
        "language": {"type": "string"}
    },
    "required": ["video_url"],
    "additionalProperties": False
})
@queue_task_wrapper(bypass_queue=False)
def caption_video_v1(job_id, data):
    video_url = data['video_url']
    captions = data.get('captions')
    settings = data.get('settings', {})
    replace = data.get('replace', [])
    webhook_url = data.get('webhook_url')
    id = data.get('id')
    language = data.get('language', 'auto')

    logger.info(f"Job {job_id}: Received v1 captioning request for {video_url}")
    logger.info(f"Job {job_id}: Settings received: {settings}")
    logger.info(f"Job {job_id}: Replace rules received: {replace}")

    try:
        # Do NOT combine position and alignment. Keep them separate.
        # Just pass settings directly to process_captioning_v1.
        # This ensures position and alignment remain independent keys.
        
        # Process video with the enhanced v1 service
        output = process_captioning_v1(video_url, captions, settings, replace, job_id, language)
        
        if isinstance(output, dict) and 'error' in output:
            # Check if this is a font-related error by checking for 'available_fonts' key
            if 'available_fonts' in output:
                # Font error scenario
                return {"error": output['error'], "available_fonts": output['available_fonts']}, "/v1/caption-video", 400
            else:
                # Non-font error scenario, do not return available_fonts
                return {"error": output['error']}, "/v1/video/caption", 400

        # If processing was successful, output is the file path
        output_path = output
        logger.info(f"Job {job_id}: Captioning process completed successfully")

        # Upload the captioned video
        cloud_url = upload_file(output_path)
        logger.info(f"Job {job_id}: Captioned video uploaded to cloud storage: {cloud_url}")

        # Clean up the output file after upload
        os.remove(output_path)
        logger.info(f"Job {job_id}: Cleaned up local output file")

        return cloud_url, "/v1/video/caption", 200

    except Exception as e:
        logger.error(f"Job {job_id}: Error during captioning process - {str(e)}", exc_info=True)
        return {"error": str(e)}, "/v1/video/caption", 500
