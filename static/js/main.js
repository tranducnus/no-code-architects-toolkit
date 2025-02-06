document.addEventListener('DOMContentLoaded', function() {
    const uploadForm = document.getElementById('uploadForm');
    const previewContainer = document.getElementById('previewContainer');
    const uploadSection = document.getElementById('uploadSection');
    const videoPreview = document.getElementById('videoPreview');
    const captionPreview = document.getElementById('captionPreview');
    const errorMessage = document.getElementById('errorMessage');

    // Style inputs
    const fontFamily = document.getElementById('fontFamily');
    const fontSize = document.getElementById('fontSize');
    const fontSizeDisplay = document.getElementById('fontSizeDisplay');
    const textColor = document.getElementById('textColor');
    const bgColor = document.getElementById('bgColor');
    const captionStyle = document.getElementById('captionStyle');
    const captionText = document.getElementById('captionText');

    // Buttons
    const applyStyles = document.getElementById('applyStyles');
    const processVideo = document.getElementById('processVideo');

    // Handle file upload
    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorMessage.textContent = '';

        const formData = new FormData(e.target);

        try {
            const response = await fetch('/upload_only', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                uploadSection.style.display = 'none';
                previewContainer.style.display = 'block';
                videoPreview.src = `/static/uploaded/${data.video_path}`;
                document.getElementById('video_path').value = data.video_path;
            } else {
                throw new Error(data.error || 'Upload failed');
            }
        } catch (error) {
            errorMessage.textContent = `Error: ${error.message}`;
        }
    });

    // Live preview updates
    function updateCaptionPreview() {
        captionPreview.style.fontFamily = fontFamily.value;
        captionPreview.style.fontSize = `${fontSize.value}px`;
        captionPreview.style.color = textColor.value;
        captionPreview.style.backgroundColor = bgColor.value;
        captionPreview.textContent = captionText.value;
    }

    // Event listeners for style changes
    fontFamily.addEventListener('change', updateCaptionPreview);
    fontSize.addEventListener('input', () => {
        fontSizeDisplay.textContent = `${fontSize.value}px`;
        updateCaptionPreview();
    });
    textColor.addEventListener('input', updateCaptionPreview);
    bgColor.addEventListener('input', updateCaptionPreview);
    captionText.addEventListener('input', updateCaptionPreview);

    // Process video with captions
    processVideo.addEventListener('click', async () => {
        const videoPath = document.getElementById('video_path').value;
        if (!videoPath) {
            errorMessage.textContent = 'Please upload a video first';
            return;
        }

        const processingProgress = document.getElementById('processingProgress');
        const progressBar = processingProgress.querySelector('.progress-bar-fill');

        try {
            processingProgress.style.display = 'block';

            const formData = new FormData();
            formData.append('video', videoPath);
            formData.append('font_family', fontFamily.value);
            formData.append('font_size', fontSize.value);
            formData.append('text_color', textColor.value);
            formData.append('bg_color', bgColor.value);
            formData.append('style', captionStyle.value);
            formData.append('captions', captionText.value);

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
            processingProgress.style.display = 'none';
            errorMessage.textContent = `Error: ${error.message}`;
        }
    });
});

