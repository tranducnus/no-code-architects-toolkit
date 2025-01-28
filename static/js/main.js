document.getElementById('uploadForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log("Form submitted");
    const file = e.target.video.files[0]; // Assuming the file input has id 'video'

    const CHUNK_SIZE = 1024 * 1024; // 1MB chunks
    const formData = new FormData();
    const chunks = Math.ceil(file.size / CHUNK_SIZE);
    for(let i = 0; i < chunks; i++) {
        const chunk = file.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
        formData.append('chunk', chunk);
        formData.append('chunk_index', i);
    }

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