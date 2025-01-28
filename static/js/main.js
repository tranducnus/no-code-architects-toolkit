
document.getElementById('uploadForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log("Form submitted");
    const formData = new FormData(e.target);
    document.getElementById('status').textContent = 'Uploading...';
    
    try {
        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        if (data.job_id) {
            window.location.href = `/status/${data.job_id}`;
        } else {
            document.getElementById('status').textContent = 'Error: ' + data.error;
        }
    } catch (error) {
        document.getElementById('status').textContent = 'Error: ' + error.message;
    }
});