async function checkStatus(jobId, progressBar) {
    let progress = 0;
    const processingInterval = setInterval(() => {
        progress += 2;
        if (progress <= 95) {
            progressBar.style.width = `${progress}%`;
        }
    }, 500);

    try {
        while (true) {
            const response = await fetch(`/status/${jobId}`);
            const data = await response.json();

            if (data.status === 'completed') {
                clearInterval(processingInterval);
                progressBar.style.width = '100%';

                const videoResult = document.getElementById('videoResult');
                const previewVideo = document.getElementById('previewVideo');

                previewVideo.src = data.url;
                videoResult.style.display = 'block';
                document.getElementById('processingProgress').style.display = 'none';
                break;
            } else if (data.status === 'failed') {
                throw new Error(data.error || 'Processing failed');
            }

            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    } catch (error) {
        clearInterval(processingInterval);
        document.getElementById('processingProgress').style.display = 'none';
        document.getElementById('errorMessage').textContent = `Error: ${error.message}`;
    }
}

// Add event listeners for video selection (Preserved from original code,  but likely redundant given the new UI)
document.addEventListener('DOMContentLoaded', function() {
    const selectButtons = document.querySelectorAll('.select-video');
    selectButtons.forEach(button => {
        button.addEventListener('click', function() {
            const filename = this.dataset.filename;
            document.getElementById('video_path').value = filename;
            document.querySelector('.upload-section').style.display = 'none';
            document.querySelector('.caption-section').style.display = 'block';
        });
    });
});


// Handle video upload (Preserved from original, but largely superseded by the new upload handler)
document.getElementById('uploadForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const uploadProgress = document.getElementById('uploadProgress');
    const errorMessage = document.getElementById('errorMessage');
    const uploadProgressBar = uploadProgress.querySelector('.progress-bar-fill');
    
    // Reset UI
    uploadProgress.style.display = 'none';
    errorMessage.textContent = '';
    document.querySelector('.caption-section').style.display = 'none';
    
    const formData = new FormData(e.target);
    
    try {
        uploadProgress.style.display = 'block';
        let progress = 0;
        const uploadInterval = setInterval(() => {
            progress += 5;
            if (progress <= 100) {
                uploadProgressBar.style.width = `${progress}%`;
            }
        }, 200);
        
        const response = await fetch('/upload_only', {
            method: 'POST',
            body: formData
        });
        
        clearInterval(uploadInterval);
        uploadProgressBar.style.width = '100%';
        
        const data = await response.json();
        if (data.success) {
            // Add the new video to the grid without page reload
            const uploadedVideosGrid = document.querySelector('.video-grid');
            const newVideoItem = document.createElement('div');
            newVideoItem.classList.add('video-item');
            newVideoItem.innerHTML = `
                <video width="320" height="240" controls>
                    <source src="/static/uploaded/${data.filename}" type="video/mp4">
                </video>
                <div class="video-controls">
                    <button class="select-video" data-filename="${data.filename}">Select for Processing</button>
                </div>
            `;
            uploadedVideosGrid.appendChild(newVideoItem);
            
            // Add event listener to the new select button
            const newSelectButton = newVideoItem.querySelector('.select-video');
            newSelectButton.addEventListener('click', function() {
                document.getElementById('video_path').value = this.dataset.filename;
                document.querySelector('.upload-section').style.display = 'none';
                document.querySelector('.caption-section').style.display = 'block';
            });
            
            // Reset form and progress
            e.target.reset();
            uploadProgress.style.display = 'none';
            uploadProgressBar.style.width = '0%';
        } else {
            throw new Error(data.error || 'Upload failed');
        }
    } catch (error) {
        uploadProgress.style.display = 'none';
        errorMessage.textContent = `Error: ${error.message}`;
    }
});

// Handle caption processing (Preserved from original, but functionality is largely replaced)
document.getElementById('captionForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const processingProgress = document.getElementById('processingProgress');
    const videoResult = document.getElementById('videoResult');
    const errorMessage = document.getElementById('errorMessage');
    const processingProgressBar = processingProgress.querySelector('.progress-bar-fill');
    
    // Reset UI
    processingProgress.style.display = 'none';
    videoResult.style.display = 'none';
    errorMessage.textContent = '';
    
    const formData = new FormData(e.target);
    const selectedVideo = document.getElementById('video_path').value;
    if (!selectedVideo) {
        errorMessage.textContent = 'Please select a video first';
        return;
    }
    formData.append('video', selectedVideo);
    
    try {
        // Show processing progress
        processingProgress.style.display = 'block';
        let progress = 0;
        const processingInterval = setInterval(() => {
            progress += 2;
            if (progress <= 100) {
                processingProgressBar.style.width = `${progress}%`;
            }
        }, 200);
        
        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });
        
        clearInterval(processingInterval);
        processingProgressBar.style.width = '100%';
        
        const data = await response.json();
        
        if (data.job_id) {
            // Show processing progress
            uploadProgress.style.display = 'none';
            processingProgress.style.display = 'block';
            
            // Poll for status
            await checkStatus(data.job_id, processingProgressBar);
        } else {
            throw new Error(data.error || 'Upload failed');
        }
    } catch (error) {
        uploadProgress.style.display = 'none';
        processingProgress.style.display = 'none';
        errorMessage.textContent = `Error: ${error.message}`;
    }
});