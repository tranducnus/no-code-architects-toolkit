from flask import Blueprint, request, jsonify
from app_utils import validate_payload, queue_task_wrapper
import logging
from services.v1.video.caption_video import process_captioning_v1, generate_transcription
from services.authentication import authenticate
import os

v1_video_caption_bp = Blueprint('v1_video/caption', __name__)
logger = logging.getLogger(__name__)

@v1_video_caption_bp.route('/v1/video/transcribe', methods=['POST'])
@authenticate
@validate_payload({
    "type": "object",
    "properties": {
        "video_url": {"type": "string", "format": "uri"},
        "language": {"type": "string"}
    },
    "required": ["video_url"],
    "additionalProperties": False
})
def transcribe_video():
    video_url = request.json['video_url']
    language = request.json.get('language', 'auto')

    try:
        transcription = generate_transcription(video_url, language)
        return jsonify({"segments": transcription["segments"]})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@v1_video_caption_bp.route('/v1/video/preview', methods=['POST'])
@authenticate
@validate_payload({
    "type": "object",
    "properties": {
        "video_url": {"type": "string", "format": "uri"},
        "segments": {"type": "array"},
        "settings": {
            "type": "object",
            "properties": {
                "font_family": {"type": "string"},
                "font_size": {"type": "integer"},
                "style": {"type": "string"},
                "position": {"type": "string"},
                "line_color": {"type": "string"},
                "word_color": {"type": "string"}
            }
        }
    },
    "required": ["video_url", "segments", "settings"],
    "additionalProperties": False
})
def preview_captions():
    try:
        # Generate preview without creating video
        settings = request.json['settings']
        preview_data = {
            "font_preview": settings['font_family'],
            "style_preview": settings['style'],
            "position_preview": settings['position']
        }
        return jsonify(preview_data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@v1_video_caption_bp.route('/v1/video/export', methods=['POST'])
@authenticate
@validate_payload({
    "type": "object",
    "properties": {
        "video_url": {"type": "string", "format": "uri"},
        "segments": {"type": "array"},
        "settings": {
            "type": "object",
            "properties": {
                "font_family": {"type": "string"},
                "font_size": {"type": "integer"},
                "style": {"type": "string"},
                "position": {"type": "string"},
                "line_color": {"type": "string"},
                "word_color": {"type": "string"}
            }
        }
    },
    "required": ["video_url", "segments", "settings"],
    "additionalProperties": False
})
@queue_task_wrapper(bypass_queue=False)
def export_video(job_id, data):
    try:
        output = process_captioning_v1(
            data['video_url'],
            data['segments'],
            data['settings'],
            [],
            job_id
        )

        if isinstance(output, dict) and 'error' in output:
            return jsonify(output), 400

        return jsonify({"url": output})
    except Exception as e:
        return jsonify({"error": str(e)}), 500