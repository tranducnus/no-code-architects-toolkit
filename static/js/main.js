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
    const processVideo = document.getElementById('processVideo');

    // Handle existing video selection
    const existingVideos = document.getElementById('existingVideos');
    const selectExisting = document.getElementById('selectExisting');
    
    if (selectExisting) {
        selectExisting.addEventListener('click', () => {
            const selectedVideo = existingVideos.value;
            if (selectedVideo) {
                uploadSection.style.display = 'none';
                previewContainer.style.display = 'block';
                videoPreview.src = `/static/uploaded/${selectedVideo}`;
                document.getElementById('video_path').value = selectedVideo;
            } else {
                errorMessage.textContent = 'Please select a video';
            }
        });
    }

    // Handle file upload
    if (uploadForm) {
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
                    if (videoPreview) {
                        videoPreview.src = `/static/uploaded/${data.video_path}`;
                        document.getElementById('video_path').value = data.video_path;
                    }
                } else {
                    throw new Error(data.error || 'Upload failed');
                }
            } catch (error) {
                errorMessage.textContent = `Error: ${error.message}`;
            }
        });
    }

    // Live preview updates
    function updateCaptionPreview() {
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

    // Handle transcript timing adjustments
    let transcriptTiming = {};
    
    function adjustTiming(index, adjustment) {
        if (!transcriptTiming[index]) {
            transcriptTiming[index] = 0;
        }
        transcriptTiming[index] += adjustment;
        document.getElementById(`timing-${index}`).textContent = 
            `${transcriptTiming[index] > 0 ? '+' : ''}${transcriptTiming[index]}s`;
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

    // Process video with captions
    if (processVideo) {
        processVideo.addEventListener('click', async () => {
            const videoPath = document.getElementById('video_path')?.value;
            if (!videoPath) {
                errorMessage.textContent = 'Please upload a video first';
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

                const videoResult = document.getElementById('videoResult');
                const previewVideo = document.getElementById('previewVideo');

                if (previewVideo) previewVideo.src = data.url;
                if (videoResult) videoResult.style.display = 'block';
                if (processingProgress) processingProgress.style.display = 'none';
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