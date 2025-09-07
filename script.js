// Initialize AudioContext
console.log('Initializing AudioContext...');
const audioCtx = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'interactive' });
let audioBuffer = null; // Holds the decoded audio data
let sourceNode = null;  // AudioBufferSourceNode for playback
let isPlaying = false;
let startTime = 0;      // Time when playback started
let pausedAt = 0;       // Time where playback was paused
let zoomLevel = 1;      // Zoom factor for waveform
let cuePoints = [];     // Array to store cue objects with time and id
let cueColorIndex = 0;  // Index to cycle through cue colors
let keyToCueMap = new Map(); // Maps keys to cue IDs
let cueToKeyMap = new Map(); // Maps cue IDs to keys

// Canvas setup
const waveformCanvas = document.getElementById('waveform');
const waveformCtx = waveformCanvas.getContext('2d');

// UI elements
const playBtn = document.getElementById('playBtn');
const stopBtn = document.getElementById('stopBtn');
const zoomInBtn = document.getElementById('zoomIn');
const zoomOutBtn = document.getElementById('zoomOut');
const cueButtonsContainer = document.getElementById('cueButtons');
const emptyStateEl = document.getElementById('empty-state');
const fileNameEl = document.getElementById('fileName');
const noCuesMessage = document.getElementById('no-cues');
const audioFileInput = document.getElementById('audioFile');

// Define available keyboard keys for mapping
const availableKeys = [
    'q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p',
    'a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l',
    'z', 'x', 'c', 'v', 'b', 'n', 'm'
];

// Make canvas responsive
function resizeCanvas() {
    const container = waveformCanvas.parentElement;
    waveformCanvas.width = container.clientWidth;
    waveformCanvas.height = container.clientHeight;
    if (audioBuffer) {
        drawWaveform();
    }
}

// Initialize canvas size
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Resume AudioContext on user interaction (fixes suspended state)
document.addEventListener('click', () => {
    if (audioCtx.state === 'suspended') {
        audioCtx.resume().then(() => console.log('AudioContext resumed'));
    }
}, { once: true });


// Load audio file
audioFileInput.addEventListener('change', async (e) => {
    console.log('Audio file input changed');
    const file = e.target.files[0];
    
    if (file) {
        console.log('File selected:', file.name);
        fileNameEl.textContent = file.name;
        fileNameEl.classList.add('file-loaded');
        
        // Show loading state
        emptyStateEl.innerHTML = `
            <div class="loading-spinner"></div>
            <p>Loading audio file...</p>
        `;
        
        try {
            const arrayBuffer = await file.arrayBuffer();
            audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
            console.log('Audio decoded successfully, duration:', audioBuffer.duration);
            
            // Hide empty state
            emptyStateEl.style.display = 'none';
            
            // Enable controls
            playBtn.disabled = false;
            stopBtn.disabled = false;
            
            // Draw waveform
            drawWaveform();
            
        } catch (err) {
            console.error('Error decoding audio:', err);
            emptyStateEl.innerHTML = `
                <svg class="icon-large" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                </svg>
                <p class="error-message">Failed to load audio file. Please try another file.</p>
            `;
        }
    } else {
        console.warn('No file selected');
        fileNameEl.textContent = 'No file selected';
        fileNameEl.classList.remove('file-loaded');
    }
});


// Update play button icon
function updatePlayButton() {
    if (isPlaying) {
        playBtn.innerHTML = `
            <svg class="icon" viewBox="0 0 24 24">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
            </svg>
        `;
        playBtn.classList.add('pause');
    } else {
        playBtn.innerHTML = `
            <svg class="icon" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
            </svg>
        `;
        playBtn.classList.remove('pause');
    }
}

// Playback controls
playBtn.addEventListener('click', () => {
    console.log('Play/Pause button clicked');
    if (isPlaying) {
        pausedAt = audioCtx.currentTime - startTime;
        sourceNode.stop();
        sourceNode = null; // Clear the node after stopping
        isPlaying = false;
        console.log('Paused at:', pausedAt.toFixed(6));
    } else if (audioBuffer) {
        startPlayback(pausedAt);
        console.log('Playing from:', pausedAt.toFixed(6));
    } else {
        console.warn('No audio loaded to play');
        return;
    }
    
    updatePlayButton();
});

