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

# Use FileSystemStorage for job status
class FileSystemJobStore:
    def __init__(self, base_dir):
        self.base_dir = base_dir
        os.makedirs(base_dir, exist_ok=True)
        
    def _get_job_path(self, job_id):
        return os.path.join(self.base_dir, f"{job_id}.json")
        
    def set_job(self, job_id, data):
        with open(self._get_job_path(job_id), 'w') as f:
            json.dump(data, f)
            
    def get_job(self, job_id):
        try:
            with open(self._get_job_path(job_id), 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            return None
            
    def update_job(self, job_id, status, **kwargs):
        job_data = self.get_job(job_id) or {}
        job_data.update({'status': status, **kwargs})
        self.set_job(job_id, job_data)

JOBS = FileSystemJobStore('/tmp/job_status')

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
    job_data = JOBS.get_job(job_id)
    if job_data is None:
        return jsonify({'error': 'Job not found'}), 404
    return jsonify(job_data)

def process_video(job_id, video_path, form_data):
    try:
        if not os.path.exists(video_path):
            JOBS.update_job(job_id, 'failed', error="Upload file not found")
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


        JOBS.update_job(job_id, 'completed', url=f'/static/uploads/{output_filename}')
        print(f"Job {job_id} completed. Status updated in job store.")

    except Exception as e:
        JOBS.update_job(job_id, 'failed', error=str(e))

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 3000))
    app.run(host='0.0.0.0', port=port, debug=False)

    # For production with gunicorn
    # Run with: gunicorn -w 4 -b 0.0.0.0:3000 web_app:app