let selectedVideo = null;

function selectVideo(videoName, card) {
    document.querySelectorAll('.video-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    selectedVideo = videoName;
    document.getElementById('processButton').disabled = false;
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

document.addEventListener('DOMContentLoaded', function() {
    const dropzone = document.getElementById('dropzone');
    const videoInput = document.getElementById('videoInput');
    const processButton = document.getElementById('processButton');
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

    processButton.addEventListener('click', async () => {
        if (!selectedVideo) return;

        processButton.disabled = true;
        processingProgress.style.display = 'block';
        const progressBar = processingProgress.querySelector('.progress-bar-fill');

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

                if (data.url) {
                    addProcessedVideo(data.url);
                }

                if (processingProgress) processingProgress.style.display = 'none';
                document.getElementById('processButton').disabled = false;
                break;
            } else if (data.status === 'failed') {
                throw new Error(data.error || 'Processing failed');
            }

            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    } catch (error) {
        clearInterval(processingInterval);
        if (processingProgress) processingProgress.style.display = 'none';
        document.getElementById('processButton').disabled = false;
        alert('Processing failed: ' + error.message);
    }
}