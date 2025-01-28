
from flask import Flask, render_template, request, jsonify
from werkzeug.utils import secure_filename
import os
import uuid
from services.v1.video.caption_video import process_captioning_v1
from services.cloud_storage import upload_file

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = '/tmp/uploads'
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

JOBS = {}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload():
    try:
        if 'video' not in request.files:
            return jsonify({'error': 'No video file provided'}), 400
            
        video = request.files['video']
        if video.filename == '':
            return jsonify({'error': 'No selected file'}), 400

        job_id = str(uuid.uuid4())
        filename = secure_filename(video.filename)
        video_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        video.save(video_path)

        JOBS[job_id] = {
            'status': 'processing',
            'video_path': video_path
        }

        # Process in background thread
        import threading
        thread = threading.Thread(target=process_video, args=(job_id, video_path, request.form))
        thread.start()

        return jsonify({'job_id': job_id})

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/status/<job_id>')
def status(job_id):
    if job_id not in JOBS:
        return jsonify({'error': 'Job not found'}), 404
    return jsonify(JOBS[job_id])

def process_video(job_id, video_path, form_data):
    try:
        settings = {
            'font_family': form_data.get('font_family', 'Arial'),
            'font_size': int(form_data.get('font_size', 24)),
            'style': form_data.get('style', 'classic')
        }

        output_path = process_captioning_v1(
            video_path,
            form_data.get('captions', ''),
            settings,
            [],  # replace rules
            job_id
        )

        if isinstance(output_path, dict) and 'error' in output_path:
            JOBS[job_id] = {
                'status': 'failed',
                'error': output_path['error']
            }
            return

        # Upload to cloud storage
        cloud_url = upload_file(output_path)
        
        JOBS[job_id] = {
            'status': 'completed',
            'url': cloud_url
        }

    except Exception as e:
        JOBS[job_id] = {
            'status': 'failed',
            'error': str(e)
        }

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 3000))
    app.run(host='0.0.0.0', port=port)
