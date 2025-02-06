
document.getElementById('uploadForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const uploadProgress = document.getElementById('uploadProgress');
    const processingProgress = document.getElementById('processingProgress');
    const videoResult = document.getElementById('videoResult');
    const errorMessage = document.getElementById('errorMessage');
    const uploadProgressBar = uploadProgress.querySelector('.progress-bar-fill');
    const processingProgressBar = processingProgress.querySelector('.progress-bar-fill');
    
    // Reset UI
    uploadProgress.style.display = 'none';
    processingProgress.style.display = 'none';
    videoResult.style.display = 'none';
    errorMessage.textContent = '';
    
    const formData = new FormData(e.target);
    
    try {
        // Show upload progress
        uploadProgress.style.display = 'block';
        
        // Simulate upload progress
        let progress = 0;
        const uploadInterval = setInterval(() => {
            progress += 5;
            if (progress <= 100) {
                uploadProgressBar.style.width = `${progress}%`;
            }
        }, 200);
        
        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });
        
        clearInterval(uploadInterval);
        uploadProgressBar.style.width = '100%';
        
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
                
                // Show the video result
                const videoResult = document.getElementById('videoResult');
                const previewVideo = document.getElementById('previewVideo');
                const downloadButton = document.getElementById('downloadButton');
                
                const processedPath = data.url.replace('/static/uploads/', '/static/processed/');
                previewVideo.src = processedPath;
                downloadButton.onclick = () => window.location.href = processedPath;
                
                document.getElementById('processingProgress').style.display = 'none';
                videoResult.style.display = 'block';
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
