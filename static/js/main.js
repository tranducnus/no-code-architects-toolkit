
let selectedVideo = null;
let currentTranscript = null;

// Navigation between sections
function showSection(sectionId) {
    ['uploadSection', 'editorSection', 'exportSection'].forEach(id => {
        document.getElementById(id).style.display = id === sectionId ? 'block' : 'none';
    });
}

function selectVideo(videoName, card) {
    document.querySelectorAll('.video-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    selectedVideo = videoName;
    
    // Update preview video source
    const previewVideo = document.getElementById('previewVideo');
    previewVideo.src = `/static/uploaded/${videoName}`;
    
    // Move to editor section
    showSection('editorSection');
}

async function generateTranscript() {
    if (!selectedVideo) return;
    
    try {
        const response = await fetch('/generate-transcription', {
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
    } catch (error) {
        console.error('Transcription error:', error);
        alert('Failed to generate transcript: ' + error.message);
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
        const response = await fetch('/preview-captions', {
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
    if (!selectedVideo || !currentTranscript) return;
    
    const exportProgress = document.getElementById('exportProgress');
    exportProgress.style.display = 'block';
    
    try {
        const response = await fetch('/export-video', {
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
        addProcessedVideo(data.url);
        showSection('uploadSection');
    } catch (error) {
        console.error('Export error:', error);
        alert('Failed to export: ' + error.message);
    } finally {
        exportProgress.style.display = 'none';
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    const dropzone = document.getElementById('dropzone');
    const videoInput = document.getElementById('videoInput');
    const generateTranscriptBtn = document.getElementById('generateTranscript');
    const exportButton = document.getElementById('exportButton');

    // Initialize existing videos
    document.querySelectorAll('.video-card').forEach(card => {
        const videoName = card.dataset.video;
        if (videoName) {
            card.querySelector('.select-btn')?.addEventListener('click', () => {
                selectVideo(videoName, card);
            });
        }
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

    generateTranscriptBtn.addEventListener('click', generateTranscript);
    exportButton.addEventListener('click', exportVideo);

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
