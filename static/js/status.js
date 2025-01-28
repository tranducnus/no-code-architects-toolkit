
async function checkStatus() {
    try {
        const response = await fetch(`/status/${jobId}`);
        const data = await response.json();
        
        document.getElementById('currentStatus').textContent = data.status;
        
        if (data.status === 'completed') {
            document.getElementById('result').innerHTML = `
                <video width="100%" controls>
                    <source src="${data.url}" type="video/mp4">
                    Your browser does not support the video tag.
                </video>`;
            return;
        }
        
        if (data.status === 'failed') {
            document.getElementById('result').textContent = 'Processing failed: ' + data.error;
            return;
        }
        
        setTimeout(checkStatus, 2000);
    } catch (error) {
        document.getElementById('currentStatus').textContent = 'Error checking status: ' + error.message;
    }
}

checkStatus();
