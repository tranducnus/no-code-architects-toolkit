
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

function updateTranscription(segments) {
    const editor = document.querySelector('.transcription-content');
    editor.innerHTML = '';
    
    segments.forEach((segment, index) => {
        const segmentDiv = document.createElement('div');
        segmentDiv.className = 'transcription-segment';
        segmentDiv.innerHTML = `
            <span class="timestamp">${formatTime(segment.start)} - ${formatTime(segment.end)}</span>
            <span class="text" contenteditable="true">${segment.text}</span>
        `;

        // Make segments editable
        const textSpan = segmentDiv.querySelector('.text');
        textSpan.addEventListener('blur', () => {
            segment.text = textSpan.textContent;
        });

        editor.appendChild(segmentDiv);
    });

    // Show style controls after transcription
    document.querySelector('.style-controls').style.display = 'block';
}

function previewCaptions() {
    if (!selectedVideo || !transcriptionData) return;

    const settings = getStyleSettings();
    
    fetch('/v1/video/preview', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            video: selectedVideo,
            segments: transcriptionData.segments,
            settings: settings
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) throw new Error(data.error);
        // Update preview (implemented in HTML/CSS)
        updatePreview(data);
    })
    .catch(error => {
        console.error('Preview error:', error);
    });
}

function getStyleSettings() {
    return {
        font_family: document.getElementById('fontFamily').value,
        font_size: parseInt(document.getElementById('fontSize').value),
        style: document.getElementById('captionStyle').value,
        position: document.getElementById('position').value,
        line_color: document.getElementById('textColor').value,
        word_color: document.getElementById('highlightColor').value
    };
}

function formatTime(seconds) {
    const pad = num => num.toString().padStart(2, '0');
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${pad(hours)}:${pad(minutes)}:${pad(secs)}`;
}

document.addEventListener('DOMContentLoaded', function() {
    const dropzone = document.getElementById('dropzone');
    const videoInput = document.getElementById('videoInput');
    const transcribeButton = document.getElementById('transcribeButton');
    const exportButton = document.getElementById('exportButton');
    const processingProgress = document.getElementById('processingProgress');

    // Initialize style controls
    document.querySelectorAll('.style-options select, .style-options input').forEach(control => {
        control.addEventListener('change', previewCaptions);
    });

    // File upload handlers
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
                    video_url: `/static/uploaded/${selectedVideo}`
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
            const settings = getStyleSettings();
            const response = await fetch('/v1/video/export', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    video_url: `/static/uploaded/${selectedVideo}`,
                    segments: transcriptionData.segments,
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