stopBtn.addEventListener('click', () => {
    console.log('Stop button clicked');
    if (sourceNode) {
        sourceNode.stop();
        sourceNode = null;
    }
    isPlaying = false;
    pausedAt = 0;
    console.log('Playback stopped');
    updatePlayButton();
});

// // Zoom controls
// zoomInBtn.addEventListener('click', () => {
//     console.log('Zoom In button clicked');
//     zoomLevel *= 1.2;
//     drawWaveform();
//     console.log('Zoom level set to:', zoomLevel);
// });

// zoomOutBtn.addEventListener('click', () => {
//     console.log('Zoom Out button clicked');
//     zoomLevel = Math.max(1, zoomLevel / 1.2);
//     drawWaveform();
//     console.log('Zoom level set to:', zoomLevel);
// });

// Format time in MM:SS.ms format
function formatTime(timeInSeconds) {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    const milliseconds = Math.floor((timeInSeconds % 1) * 100);
    
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
}

// Helper function to start playback
function startPlayback(startOffset) {
    if (sourceNode) {
        sourceNode.stop();
    }
    sourceNode = audioCtx.createBufferSource();
    sourceNode.buffer = audioBuffer;
    sourceNode.connect(audioCtx.destination);
    sourceNode.start(0, startOffset);
    startTime = audioCtx.currentTime - startOffset;
    isPlaying = true;
    
    // Add ended event listener to update UI when playback ends
    sourceNode.onended = () => {
        if (isPlaying) { // Only update if not manually stopped
            isPlaying = false;
            updatePlayButton();
            console.log('Playback ended naturally');
        }
    };
}

// Get the next cue color
function getNextCueColor() {
    // Get available colors from CSS variable
    const style = getComputedStyle(document.documentElement);
    const colorsStr = style.getPropertyValue('--cue-colors').trim();
    const colors = colorsStr.split(',').map(color => color.trim());
    
    // Cycle through colors
    const color = colors[cueColorIndex % colors.length];
    cueColorIndex++;
    return color;
}

// Draw waveform
function drawWaveform() {
    if (!audioBuffer) return;
    
    const width = waveformCanvas.width;
    const height = waveformCanvas.height;
    
    waveformCtx.clearRect(0, 0, width, height);
    
    // Draw background
    waveformCtx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--bg-tertiary');
    waveformCtx.fillRect(0, 0, width, height);
    
    const channelData = audioBuffer.getChannelData(0);
    const step = Math.ceil(channelData.length / (width * zoomLevel));
    const amp = height / 2;
    
    // Draw center line
    waveformCtx.beginPath();
    waveformCtx.moveTo(0, amp);
    waveformCtx.lineTo(width, amp);
    waveformCtx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    waveformCtx.stroke();
    
    // Draw waveform
    waveformCtx.beginPath();
    waveformCtx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent-primary');
    waveformCtx.lineWidth = 2;
    
    for (let i = 0; i < width; i++) {
        let min = 1.0;
        let max = -1.0;
        const dataStart = Math.floor((i * zoomLevel) * step);
        
        for (let j = 0; j < step; j++) {
            const dataIndex = dataStart + j;
            if (dataIndex < channelData.length) {
                const datum = channelData[dataIndex];
                if (datum < min) min = datum;
                if (datum > max) max = datum;
            }
        }
        
        waveformCtx.moveTo(i, (1 + min) * amp);
        waveformCtx.lineTo(i, (1 + max) * amp);
    }
    
    waveformCtx.stroke();
    
    // // Draw playback position
    // if (isPlaying) {
    //     const currentTime = audioCtx.currentTime - startTime;
    //     const x = (currentTime / audioBuffer.duration) * width / zoomLevel;
        
    //     waveformCtx.beginPath();
    //     waveformCtx.moveTo(x, 0);
    //     waveformCtx.lineTo(x, height);
    //     waveformCtx.strokeStyle = '#ffffff';
    //     waveformCtx.lineWidth = 2;
    //     waveformCtx.stroke();
    // } else if (pausedAt > 0) {
    //     const x = (pausedAt / audioBuffer.duration) * width / zoomLevel;
        
    //     waveformCtx.beginPath();
    //     waveformCtx.moveTo(x, 0);
    //     waveformCtx.lineTo(x, height);
    //     waveformCtx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    //     waveformCtx.lineWidth = 2;
    //     waveformCtx.stroke();
    // }
    
    // Draw cue points
    cuePoints.forEach(cue => {
        const x = (cue.time / audioBuffer.duration) * width / zoomLevel;
        
        // Draw marker line
        waveformCtx.beginPath();
        waveformCtx.moveTo(x, 0);
        waveformCtx.lineTo(x, height);
        waveformCtx.strokeStyle = cue.color;
        waveformCtx.lineWidth = 3;
        waveformCtx.stroke();
        
        // Draw marker point
        waveformCtx.beginPath();
        waveformCtx.arc(x, 10, 5, 0, Math.PI * 2);
        waveformCtx.fillStyle = cue.color;
        waveformCtx.fill();
        
        // Draw time label
        waveformCtx.font = '10px sans-serif';
        waveformCtx.fillStyle = '#ffffff';
        waveformCtx.textAlign = 'center';
        waveformCtx.fillText(formatTime(cue.time), x, 25);
    });
    
    // // Request animation frame for playback position updates
    // if (isPlaying) {
    //     requestAnimationFrame(drawWaveform);
    // }
}

