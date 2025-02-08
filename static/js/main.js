
let selectedVideo = null;
let transcriptionData = null;

function selectVideo(videoName, card) {
    document.querySelectorAll('.video-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    selectedVideo = videoName;
    document.getElementById('transcribeButton').disabled = false;
    document.querySelector('.transcription-section').style.display = 'none';
    document.getElementById('exportButton').style.display = 'none';
}

function addVideoToGrid(videoName) {
    const grid = document.querySelector('.existing-videos .video-grid');
    const videoCard = document.createElement('div');
    videoCard.className = 'video-card';
    videoCard.dataset.video = videoName;

    videoCard.innerHTML = `
        <video class="video-preview">
            <source src="/static/uploaded/${videoName}" type="video/mp4">
        </video>
        <div class="video-info">
            <span class="video-name">${videoName}</span>
            <button class="select-btn">Select</button>
        </div>
    `;

    videoCard.querySelector('.select-btn').addEventListener('click', () => {
        selectVideo(videoName, videoCard);
    });

    grid.appendChild(videoCard);
}

function addProcessedVideo(videoPath) {
    const grid = document.querySelector('.output-section .video-grid');
    const videoCard = document.createElement('div');
    videoCard.className = 'video-card';

    videoCard.innerHTML = `
        <video class="video-preview" controls>
            <source src="${videoPath}" type="video/mp4">
        </video>
        <div class="video-info">
            <span class="video-name">${videoPath.split('/').pop()}</span>
            <a href="${videoPath}" download class="download-btn">Download</a>
        </div>
    `;

    grid.appendChild(videoCard);
}

function updateTranscription(transcriptionContent) {
    const editor = document.querySelector('.transcription-content');
    editor.innerHTML = '';
    
    transcriptionContent.forEach((segment, index) => {
        const segmentDiv = document.createElement('div');
        segmentDiv.className = 'transcription-segment';
        segmentDiv.innerHTML = `
            <span class="timestamp">${formatTime(segment.start)} - ${formatTime(segment.end)}</span>
            <span class="text" contenteditable="true">${segment.text}</span>
        `;
        editor.appendChild(segmentDiv);
    });
}

function formatTime(seconds) {
    const pad = num => num.toString().padStart(2, '0');
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${pad(hours)}:${pad(minutes)}:${pad(secs)}`;
}

function previewCaptions() {
    const settings = {
        font_family: document.getElementById('fontFamily').value,
        font_size: parseInt(document.getElementById('fontSize').value),
        text_color: document.getElementById('textColor').value,
        position: document.getElementById('position').value
    };
    
    // Here we would update the video preview with the new caption styles
    // This would be implemented in Phase 2
}

document.addEventListener('DOMContentLoaded', function() {
    const dropzone = document.getElementById('dropzone');
    const videoInput = document.getElementById('videoInput');
    const transcribeButton = document.getElementById('transcribeButton');
    const exportButton = document.getElementById('exportButton');
    const processingProgress = document.getElementById('processingProgress');

    // Initialize existing videos
    document.querySelectorAll('.video-card').forEach(card => {
        const videoName = card.dataset.video;
        if (videoName) {
            card.querySelector('.select-btn')?.addEventListener('click', () => {
                selectVideo(videoName, card);
            });
        }
    });

    // Style control event listeners
    document.querySelectorAll('.style-options select, .style-options input').forEach(control => {
        control.addEventListener('change', previewCaptions);
    });

    dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.style.borderColor = '#3b82f6';
    });

    dropzone.addEventListener('dragleave', () => {
        dropzone.style.borderColor = '#ddd';
    });

    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.style.borderColor = '#ddd';
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('video/')) {
            handleFileUpload(file);
        }
    });

    dropzone.addEventListener('click', () => {
        videoInput.click();
    });

    videoInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFileUpload(e.target.files[0]);
        }
    });

    transcribeButton.addEventListener('click', async () => {
        if (!selectedVideo) return;
        
        transcribeButton.disabled = true;
        processingProgress.style.display = 'block';
        
        try {
            const response = await fetch('/v1/video/transcribe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    video: selectedVideo
                })
            });

            if (!response.ok) throw new Error('Transcription failed');
            
            const data = await response.json();
            transcriptionData = data;
            
            document.querySelector('.transcription-section').style.display = 'block';
            updateTranscription(data.segments);
            exportButton.style.display = 'block';
            
        } catch (error) {
            alert('Transcription failed: ' + error.message);
        } finally {
            processingProgress.style.display = 'none';
            transcribeButton.disabled = false;
        }
    });

    exportButton.addEventListener('click', async () => {
        if (!selectedVideo || !transcriptionData) return;
        
        exportButton.disabled = true;
        processingProgress.style.display = 'block';
        
        try {
            const settings = {
                font_family: document.getElementById('fontFamily').value,
                font_size: parseInt(document.getElementById('fontSize').value),
                text_color: document.getElementById('textColor').value,
                position: document.getElementById('position').value
            };

            const response = await fetch('/v1/video/export', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    video: selectedVideo,
                    transcription: transcriptionData,
                    settings: settings
                })
            });

            if (!response.ok) throw new Error('Export failed');
            
            const data = await response.json();
            addProcessedVideo(data.url);
            
        } catch (error) {
            alert('Export failed: ' + error.message);
        } finally {
            processingProgress.style.display = 'none';
            exportButton.disabled = false;
        }
    });

    async function handleFileUpload(file) {
        const formData = new FormData();
        formData.append('video', file);

        try {
            const response = await fetch('/upload_only', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const data = await response.json();
            if (data.success) {
                addVideoToGrid(data.video_path);
            } else {
                throw new Error(data.error || 'Upload failed');
            }
        } catch (error) {
            console.error('Upload error:', error);
            alert('Upload failed: ' + error.message);
        }
    }
});
