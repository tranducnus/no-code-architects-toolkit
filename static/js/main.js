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

    videoCard.querySelector('.select-btn').addEventListener('click', function() {
        document.querySelectorAll('.video-card').forEach(c => c.classList.remove('selected'));
        this.closest('.video-card').classList.add('selected');
        selectedVideo = videoName;
        document.getElementById('processButton').disabled = false;
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

document.addEventListener('DOMContentLoaded', function() {
    const dropzone = document.getElementById('dropzone');
    const videoInput = document.getElementById('videoInput');
    const processButton = document.getElementById('processButton');
    const processingProgress = document.getElementById('processingProgress');
    let selectedVideo = null;

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
        const formData = new FormData();
        formData.append('video', file);

        try {
            const response = await fetch('/upload_only', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
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

    function selectVideo(videoName, card) {
        document.querySelectorAll('.video-card').forEach(c =>
            c.classList.remove('selected'));
        card.classList.add('selected');
        selectedVideo = videoName;
        processButton.disabled = false;
    }

    // Process video
    processButton.addEventListener('click', async () => {
        if (!selectedVideo) return;

        processButton.disabled = true;
        processingProgress.style.display = 'block';
        const progressBar = processingProgress.querySelector('.progress-bar-fill');
        let progress = 0;

        try {
            const formData = new FormData();
            formData.append('video', selectedVideo);

            const response = await fetch('/upload', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            if (data.job_id) {
                await checkStatus(data.job_id, progressBar);
            } else {
                throw new Error(data.error || 'Processing failed');
            }
        } catch (error) {
            console.error('Processing error:', error);
            alert('Processing failed: ' + error.message);
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
    let progress = 0;
    const processingProgress = document.getElementById('processingProgress');
    const processingInterval = setInterval(() => {
        progress += 2;
        if (progress <= 95 && progressBar) {
            progressBar.style.width = `${progress}%`;
        }
    }, 500);

    try {
        while (true) {
            const response = await fetch(`/status/${jobId}`);
            const data = await response.json();

            if (data.status === 'completed') {
                clearInterval(processingInterval);
                if (progressBar) progressBar.style.width = '100%';

                const videoResult = document.getElementById('videoResult');
                const previewVideo = document.getElementById('previewVideo');

                if (previewVideo) previewVideo.src = data.url;
                if (videoResult) videoResult.style.display = 'block';
                if (processingProgress) processingProgress.style.display = 'none';

                // Refresh the processed videos section
                const processedVideosContainer = document.querySelector('.output-section .video-grid');
                if (processedVideosContainer) {
                    const videoCard = document.createElement('div');
                    videoCard.className = 'video-card';
                    const filename = data.url.split('/').pop();
                    videoCard.innerHTML = `
                        <video class="video-preview" controls>
                            <source src="${data.url}" type="video/mp4">
                        </video>
                        <div class="video-info">
                            <span class="video-name">${filename}</span>
                            <a href="${data.url}" download class="download-btn">Download</a>
                        </div>
                    `;
                    processedVideosContainer.appendChild(videoCard);
                }
                break;
            } else if (data.status === 'failed') {
                throw new Error(data.error || 'Processing failed');
            }

            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    } catch (error) {
        clearInterval(processingInterval);
        if (processingProgress) processingProgress.style.display = 'none';
        document.getElementById('errorMessage').textContent = `Error: ${error.message}`;
    }
}