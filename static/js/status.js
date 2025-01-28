
async function checkStatus() {
    const statusElem = document.getElementById('currentStatus');
    const resultElem = document.getElementById('result');
    
    try {
        const response = await fetch(`/status/${jobId}`);
        if (!response.ok) throw new Error('Failed to fetch status');
        
        const data = await response.json();
        statusElem.textContent = `Status: ${data.status}`;
        console.log('Current status:', data);  // Debug log
        
        if (data.status === 'completed') {
            resultElem.innerHTML = `
                <div class="success-message">Processing completed!</div>
                <video width="100%" controls>
                    <source src="${data.url}" type="video/mp4">
                    Your browser does not support the video tag.
                </video>
                <a href="${data.url}" download class="download-button">Download Video</a>`;
            return;
        }
        
        if (data.status === 'failed') {
            resultElem.innerHTML = `
                <div class="error-message">
                    Processing failed: ${data.error}
                    <br><a href="/" class="retry-button">Try Again</a>
                </div>`;
            return;
        }
        
        setTimeout(checkStatus, 2000);
    } catch (error) {
        statusElem.textContent = 'Error checking status';
        resultElem.innerHTML = `
            <div class="error-message">
                ${error.message}
                <br><a href="/" class="retry-button">Try Again</a>
            </div>`;
    }
}

checkStatus();
