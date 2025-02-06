
from flask import Flask, render_template, request, jsonify
from werkzeug.utils import secure_filename
import os
import uuid
from services.v1.video.caption_video import process_captioning_v1

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = '/tmp/uploads'
app.config['OUTPUT_FOLDER'] = os.path.join('static', 'uploads')
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
os.makedirs(app.config['OUTPUT_FOLDER'], exist_ok=True)

JOBS = {}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload():
    try:
        print("Received upload request")
        if 'video' not in request.files:
            print("No video file in request")
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

@app.route('/preview')
def preview():
    uploads_dir = os.path.join('static', 'uploads')
    videos = []
    for filename in os.listdir(uploads_dir):
        if filename.endswith('.mp4'):
            base_name = filename.rsplit('_', 1)[0]
            processed = next((f for f in os.listdir(uploads_dir) 
                            if f.startswith(base_name) and 'captioned' in f), None)
            videos.append({'filename': filename, 'processed': processed})
    return render_template('preview.html', videos=videos)

        }

        # Process in background thread
        import threading
        thread = threading.Thread(target=process_video, args=(job_id, video_path, request.form))
        thread.start()

        return jsonify({'job_id': job_id, 'redirect': '/preview'})

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/status/<job_id>')
def status(job_id):
    if job_id not in JOBS:
        return jsonify({'error': 'Job not found'}), 404
    return jsonify(JOBS[job_id])

def process_video(job_id, video_path, form_data):
    try:
        if not os.path.exists(video_path):
            raise FileNotFoundError("Upload file not found")

        settings = {
            'font_family': form_data.get('font_family', 'Arial'),
            'font_size': int(form_data.get('font_size', 24)),
            'style': form_data.get('style', 'classic')
        }

        JOBS[job_id]['status'] = 'processing'
        
        # Pass the local path directly
        output_path = process_captioning_v1(
            video_path,
            form_data.get('captions', ''),
            settings,
            [],  # replace rules
            job_id
        )

        if isinstance(output_path, dict) and 'error' in output_path:
            raise Exception(output_path['error'])

        # Get the output path and copy to static folder
        output_filename = f"{job_id}_captioned.mp4"
        static_output = os.path.join(app.config['OUTPUT_FOLDER'], output_filename)
        
        # Copy the processed file to static folder
        import shutil
        shutil.copy2(output_path, static_output)
        
        output_filename = os.path.basename(output_path)
        static_output = os.path.join(app.config['OUTPUT_FOLDER'], output_filename) 
        shutil.copy2(output_path, static_output)
        
        JOBS[job_id] = {
            'status': 'completed',
            'download_url': f'/static/uploads/{output_filename}',
            'url': f'/static/uploads/{filename}'
        }

    except Exception as e:
        JOBS[job_id] = {
            'status': 'failed',
            'error': str(e)
        }

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 3000))
    app.run(host='0.0.0.0', port=port, debug=False)
    
    # For production with gunicorn
    # Run with: gunicorn -w 4 -b 0.0.0.0:3000 web_app:app
