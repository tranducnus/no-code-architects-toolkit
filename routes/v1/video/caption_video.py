
from flask import Blueprint, jsonify, request
from app_utils import validate_payload, queue_task_wrapper
import logging
from services.v1.video.caption_video import generate_transcription, process_captioning_v1
from services.authentication import authenticate
import os

v1_video_caption_bp = Blueprint('v1_video/caption', __name__)
logger = logging.getLogger(__name__)

@v1_video_caption_bp.route('/api/v1/video/generate-transcript', methods=['POST'])
@authenticate
@validate_payload({
    "type": "object",
    "properties": {
        "video": {"type": "string"}
    },
    "required": ["video"],
    "additionalProperties": False
})
def generate_transcript():
    video = request.json['video']
    video_path = os.path.join(os.getcwd(), 'static', 'uploaded', video)
    
    try:
        # Validate video directory exists
        video_dir = os.path.dirname(video_path)
        if not os.path.exists(video_dir):
            os.makedirs(video_dir, exist_ok=True)
            logger.info(f"Created video directory: {video_dir}")

        if not os.path.exists(video_path):
            logger.error(f"Video file not found: {video_path}")
            return jsonify({"error": "Video file not found"}), 404
            
        result = generate_transcription(video_path)
        if not result:
            logger.error("Transcription returned None")
            return jsonify({"error": "Transcription failed - no result"}), 500
            
        if not isinstance(result, dict):
            logger.error(f"Invalid transcription result type: {type(result)}")
            return jsonify({"error": "Invalid transcription result type"}), 500
            
        if 'text' not in result:
            logger.error("Transcription result missing 'text' field")
            return jsonify({"error": "Invalid transcription result format"}), 500
            
        return jsonify({
            "transcript": result['text']
        })
    except Exception as e:
        logger.error(f"Transcription error: {str(e)}", exc_info=True)
        return jsonify({"error": f"Transcription failed: {str(e)}"}), 500

@v1_video_caption_bp.route('/api/v1/video/preview-captions', methods=['POST'])
@authenticate
@validate_payload({
    "type": "object",
    "properties": {
        "video": {"type": "string"},
        "transcript": {"type": "string"},
        "settings": {
            "type": "object",
            "properties": {
                "font_family": {"type": "string"},
                "font_size": {"type": "integer"},
                "style": {"type": "string"},
                "line_color": {"type": "string"},
                "position": {"type": "string"}
            }
        }
    },
    "required": ["video", "transcript", "settings"],
    "additionalProperties": False
})
def preview_captions():
    data = request.json
    video_path = os.path.join('static', 'uploaded', data['video'])
    
    try:
        preview_path = process_captioning_v1(
            video_path,
            data['transcript'],
            data['settings'],
            [],
            f"preview_{os.path.basename(video_path)}"
        )
        
        if isinstance(preview_path, dict) and 'error' in preview_path:
            return jsonify(preview_path), 400
            
        preview_url = f"/static/processed/{os.path.basename(preview_path)}"
        return jsonify({"preview_url": preview_url})
    except Exception as e:
        logger.error(f"Preview error: {str(e)}")
        return jsonify({"error": str(e)}), 500

@v1_video_caption_bp.route('/api/v1/video/export', methods=['POST'])
@authenticate
@validate_payload({
    "type": "object",
    "properties": {
        "video": {"type": "string"},
        "transcript": {"type": "string"},
        "settings": {
            "type": "object",
            "properties": {
                "font_family": {"type": "string"},
                "font_size": {"type": "integer"},
                "style": {"type": "string"},
                "line_color": {"type": "string"},
                "position": {"type": "string"}
            }
        }
    },
    "required": ["video", "transcript", "settings"],
    "additionalProperties": False
})
def export_video():
    data = request.json
    video_path = os.path.join('static', 'uploaded', data['video'])
    
    try:
        output_path = process_captioning_v1(
            video_path,
            data['transcript'],
            data['settings'],
            [],
            f"final_{os.path.basename(video_path)}"
        )
        
        if isinstance(output_path, dict) and 'error' in output_path:
            return jsonify(output_path), 400
            
        output_url = f"/static/processed/{os.path.basename(output_path)}"
        return jsonify({"url": output_url})
    except Exception as e:
        logger.error(f"Export error: {str(e)}")
        return jsonify({"error": str(e)}), 500
