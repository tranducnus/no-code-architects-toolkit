
function formatTime(seconds) {
    const pad = (num) => num.toString().padStart(2, '0');
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${pad(hours)}:${pad(minutes)}:${pad(secs)}.${ms.toString().padStart(3, '0')}`;
}

document.addEventListener('DOMContentLoaded', function() {
    const dropzone = document.getElementById('dropzone');
    const videoInput = document.getElementById('videoInput');
    const processButton = document.getElementById('processButton');
    const generateTranscriptBtn = document.getElementById('generateTranscriptBtn');
    const transcriptText = document.getElementById('transcriptText');
    const processingProgress = document.getElementById('processingProgress');
    const uploadForm = document.getElementById('uploadForm');
    let selectedVideo = null;
    let processingInterval = null;

    // Drag and drop functionality
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

    // Handle existing video selection
    document.querySelectorAll('.video-card').forEach(card => {
        card.querySelector('.select-btn')?.addEventListener('click', () => {
            const videoName = card.dataset.video;
            selectVideo(videoName, card);
        });
    });

    async function handleFileUpload(file) {
        if (!file || !file.type.startsWith('video/')) {
            alert('Please select a valid video file');
            return;
        }

        const formData = new FormData();
        formData.append('video', file);

        try {
            processButton.disabled = true;
            const response = await fetch('/upload_only', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Upload failed');
            }

            if (data.success) {
                window.location.reload();
            } else {
                throw new Error(data.error || 'Upload failed');
            }
        } catch (error) {
            console.error('Upload error:', error);
            alert('Upload failed: ' + error.message);
        } finally {
            processButton.disabled = false;
        }
    }

    function selectVideo(videoName, card) {
        document.querySelectorAll('.video-card').forEach(c =>
            c.classList.remove('selected'));
        if (card) card.classList.add('selected');
        selectedVideo = videoName;
        const previewVideo = document.getElementById('previewVideo');
        if (previewVideo) {
            previewVideo.src = `/static/uploaded/${videoName}`;
        }
        showSection('editorSection');
        // Reset transcription state
        document.getElementById('transcriptText').value = '';
        document.getElementById('previewBtn').disabled = true;
    }

    function showSection(sectionId) {
        const section = document.getElementById(sectionId);
        if (section) {
            section.style.display = 'block';
        }
    }

    // Process video
    processButton.addEventListener('click', async () => {
        if (!selectedVideo) {
            alert('Please select a video first');
            return;
        }

        processButton.disabled = true;
        processingProgress.style.display = 'block';
        const progressBar = processingProgress.querySelector('.progress-bar-fill');
        progressBar.style.width = '0%';

        try {
            const formData = new FormData();
            formData.append('video', selectedVideo);

            const response = await fetch('/upload', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || `HTTP error! status: ${response.status}`);
            }

            if (data.job_id) {
                await checkStatus(data.job_id, progressBar);
            } else {
                throw new Error(data.error || 'Processing failed');
            }
        } catch (error) {
            console.error('Processing error:', error);
            alert('Processing failed: ' + error.message);
        } finally {
            if (processingInterval) {
                clearInterval(processingInterval);
            }
            processButton.disabled = false;
            processingProgress.style.display = 'none';
        }
    });


    // Style inputs
    const fontFamily = document.getElementById('fontFamily');
    const fontSize = document.getElementById('fontSize');
    const fontSizeDisplay = document.getElementById('fontSizeDisplay');
    const textColor = document.getElementById('textColor');
    const bgColor = document.getElementById('bgColor');
    const captionStyle = document.getElementById('captionStyle');
    const captionText = document.getElementById('captionText');
    const errorMessage = document.getElementById('errorMessage');


    // Live preview updates
    function updateCaptionPreview() {
        const captionPreview = document.getElementById('captionPreview');
        if (captionPreview) {
            captionPreview.style.fontFamily = fontFamily.value;
            captionPreview.style.fontSize = `${fontSize.value}px`;
            captionPreview.style.color = textColor.value;
            captionPreview.style.backgroundColor = bgColor.value;
            captionPreview.style.textAlign = document.getElementById('alignment').value;
            captionPreview.style.position = 'relative';
            captionPreview.textContent = captionText.value;

            // Update position
            const position = document.getElementById('position').value;
            const positions = {
                'top': '0',
                'middle': '50%',
                'bottom': '100%'
            };
            captionPreview.style.top = positions[position.split('_')[0]];

        }
    }

    // Handle transcript generation
    generateTranscriptBtn.addEventListener('click', async () => {
        if (!selectedVideo) {
            alert('Please select a video first');
            return;
        }

        generateTranscriptBtn.disabled = true;
        transcriptText.value = 'Generating transcript...';

        try {
            const response = await fetch('/transcribe-media', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    media_url: `/static/uploaded/${selectedVideo}`,
                    task: 'transcribe',
                    include_text: true,
                    include_segments: true
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            transcriptText.value = result.segments.map(segment => 
                `[${formatTime(segment.start)} --> ${formatTime(segment.end)}] ${segment.text}`
            ).join('\n');
        } catch (error) {
            console.error('Transcription error:', error);
            transcriptText.value = 'Error generating transcript';
        } finally {
            generateTranscriptBtn.disabled = false;
        }
    });

    // Event listeners for style changes
    if (fontFamily) fontFamily.addEventListener('change', updateCaptionPreview);
    if (fontSize) {
        fontSize.addEventListener('input', () => {
            if (fontSizeDisplay) fontSizeDisplay.textContent = `${fontSize.value}px`;
            updateCaptionPreview();
        });
    }
    if (textColor) textColor.addEventListener('input', updateCaptionPreview);
    if (bgColor) bgColor.addEventListener('input', updateCaptionPreview);
    if (captionText) captionText.addEventListener('input', updateCaptionPreview);

    // Handle transcript timing adjustments (This part remains unchanged)
    let transcriptTiming = {};

    function adjustTiming(index, adjustment) {
        if (!transcriptTiming[index]) {
            transcriptTiming[index] = 0;
        }
        transcriptTiming[index] += adjustment;
        document.getElementById(`timing-${index}`).textContent =
            `${transcriptTiming[index] > 0 ? '+' : ''}${transcriptTiming[index]}s`;
    }

});

async function checkStatus(jobId, progressBar) {
    if (processingInterval) {
        clearInterval(processingInterval);
    }

    let progress = 0;
    processingInterval = setInterval(() => {
        progress = Math.min(progress + 2, 95);
        if (progressBar) {
            progressBar.style.width = `${progress}%`;
        }
    }, 500);

    try {
        while (true) {
            const response = await fetch(`/status/${jobId}`);
            if (!response.ok) {
                throw new Error('Status check failed');
            }

            const data = await response.json();
            if (data.status === 'completed') {
                if (progressBar) {
                    progressBar.style.width = '100%';
                }
                window.location.reload();
                break;
            } else if (data.status === 'failed') {
                throw new Error(data.error || 'Processing failed');
            }

            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    } catch (error) {
        throw error;
    } finally {
        if (processingInterval) {
            clearInterval(processingInterval);
            processingInterval = null;
        }
    }
}