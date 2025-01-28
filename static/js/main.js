
document.getElementById('uploadForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log("Form submitted");
    
    const form = e.target;
    const formData = new FormData(form);
    const submitButton = form.querySelector('button[type="submit"]');
    const loadingContainer = document.querySelector('.loading-container');
    const progressBar = document.querySelector('.progress-bar');
    const progressBarFill = document.querySelector('.progress-bar-fill');
    
    submitButton.disabled = true;
    progressBar.style.display = 'block';
    loadingContainer.style.display = 'block';
    
    try {
        const response = await fetch('/upload', {
            method: 'POST',
            body: formData,
            onUploadProgress: (progressEvent) => {
                const progress = (progressEvent.loaded / progressEvent.total) * 100;
                progressBarFill.style.width = `${progress}%`;
            }
        });
        
        const data = await response.json();
        if (data.job_id) {
            window.location.href = `/status/${data.job_id}`;
        } else {
            showError('Error: ' + data.error);
        }
    } catch (error) {
        showError('Error: ' + error.message);
    } finally {
        submitButton.disabled = false;
        progressBar.style.display = 'none';
        loadingContainer.style.display = 'none';
    }
});

function showError(message) {
    const statusElement = document.getElementById('status');
    statusElement.innerHTML = `<div class="error-message">${message}</div>`;
}
