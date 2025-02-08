
document.addEventListener('DOMContentLoaded', function() {
    const uploadArea = document.querySelector('.upload-area');
    const videoUpload = document.getElementById('videoUpload');
    const previewContainer = document.getElementById('previewContainer');
    const videoPreview = document.getElementById('videoPreview');
    const captionPreview = document.getElementById('captionPreview');
    const errorMessage = document.getElementById('errorMessage');
    const processVideo = document.getElementById('processVideo');

    // Drag and drop handling
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '#4CAF50';
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.style.borderColor = '#ddd';
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '#ddd';
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('video/')) {
            handleFileUpload(file);
        }
    });

    videoUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            handleFileUpload(file);
        }
    });

    // Video thumbnail click handling
    document.querySelectorAll('.video-thumbnail').forEach(thumbnail => {
        thumbnail.addEventListener('click', () => {
            const videoSrc = thumbnail.querySelector('video').src;
            const videoName = thumbnail.querySelector('.video-name').textContent;
            previewContainer.style.display = 'block';
            videoPreview.src = videoSrc;
            document.getElementById('video_path').value = videoName;
        });
    });

    async function handleFileUpload(file) {
        const formData = new FormData();
        formData.append('video', file);

        try {
            errorMessage.textContent = '';
            const response = await fetch('/upload_only', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                previewContainer.style.display = 'block';
                videoPreview.src = `/static/uploaded/${data.video_path}`;
                document.getElementById('video_path').value = data.video_path;
                location.reload(); // Refresh to show new thumbnail
            } else {
                throw new Error(data.error || 'Upload failed');
            }
        } catch (error) {
            errorMessage.textContent = `Error: ${error.message}`;
        }
    }

    // Caption preview updates
    function updateCaptionPreview() {
        if (captionPreview) {
            const fontFamily = document.getElementById('fontFamily').value;
            const fontSize = document.getElementById('fontSize').value;
            const textColor = document.getElementById('textColor').value;
            const bgColor = document.getElementById('bgColor').value;
            const captionText = document.getElementById('captionText').value;

            captionPreview.style.fontFamily = fontFamily;
            captionPreview.style.fontSize = `${fontSize}px`;
            captionPreview.style.color = textColor;
            captionPreview.style.backgroundColor = bgColor;
            captionPreview.textContent = captionText;
        }
    }

    // Style input event listeners
    ['fontFamily', 'fontSize', 'textColor', 'bgColor', 'captionText'].forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('input', updateCaptionPreview);
        }
    });

    // Process video handling
    if (processVideo) {
        processVideo.addEventListener('click', async () => {
            const videoPath = document.getElementById('video_path')?.value;
            if (!videoPath) {
                errorMessage.textContent = 'Please upload or select a video first';
                return;
            }

            const processingProgress = document.getElementById('processingProgress');
            const progressBar = processingProgress?.querySelector('.progress-bar-fill');

            try {
                processingProgress.style.display = 'block';
                let progress = 0;
                const processingInterval = setInterval(() => {
                    progress += 2;
                    if (progress <= 95 && progressBar) {
                        progressBar.style.width = `${progress}%`;
                    }
                }, 500);

                const formData = new FormData();
                formData.append('video', videoPath);
                formData.append('font_family', document.getElementById('fontFamily').value);
                formData.append('font_size', document.getElementById('fontSize').value);
                formData.append('text_color', document.getElementById('textColor').value);
                formData.append('bg_color', document.getElementById('bgColor').value);
                formData.append('captions', document.getElementById('captionText').value);

                const response = await fetch('/upload', {
                    method: 'POST',
                    body: formData
                });

                const data = await response.json();

                if (data.job_id) {
                    await checkStatus(data.job_id, progressBar);
                } else {
                    throw new Error(data.error || 'Processing failed');
                }
            } catch (error) {
                if (processingProgress) processingProgress.style.display = 'none';
                errorMessage.textContent = `Error: ${error.message}`;
            }
        });
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
                setTimeout(() => {
                    location.reload(); // Refresh to show new processed video
                }, 1000);
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
