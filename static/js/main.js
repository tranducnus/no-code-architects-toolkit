let selectedVideo = null;
let currentTranscript = null;

// Navigation between sections
function showSection(sectionId) {
    ['uploadSection', 'editorSection', 'exportSection'].forEach(id => {
        document.getElementById(id).style.display = id === sectionId ? 'block' : 'none';
    });
}

function selectVideo(videoName) {
    selectedVideo = videoName;
    const previewVideo = document.getElementById('previewVideo');
    previewVideo.src = `/static/uploaded/${videoName}`;
    showSection('editorSection');
    // Reset transcription state
    document.getElementById('transcriptText').value = '';
    document.getElementById('previewCaptions').disabled = true;
}

async function generateTranscript() {
    if (!selectedVideo) return;

    const generateBtn = document.getElementById('generateTranscript');
    const previewBtn = document.getElementById('previewCaptions');
    generateBtn.disabled = true;
    generateBtn.textContent = 'Generating...';

    try {
        const response = await fetch('/api/v1/video/generate-transcript', {
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
        currentTranscript = data.transcript;
        document.getElementById('transcriptText').value = currentTranscript;
        previewBtn.disabled = false;
    } catch (error) {
        console.error('Transcription error:', error);
        alert('Failed to generate transcript: ' + error.message);
    } finally {
        generateBtn.disabled = false;
        generateBtn.textContent = 'Generate Transcript';
    }
}

async function previewCaptions() {
    if (!selectedVideo || !currentTranscript) return;

    const settings = {
        font_family: document.getElementById('fontFamily').value,
        font_size: parseInt(document.getElementById('fontSize').value),
        style: document.getElementById('captionStyle').value,
        line_color: document.getElementById('textColor').value,
        position: document.getElementById('position').value
    };

    try {
        const response = await fetch('/api/v1/video/preview-captions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                video: selectedVideo,
                transcript: document.getElementById('transcriptText').value,
                settings: settings
            })
        });

        if (!response.ok) throw new Error('Preview failed');

        const data = await response.json();
        document.getElementById('previewVideo').src = data.preview_url;
    } catch (error) {
        console.error('Preview error:', error);
        alert('Failed to preview: ' + error.message);
    }
}

async function exportVideo() {
    if (!selectedVideo || !currentTranscript) {
        alert('Please generate transcript first');
        return;
    }

    const exportProgress = document.getElementById('exportProgress');
    exportProgress.style.display = 'block';

    try {
        const response = await fetch('/api/v1/video/export', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                video: selectedVideo,
                transcript: document.getElementById('transcriptText').value,
                settings: {
                    font_family: document.getElementById('fontFamily').value,
                    font_size: parseInt(document.getElementById('fontSize').value),
                    style: document.getElementById('captionStyle').value,
                    line_color: document.getElementById('textColor').value,
                    position: document.getElementById('position').value
                }
            })
        });

        if (!response.ok) throw new Error('Export failed');

        const data = await response.json();
        window.location.href = data.url;
    } catch (error) {
        console.error('Export error:', error);
        alert('Failed to export: ' + error.message);
    } finally {
        exportProgress.style.display = 'none';
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    const generateTranscriptBtn = document.getElementById('generateTranscript');
    const previewCaptionsBtn = document.getElementById('previewCaptions');
    const exportButton = document.getElementById('exportButton');

    generateTranscriptBtn?.addEventListener('click', generateTranscript);
    previewCaptionsBtn?.addEventListener('click', previewCaptions);
    exportButton?.addEventListener('click', exportVideo);

    // Initialize existing videos
    document.querySelectorAll('.video-card').forEach(card => {
        const videoName = card.dataset.video;
        if (videoName) {
            card.querySelector('.select-btn')?.addEventListener('click', () => {
                selectVideo(videoName);
            });
        }
    });

    const dropzone = document.getElementById('dropzone');
    const videoInput = document.getElementById('videoInput');

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


    // Preview updates when settings change
    ['fontFamily', 'fontSize', 'textColor', 'position', 'captionStyle'].forEach(id => {
        document.getElementById(id).addEventListener('change', previewCaptions);
    });
    document.getElementById('transcriptText').addEventListener('input', previewCaptions);
});

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