// Add cue point on waveform click
waveformCanvas.addEventListener('click', (e) => {
    if (!audioBuffer) {
        console.warn('No audio loaded yet');
        return;
    }
    
    const rect = waveformCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = (x / waveformCanvas.width * zoomLevel) * audioBuffer.duration;
    
    console.log('Waveform clicked at time (seconds):', time.toFixed(6));
    addCuePoint(time);
});

// Add cue point
function addCuePoint(time) {
    const cueId = `cue-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const cueColor = getNextCueColor();
    
    cuePoints.push({ id: cueId, time: time, color: cueColor });
    console.log('Adding cue point at time:', time.toFixed(6), 'with ID:', cueId);
    
    drawWaveform();
    createCueButton(cueId, time, cueColor);
    
    // Hide the "no cues" message
    noCuesMessage.style.display = 'none';
}

// Modify the createCueButton function to add key mapping
function createCueButton(cueId, time, color) {
    console.log('Creating cue button for time:', time.toFixed(2), 'with ID:', cueId);
    
    const cueButton = document.createElement('button');
    cueButton.className = 'cue-button';
    cueButton.style.backgroundColor = color;
    cueButton.dataset.cueId = cueId;
   
    // Create text label
    const textSpan = document.createElement('span');
    textSpan.textContent = formatTime(time);
    
    // Assign a keyboard key if available
    let keyLabel = '';
    for (const key of availableKeys) {
        if (!keyToCueMap.has(key)) {
            keyToCueMap.set(key, cueId);
            cueToKeyMap.set(cueId, key);
            keyLabel = key.toUpperCase();
            break;
        }
    }
    
    // Add key label if a key was assigned
    if (keyLabel) {
        const keyBadge = document.createElement('span');
        keyBadge.className = 'key-badge';
        keyBadge.textContent = keyLabel;
        cueButton.appendChild(keyBadge);
    }
    
    cueButton.appendChild(textSpan);
    
    // Add click event for playback
    cueButton.addEventListener('mousedown', (e) => {
        if (e.shiftKey) {
            removeCuePoint(cueId);
        } else {
            startPlayback(time);
            isPlaying = true;
            updatePlayButton();
        }
    });
    
    cueButtonsContainer.appendChild(cueButton);
    console.log('Cue button appended to DOM');
    
    if (keyLabel) {
        console.log(`Mapped cue point to key: ${keyLabel}`);
    }
    
    return keyLabel; // Return the assigned key
}

// Update removeCuePoint to handle key mappings
function removeCuePoint(cueId) {
    console.log('Removing cue point with ID:', cueId);
    
    // Remove key mapping if exists
    if (cueToKeyMap.has(cueId)) {
        const key = cueToKeyMap.get(cueId);
        keyToCueMap.delete(key);
        cueToKeyMap.delete(cueId);
        console.log(`Unmapped key ${key.toUpperCase()} from cue point`);
    }
    
    cuePoints = cuePoints.filter(cue => cue.id !== cueId);
    
    const button = cueButtonsContainer.querySelector(`button[data-cue-id="${cueId}"]`);
    if (button) {
        button.remove();
        console.log('Cue button removed from DOM');
    } else {
        console.warn('No matching button found for cue ID:', cueId);
    }
    
    drawWaveform();
    
    // Show "no cues" message if no cue points left
    if (cuePoints.length === 0) {
        noCuesMessage.style.display = 'block';
    }
}

// Add keyboard event listener to document
document.addEventListener('keydown', (e) => {
    // Don't trigger when typing in input fields
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
    }
    
    const key = e.key.toLowerCase();
    
    if (keyToCueMap.has(key) && audioBuffer) {
        const cueId = keyToCueMap.get(key);
        const cue = cuePoints.find(c => c.id === cueId);
        
        if (cue) {
            console.log(`Key ${key.toUpperCase()} pressed - jumping to cue at ${cue.time.toFixed(2)}`);
            
            // Highlight the corresponding button briefly
            const button = cueButtonsContainer.querySelector(`button[data-cue-id="${cueId}"]`);
            if (button) {
                button.classList.add('key-triggered');
                setTimeout(() => {
                    button.classList.remove('key-triggered');
                }, 200);
            }
            
            startPlayback(cue.time);
            isPlaying = true;
            updatePlayButton();
        }
    }
});

//---------------------// Step Sequencer Implementation //----------------------//
//------------------------------------------------------------------------------//

// Sequencer state
let sequencerGrid = []; // 2D array of steps (rows × 16)
let sequencerPlaying = false;
let currentStep = -1;
let nextStepTime = 0;
let stepDuration = 0; // Will be calculated based on tempo
let lookahead = 25.0; // How far ahead to schedule audio (milliseconds)
let scheduleAheadTime = 0.1; // How far ahead to schedule audio (seconds)
let timerID = null; // The JavaScript timer used to schedule events
let tempoBpm = 120; // Default tempo
let ppqn = 96; // Pulses Per Quarter Note
let ticksPerStep = 24; // 96 PPQN ÷ 4 (16th notes) = 24 ticks per step
let tickCount = 0;

// DOM elements for sequencer
let sequencerGridEl, sequencerLabelsEl, tempoBpmInput, sequencerPlayBtn, sequencerStopBtn;

// Initialize sequencer when document is ready
function initSequencer() {
    console.log('Initializing step sequencer...');
    // Get DOM elements
    sequencerGridEl = document.querySelector('.sequencer-grid');
    sequencerLabelsEl = document.querySelector('.sequencer-labels');
    tempoBpmInput = document.getElementById('tempoBpm');
    sequencerPlayBtn = document.getElementById('sequencerPlayBtn');
    sequencerStopBtn = document.getElementById('sequencerStopBtn');
    
    // Initialize the grid data structure
    updateSequencerGrid();
    
    // Add event listeners
    tempoBpmInput.addEventListener('change', updateTempo);
    sequencerPlayBtn.addEventListener('click', toggleSequencer);
    sequencerStopBtn.addEventListener('click', () => {
        // Stop the sequencer
        stopSequencer();
        
        // Also stop the main audio playback
        if (sourceNode) {
            sourceNode.stop();
            sourceNode = null;
        }
        isPlaying = false;
        pausedAt = 0;
        console.log('Main playback stopped');
        updatePlayButton();
    });
    
    // Update tempo from input
    updateTempo();
    
    // Add observer for changes to cue buttons
    const cueButtonsObserver = new MutationObserver(function(mutations) {
        updateSequencerGrid();
    });
    
    cueButtonsObserver.observe(cueButtonsContainer, { 
        childList: true,
        subtree: false 
    });
}

// Update the sequencer grid when cue points change
function updateSequencerGrid() {
    // Clear existing grid
    if (sequencerGridEl) {
        sequencerGridEl.innerHTML = '';
        sequencerLabelsEl.innerHTML = '';
    }
    
    // Get all cue points
    const cueButtons = Array.from(cueButtonsContainer.querySelectorAll('.cue-button'));
    
    if (cueButtons.length === 0) {
        if (sequencerGridEl) {
            sequencerGridEl.innerHTML = '<div class="sequencer-empty">Add cue points to use the sequencer</div>';
        }
        sequencerGrid = [];
        return;
    }
    
    // Initialize or resize grid array based on number of cues
    sequencerGrid = new Array(cueButtons.length);
    for (let i = 0; i < cueButtons.length; i++) {
        sequencerGrid[i] = new Array(16).fill(false);
    }
    
    // Create rows for each cue
    cueButtons.forEach((cueButton, rowIndex) => {
        const cueId = cueButton.dataset.cueId;
        const cueColor = window.getComputedStyle(cueButton).backgroundColor;
        
        // Create cue label
        const labelEl = document.createElement('div');
        labelEl.className = 'sequencer-label';
        labelEl.style.backgroundColor = cueColor;
        
        // Get the time text from the button
        const timeText = cueButton.querySelector('span:not(.key-badge)').textContent;
        labelEl.textContent = timeText;
        sequencerLabelsEl.appendChild(labelEl);
        
        // Create row for this cue
        const rowEl = document.createElement('div');
        rowEl.className = 'sequencer-row';
        rowEl.dataset.cueId = cueId;
        rowEl.dataset.rowIndex = rowIndex;
        
        // Create 16 steps for this row
        for (let step = 0; step < 16; step++) {
            const stepEl = document.createElement('div');
            stepEl.className = 'sequencer-step' + (step % 4 === 0 ? ' step-beat' : '');
            stepEl.dataset.step = step;
            
            // Add click handler for toggling steps
            stepEl.addEventListener('click', () => {
                sequencerGrid[rowIndex][step] = !sequencerGrid[rowIndex][step];
                stepEl.classList.toggle('active', sequencerGrid[rowIndex][step]);
            });
            
            rowEl.appendChild(stepEl);
        }
        
        sequencerGridEl.appendChild(rowEl);
    });
}

// Update tempo and recalculate timing values
function updateTempo() {
    tempoBpm = parseInt(tempoBpmInput.value) || 120;
    // Clamp to reasonable range
    tempoBpm = Math.max(60, Math.min(200, tempoBpm));
    tempoBpmInput.value = tempoBpm;
    
    // Calculate step duration (in seconds)
    // 60 seconds per minute / tempoBpm = duration of a quarter note
    // (60/tempoBpm)/4 = duration of a 16th note (one step)
    stepDuration = 60.0 / tempoBpm / 4;
    console.log(`Tempo set to ${tempoBpm} BPM, step duration: ${stepDuration.toFixed(6)}s`);
}

// Toggle sequencer play/pause
function toggleSequencer() {
    if (sequencerPlaying) {
        stopSequencer();
    } else {
        startSequencer();
    }
}

// Start the sequencer
function startSequencer() {
    if (sequencerGrid.length === 0 || !audioBuffer) {
        console.warn("Can't start sequencer: no cues or audio loaded");
        return;
    }
    
    currentStep = -1;
    tickCount = 0;
    nextStepTime = audioCtx.currentTime;
    sequencerPlaying = true;
    updateSequencerPlayButton();
    scheduler(); // Start the scheduler
    console.log('Sequencer started');
}

// Stop the sequencer
function stopSequencer() {
    sequencerPlaying = false;
    clearTimeout(timerID);
    resetPlayingIndicators();
    updateSequencerPlayButton();
    console.log('Sequencer stopped');
}

// Update play button icon
function updateSequencerPlayButton() {
    if (sequencerPlaying) {
        sequencerPlayBtn.innerHTML = `
            <svg class="icon" viewBox="0 0 24 24">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
            </svg>
        `;
        sequencerPlayBtn.classList.add('pause');
    } else {
        sequencerPlayBtn.innerHTML = `
            <svg class="icon" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
            </svg>
        `;
        sequencerPlayBtn.classList.remove('pause');
    }
}

// Clear playing indicators from all steps
function resetPlayingIndicators() {
    const steps = document.querySelectorAll('.sequencer-step');
    steps.forEach(step => {
        step.classList.remove('playing');
    });
}

// Main scheduler function - schedules the next sequence of steps
function scheduler() {
    // Schedule events until the next lookahead boundary
    const currentTime = audioCtx.currentTime;
    
    // Schedule steps until we've filled the lookahead window
    while (nextStepTime < currentTime + scheduleAheadTime) {
        scheduleTick();
    }
    
    // Set up the next scheduler call
    timerID = setTimeout(scheduler, lookahead);
}

// Schedule a single tick
function scheduleTick() {
    // Calculate if this tick is on a step boundary
    const isStepBoundary = tickCount % ticksPerStep === 0;
    
    if (isStepBoundary) {
        // This tick marks a new step
        currentStep = (currentStep + 1) % 16;
        scheduleStep(currentStep, nextStepTime);
    }
    
    // Increment tick counter and calculate next tick time
    tickCount++;
    // Tick duration = step duration / ticks per step
    nextStepTime += stepDuration / ticksPerStep;
}

// Schedule the notes and visual updates for a step
function scheduleStep(step, time) {
    // Schedule audio - trigger any active cues for this step
    sequencerGrid.forEach((row, rowIndex) => {
        if (row[step]) {
            // Find the corresponding cue and trigger it
            const cueButtons = Array.from(cueButtonsContainer.querySelectorAll('.cue-button'));
            if (rowIndex < cueButtons.length) {
                const cueId = cueButtons[rowIndex].dataset.cueId;
                const cue = cuePoints.find(c => c.id === cueId);
                if (cue) {
                    // Schedule the cue to play at the precise time
                    scheduleCuePlay(cue.time, time);
                }
            }
        }
    });
    
    // Schedule visual update
    const scheduledTime = time - audioCtx.currentTime;
    setTimeout(() => {
        updatePlayingStep(step);
    }, scheduledTime * 1000);
}

// Schedule a cue to play at a specific time
function scheduleCuePlay(cueTime, scheduledTime) {
    if (sourceNode) {
        // If already playing, we stop the current playback
        sourceNode.stop();
    }
    
    sourceNode = audioCtx.createBufferSource();
    sourceNode.buffer = audioBuffer;
    sourceNode.connect(audioCtx.destination);
    
    // Start playback at the cue time, scheduled to occur at scheduledTime
    sourceNode.start(scheduledTime, cueTime);
    
    // Update state variables to reflect new playback
    startTime = scheduledTime - cueTime;
    isPlaying = true;
    
    // We don't update the play button since we want the sequencer
    // to be in control of playback
}

// Update the visual indicator for the currently playing step
function updatePlayingStep(step) {
    if (!sequencerPlaying) return;
    
    // Clear previous playing indicators
    resetPlayingIndicators();
    
    // Highlight the current step in each row
    const rows = document.querySelectorAll('.sequencer-row');
    rows.forEach(row => {
        const stepEl = row.querySelector(`.sequencer-step:nth-child(${step + 1})`);
        if (stepEl) {
            stepEl.classList.add('playing');
        }
    });
}

// Add event listener to initialize sequencer when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Check if HTML elements for sequencer already exist
    if (!document.querySelector('.sequencer-section')) {
        // Create and add sequencer HTML
        const sequencerHTML = `
            <section class="sequencer-section">
                <h2>Step Sequencer</h2>
                <div class="sequencer-controls">
                    <div class="tempo-control">
                        <label for="tempoBpm">BPM:</label>
                        <input type="number" id="tempoBpm" min="60" max="200" value="120">
                    </div>
                    <div class="transport-controls">
                        <button id="sequencerPlayBtn" class="control-btn">
                            <svg class="icon" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z"/>
                            </svg>
                        </button>
                        <button id="sequencerStopBtn" class="control-btn">
                            <svg class="icon" viewBox="0 0 24 24">
                                <path d="M6 6h12v12H6z"/>
                            </svg>
                        </button>
                    </div>
                </div>
                <div class="sequencer-grid-container">
                    <div class="sequencer-labels">
                        <!-- Cue labels will be dynamically added here -->
                    </div>
                    <div class="sequencer-grid">
                        <!-- Grid will be dynamically generated -->
                    </div>
                </div>
            </section>
        `;
        
        // Append sequencer section after cue points section
        const cuePointsSection = document.querySelector('.cue-points-section');
        if (cuePointsSection) {
            cuePointsSection.insertAdjacentHTML('afterend', sequencerHTML);
        } else {
            document.querySelector('.app-container').insertAdjacentHTML('beforeend', sequencerHTML);
        }
    }
    
    // Add sequencer styles to head
    const sequencerStyles = `
        /* Step Sequencer Styles */
        .sequencer-section {
            margin-top: var(--space-xl);
        }

        .sequencer-controls {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: var(--space-md);
        }

        .tempo-control {
            display: flex;
            align-items: center;
            gap: var(--space-sm);
        }

        .tempo-control label {
            font-size: 0.9rem;
            color: var(--text-secondary);
        }

        .tempo-control input {
            width: 60px;
            background-color: var(--bg-tertiary);
            border: none;
            border-radius: var(--radius-sm);
            padding: var(--space-xs) var(--space-sm);
            color: var(--text-primary);
            font-size: 0.9rem;
        }

        .sequencer-grid-container {
            display: flex;
            margin-top: var(--space-md);
        }

        .sequencer-labels {
            display: flex;
            flex-direction: column;
            gap: 4px;
            margin-right: var(--space-sm);
            width: 80px;
        }

        .sequencer-label {
            height: 30px;
            display: flex;
            align-items: center;
            color: var(--text-primary);
            font-size: 0.8rem;
            padding: 0 var(--space-xs);
            border-radius: var(--radius-sm) 0 0 var(--radius-sm);
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .sequencer-grid {
            display: flex;
            flex-direction: column;
            gap: 4px;
            flex: 1;
        }

        .sequencer-row {
            display: grid;
            grid-template-columns: repeat(16, 1fr);
            gap: 4px;
            height: 30px;
        }

        .sequencer-step {
            background-color: var(--bg-tertiary);
            border-radius: var(--radius-sm);
            cursor: pointer;
            transition: background-color 0.2s;
        }

        .sequencer-step:hover {
            background-color: var(--button-hover);
        }

        .sequencer-step.active {
            background-color: var(--accent-primary);
        }

        .sequencer-step.playing {
            border: 2px solid rgba(255, 255, 255, 0.8);
        }

        .sequencer-step.active.step-beat {
            background-color: var(--accent-primary);
        }

        .step-beat {
            background-color: rgba(255, 255, 255, 0.1);
        }

        /* Empty state when no cues are available */
        .sequencer-empty {
            height: 100px;
            display: flex;
            justify-content: center;
            align-items: center;
            color: var(--text-secondary);
            font-style: italic;
            background-color: var(--bg-tertiary);
            border-radius: var(--radius-md);
            margin-top: var(--space-md);
        }

        /* Responsive adjustments */
        @media (max-width: 768px) {
            .sequencer-label {
                width: 60px;
            }
            
            .sequencer-step {
                min-width: 20px;
            }
        }
    `;
    
    const styleEl = document.createElement('style');
    styleEl.textContent = sequencerStyles;
    document.head.appendChild(styleEl);
    
    // Initialize sequencer
    initSequencer();
});

// If DOM is already loaded, initialize now
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(initSequencer, 100);
}