document.addEventListener('DOMContentLoaded', function() {
    const dropzone = document.getElementById('dropzone');
    const videoInput = document.getElementById('videoInput');
    const processButton = document.getElementById('processButton');
    const generateTranscriptBtn = document.getElementById('generateTranscriptBtn');
    const transcriptText = document.getElementById('transcriptText');
    const processingProgress = document.getElementById('processingProgress');
    const uploadForm = document.getElementById('uploadForm');
    let selectedVideo = null;
    let processingInterval = null;

    // Drag and drop functionality
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

    // Handle existing video selection
    document.querySelectorAll('.video-card').forEach(card => {
        card.querySelector('.select-btn')?.addEventListener('click', () => {
            const videoName = card.dataset.video;
            selectVideo(videoName, card);
        });
    });

    async function handleFileUpload(file) {
        if (!file || !file.type.startsWith('video/')) {
            alert('Please select a valid video file');
            return;
        }

        const formData = new FormData();
        formData.append('video', file);

        try {
            processButton.disabled = true;
            const response = await fetch('/upload_only', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Upload failed');
            }

            if (data.success) {
                window.location.reload();
            } else {
                throw new Error(data.error || 'Upload failed');
            }
        } catch (error) {
            console.error('Upload error:', error);
            alert('Upload failed: ' + error.message);
        } finally {
            processButton.disabled = false;
        }
    }

    function selectVideo(videoName, card) {
        document.querySelectorAll('.video-card').forEach(c =>
            c.classList.remove('selected'));
        if (card) card.classList.add('selected');
        selectedVideo = videoName;
        const previewVideo = document.getElementById('previewVideo');
        if (previewVideo) {
            previewVideo.src = `/static/uploaded/${videoName}`;
        }
        showSection('editorSection');
        // Reset transcription state
        document.getElementById('transcriptText').value = '';
        document.getElementById('previewBtn').disabled = true;
    }

    function showSection(sectionId) {
        const section = document.getElementById(sectionId);
        if (section) {
            section.style.display = 'block';
        }
    }

    // Process video
    processButton.addEventListener('click', async () => {
        if (!selectedVideo) {
            alert('Please select a video first');
            return;
        }

        processButton.disabled = true;
        processingProgress.style.display = 'block';
        const progressBar = processingProgress.querySelector('.progress-bar-fill');
        progressBar.style.width = '0%';

        try {
            const formData = new FormData();
            formData.append('video', selectedVideo);

            const response = await fetch('/upload', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || `HTTP error! status: ${response.status}`);
            }

            if (data.job_id) {
                await checkStatus(data.job_id, progressBar);
            } else {
                throw new Error(data.error || 'Processing failed');
            }
        } catch (error) {
            console.error('Processing error:', error);
            alert('Processing failed: ' + error.message);
        } finally {
            if (processingInterval) {
                clearInterval(processingInterval);
            }
            processButton.disabled = false;
            processingProgress.style.display = 'none';
        }
    });


    // Style inputs
    const fontFamily = document.getElementById('fontFamily');
    const fontSize = document.getElementById('fontSize');
    const fontSizeDisplay = document.getElementById('fontSizeDisplay');
    const textColor = document.getElementById('textColor');
    const bgColor = document.getElementById('bgColor');
    const captionStyle = document.getElementById('captionStyle');
    const captionText = document.getElementById('captionText');
    const errorMessage = document.getElementById('errorMessage');


    // Live preview updates
    function updateCaptionPreview() {
        const captionPreview = document.getElementById('captionPreview');
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

    // Handle transcript generation
    // Generate SRT button handler
    document.getElementById('generateSrtBtn').addEventListener('click', () => {
        generateSrtAndAss();
    });

    generateTranscriptBtn.addEventListener('click', async () => {
        if (!selectedVideo) {
            alert('Please select a video first');
            return;
        }

        generateTranscriptBtn.disabled = true;
        transcriptText.value = 'Generating transcript...';
        processingProgress.style.display = 'block';
        const progressBar = processingProgress.querySelector('.progress-bar-fill');
        progressBar.style.width = '0%';

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
                const transcriptResponse = await fetch(`/status/${data.job_id}/transcript`);
                if (!transcriptResponse.ok) {
                    throw new Error('Failed to fetch transcript');
                }
                const transcriptData = await transcriptResponse.text();
                transcriptText.value = transcriptData;
                progressBar.style.width = '100%';
            }
        } catch (error) {
            console.error('Transcription error:', error);
            transcriptText.value = 'Error generating transcript';
        } finally {
            if (processingInterval) {
                clearInterval(processingInterval);
            }
            generateTranscriptBtn.disabled = false;
            processingProgress.style.display = 'none';
        }
    });

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

    // Handle transcript timing adjustments (This part remains unchanged)
    let transcriptTiming = {};

    function adjustTiming(index, adjustment) {
        if (!transcriptTiming[index]) {
            transcriptTiming[index] = 0;
        }
        transcriptTiming[index] += adjustment;
        document.getElementById(`timing-${index}`).textContent =
            `${transcriptTiming[index] > 0 ? '+' : ''}${transcriptTiming[index]}s`;
    }

    async function generateSrtAndAss() {
        if (!selectedVideo) {
            alert('Please select a video first');
            return;
        }

        const transcriptText = document.getElementById('transcriptText');
        const processingProgress = document.getElementById('processingProgress');
        
        transcriptText.value = 'Generating SRT and ASS files...';
        processingProgress.style.display = 'block';
        
        try {
            const response = await fetch('/v1/media/transcribe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    media_url: `/static/uploaded/${selectedVideo}`,
                    task: 'transcribe',
                    include_text: false,
                    include_srt: true,
                    include_segments: true,
                    word_timestamps: true,
                    response_type: 'direct'
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            
            // Display SRT content
            if (result.srt) {
                transcriptText.value = result.srt;
                
                // Create download links for SRT and ASS
                const srtBlob = new Blob([result.srt], { type: 'text/plain' });
                const srtUrl = URL.createObjectURL(srtBlob);
                const srtLink = document.createElement('a');
                srtLink.href = srtUrl;
                srtLink.download = 'caption.srt';
                srtLink.click();
                
                // Generate and download ASS
                const assContent = generateAssContent(result.segments);
                const assBlob = new Blob([assContent], { type: 'text/plain' });
                const assUrl = URL.createObjectURL(assBlob);
                const assLink = document.createElement('a');
                assLink.href = assUrl;
                assLink.download = 'caption.ass';
                assLink.click();
            }
        } catch (error) {
            console.error('Transcription error:', error);
            transcriptText.value = 'Error generating transcription files';
        } finally {
            processingProgress.style.display = 'none';
        }
    }

    function generateAssContent(segments) {
        const header = `[Script Info]
ScriptType: v4.00+
PlayResX: 1280
PlayResY: 720
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,48,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,2,2,2,10,10,10,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n`;

        const events = segments.map((segment, index) => {
            const startTime = formatAssTime(segment.start);
            const endTime = formatAssTime(segment.end);
            const text = segment.text.trim();
            return `Dialogue: 0,${startTime},${endTime},Default,,0,0,0,,${text}`;
        }).join('\n');

        return header + events;
    }

    function formatAssTime(seconds) {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        const cs = Math.floor((seconds % 1) * 100);
        return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${cs.toString().padStart(2, '0')}`;
    }
            transcriptText.value = 'Error generating SRT and ASS files';
        } finally {
            processingProgress.style.display = 'none';
        }
    }
});

async function checkStatus(jobId, progressBar) {
    if (processingInterval) {
        clearInterval(processingInterval);
    }

    let progress = 0;
    processingInterval = setInterval(() => {
        progress = Math.min(progress + 2, 95);
        if (progressBar) {
            progressBar.style.width = `${progress}%`;
        }
    }, 500);

    try {
        while (true) {
            const response = await fetch(`/status/${jobId}`);
            if (!response.ok) {
                throw new Error('Status check failed');
            }

            const data = await response.json();
            if (data.status === 'completed') {
                if (progressBar) {
                    progressBar.style.width = '100%';
                }
                window.location.reload();
                break;
            } else if (data.status === 'failed') {
                throw new Error(data.error || 'Processing failed');
            }

            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    } catch (error) {
        throw error;
    } finally {
        if (processingInterval) {
            clearInterval(processingInterval);
            processingInterval = null;
        }
    }
}