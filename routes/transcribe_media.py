
from flask import Blueprint, request, jsonify, send_from_directory
from app_utils import *
import logging
import os
from services.transcription import process_transcription
from services.authentication import authenticate

transcribe_bp = Blueprint('transcribe', __name__)
logger = logging.getLogger(__name__)

# Define folder to store SRT files
SRT_FOLDER = "srt_files"
os.makedirs(SRT_FOLDER, exist_ok=True)

@transcribe_bp.route('/transcribe-media', methods=['POST'])
@authenticate
@validate_payload({
    "type": "object",
    "properties": {
        "media_url": {"type": "string", "format": "uri"},
        "webhook_url": {"type": "string", "format": "uri"},
        "id": {"type": "string"}
    },
    "required": ["media_url"],
    "additionalProperties": False
})
@queue_task_wrapper(bypass_queue=False)
def transcribe_media(job_id, data):
    media_url = data['media_url']
    webhook_url = data.get('webhook_url')
    id = data.get('id')

    logger.info(f"Job {job_id}: Received transcription request for {media_url}")

    try:
        result = process_transcription(media_url, output_type='srt')
        logger.info(f"Job {job_id}: Transcription process completed successfully")

        # Save the SRT file locally
        srt_filename = f"{job_id}.srt"
        srt_path = os.path.join(SRT_FOLDER, srt_filename)
        
        with open(result, 'r') as src, open(srt_path, 'w') as dest:
            dest.write(src.read())
        
        os.remove(result)  # Remove temp file

        return {
            "message": "SRT file generated successfully",
            "srt_url": f"/download/{srt_filename}"
        }, 200

    except Exception as e:
        logger.error(f"Job {job_id}: Error during transcription process - {str(e)}")
        return str(e), 500

@transcribe_bp.route('/download/<filename>')
def download_srt(filename):
    return send_from_directory(SRT_FOLDER, filename, as_attachment=True)
