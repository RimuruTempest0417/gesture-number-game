const videoElement = document.getElementById('webcam');
const overlayCanvas = document.getElementById('overlay');
const overlayCtx = overlayCanvas.getContext('2d');
const targetNumEl = document.getElementById('target-number');
const progressEl = document.getElementById('progress');
const statusEl = document.getElementById('game-status');
const detectedResultEl = document.getElementById('detected-result');
const victoryModal = document.getElementById('victory-modal');
const fingerHintEl = document.getElementById('finger-hint');
const starsEl = document.getElementById('stars');
const soundToggleEl = document.getElementById('sound-toggle');

let currentTarget = 0;
let lastTarget = null; // 唔想連續兩題出同一個數字
let score = 0;
const TOTAL_QUESTIONS = 10;
const MIN_TARGET = 1;   // 1 ~ 10
const MAX_TARGET = 10;
let isCooldown = false; // 避免比對成功後重複觸發

// 每個數字對應的示範手勢（6 以上要用兩隻手），讓小朋友一眼睇到要伸幾隻手指
const FINGER_HINTS = {
    1: '☝️',
    2: '✌️',
    3: '🤟',
    4: '🖖',
    5: '🖐️',
    6: '🖐️☝️',
    7: '🖐️✌️',
    8: '🖐️🤟',
    9: '🖐️🖖',
    10: '🖐️🖐️'
};

// 生成 1 ~ 10 的隨機數字（兩隻手加起來最多 10 隻手指）
function getRandomNumber() {
    let n = MIN_TARGET;
    // 有限次重試避免連續出同一個數字；就算 random 固定都唔會變成無限迴圈
    for (let i = 0; i < 12; i++) {
        n = Math.floor(Math.random() * (MAX_TARGET - MIN_TARGET + 1)) + MIN_TARGET;
        if (n !== lastTarget) break;
    }
    lastTarget = n;
    return n;
}

function nextQuestion() {
    if (score >= TOTAL_QUESTIONS) {
        // 通關：進度要顯示 10 / 10，唔可以停在 9 / 10
        progressEl.innerText = `${TOTAL_QUESTIONS} / ${TOTAL_QUESTIONS}`;
        starsEl.innerText = '⭐'.repeat(TOTAL_QUESTIONS);
        targetNumEl.innerText = '🏆';
        fingerHintEl.innerText = '';
        victoryModal.classList.remove('hidden');
        statusEl.innerText = "遊戲完成！";
        playVictorySound();
        return;
    }
    currentTarget = getRandomNumber();
    targetNumEl.innerText = currentTarget;
    fingerHintEl.innerText = `${FINGER_HINTS[currentTarget]} 兩隻手加埋 ${currentTarget} 隻手指`;
    progressEl.innerText = `${score} / ${TOTAL_QUESTIONS}`;
    starsEl.innerText = '⭐'.repeat(score);
}

function restartGame() {
    score = 0;
    lastTarget = null;
    victoryModal.classList.add('hidden');
    statusEl.innerText = "兩隻手嘅手指加埋＝目標數字就過關！";
    nextQuestion();
    playRoundSound();
}

/* ---------------- 手部骨架繪圖 ---------------- */

const HAND_CONNECTIONS = [
    [0, 1], [1, 2], [2, 3], [3, 4],
    [0, 5], [5, 6], [6, 7], [7, 8],
    [5, 9], [9, 10], [10, 11], [11, 12],
    [9, 13], [13, 14], [14, 15], [15, 16],
    [13, 17], [17, 18], [18, 19], [19, 20],
    [0, 17]
];

const HAND_COLORS = ['rgba(46, 213, 115, 0.95)', 'rgba(255, 184, 0, 0.95)'];

function resizeOverlay(width, height) {
    if (overlayCanvas.width !== width || overlayCanvas.height !== height) {
        overlayCanvas.width = width;
        overlayCanvas.height = height;
    }
}

function drawOneHand(landmarks, color) {
    const w = overlayCanvas.width;
    const h = overlayCanvas.height;

    overlayCtx.lineWidth = Math.max(2, w / 200);
    overlayCtx.strokeStyle = color;
    overlayCtx.lineCap = 'round';

    for (const [a, b] of HAND_CONNECTIONS) {
        overlayCtx.beginPath();
        overlayCtx.moveTo(landmarks[a].x * w, landmarks[a].y * h);
        overlayCtx.lineTo(landmarks[b].x * w, landmarks[b].y * h);
        overlayCtx.stroke();
    }

    overlayCtx.fillStyle = '#ffffff';
    for (const point of landmarks) {
        overlayCtx.beginPath();
        overlayCtx.arc(point.x * w, point.y * h, Math.max(2, w / 120), 0, Math.PI * 2);
        overlayCtx.fill();
    }
}

// 用連線畫出手掌骨架（可以同時畫兩隻手），讓小朋友知道自己隻手被睇到
function drawSkeletons(handsLandmarks) {
    const w = overlayCanvas.width;
    const h = overlayCanvas.height;
    if (!w || !h || !handsLandmarks || handsLandmarks.length === 0) return;

    overlayCtx.clearRect(0, 0, w, h);
    handsLandmarks.forEach((landmarks, i) => {
        drawOneHand(landmarks, HAND_COLORS[i % HAND_COLORS.length]);
    });
}

function clearSkeleton() {
    overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
}

// 畫面係鏡像翻轉的，所以用鏡像後的 x 位置判斷係邊隻手（小朋友的視角）
function handSideLabel(landmarks) {
    const mirroredX = 1 - landmarks[0].x;
    return mirroredX < 0.5 ? '左手' : '右手';
}

/* ---------------- 音效 (Web Audio API，唔需要外部檔案) ---------------- */

let audioCtx = null;
let soundOn = true;

function initAudio() {
    if (!soundOn) return false;
    try {
        if (!audioCtx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return false;
            audioCtx = new AudioCtx();
        }
        if (audioCtx.state === 'suspended') audioCtx.resume();
        return true;
    } catch (err) {
        soundOn = false;
        if (soundToggleEl) soundToggleEl.innerText = "🔇 音效：關";
        return false;
    }
}

function tone(freq, delay, duration, volume = 0.12) {
    if (!initAudio()) return;
    const start = audioCtx.currentTime + delay;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(start);
    osc.stop(start + duration);
}

function playCorrectSound() {
    tone(660, 0, 0.12);
    tone(880, 0.12, 0.18);
}

function playRoundSound() {
    tone(520, 0, 0.08, 0.07);
}

function playVictorySound() {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.16, 0.22, 0.14));
}

if (soundToggleEl) {
    soundToggleEl.addEventListener('click', () => {
        soundOn = !soundOn;
        soundToggleEl.innerText = soundOn ? "🔊 音效：開" : "🔇 音效：關";
        if (soundOn) {
            initAudio();
            playRoundSound();
        }
    });
}

/* ---------------- 手指張開檢測邏輯 (單手 0-5) ---------------- */

function countFingers(landmarks) {
    let count = 0;

    // 大拇指 (根據 x 軸判定，判斷指尖是否在大拇指關節外側)
    // 判斷左手或右手
    const isRightHand = landmarks[0].x < landmarks[9].x;
    if (isRightHand) {
        if (landmarks[4].x < landmarks[3].x) count++;
    } else {
        if (landmarks[4].x > landmarks[3].x) count++;
    }

    // 其餘四指 (食指, 中指, 無名指, 尾指) 根據 y 軸判定 (指尖高於關節)
    const fingerTips = [8, 12, 16, 20];
    const fingerPipJoints = [6, 10, 14, 18];

    for (let i = 0; i < 4; i++) {
        if (landmarks[fingerTips[i]].y < landmarks[fingerPipJoints[i]].y) {
            count++;
        }
    }

    return count;
}

/* ---------------- MediaPipe Hands 初始化 ---------------- */

const hands = new Hands({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
});

hands.setOptions({
    maxNumHands: 2, // 要兩隻手加埋
    modelComplexity: 1,
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.7
});

hands.onResults((results) => {
    const allHands = results.multiHandLandmarks || [];

    if (allHands.length === 0) {
        clearSkeleton();
        detectedResultEl.innerText = "請將兩隻手放入畫面中";
        return;
    }

    resizeOverlay(videoElement.videoWidth || 640, videoElement.videoHeight || 480);
    drawSkeletons(allHands);

    const counted = allHands.map(landmarks => ({
        label: handSideLabel(landmarks),
        fingers: countFingers(landmarks)
    }));

    // 兩隻手的手指數加埋就係答案
    const detectedFingers = counted.reduce((sum, hand) => sum + hand.fingers, 0);

    if (counted.length === 1) {
        detectedResultEl.innerText = `${counted[0].label}：${counted[0].fingers} 隻手指`;
    } else {
        const left = counted.find(h => h.label === '左手');
        const right = counted.find(h => h.label === '右手');
        detectedResultEl.innerText = left && right
            ? `左手 ${left.fingers} + 右手 ${right.fingers} = ${detectedFingers}`
            : `偵測到：${detectedFingers} 隻手指`;
    }

    // 比對邏輯
    if (!isCooldown && score < TOTAL_QUESTIONS) {
        if (detectedFingers === currentTarget) {
            isCooldown = true;
            statusEl.innerText = "🎯 答對了！下一個...";
            statusEl.style.color = "#2ed573";
            playCorrectSound();
            score++;
            starsEl.innerText = '⭐'.repeat(score);

            // 給小朋友反應時間再換題
            setTimeout(() => {
                statusEl.innerText = "兩隻手嘅手指加埋＝目標數字就過關！";
                statusEl.style.color = "#4ba3e3";
                nextQuestion();
                playRoundSound();
                isCooldown = false;
            }, 1000);
        }
    }
});

/* ---------------- 開啟 Webcam 鏡頭 ---------------- */

const camera = new Camera(videoElement, {
    onFrame: async () => {
        await hands.send({ image: videoElement });
    },
    width: 640,
    height: 480
});

camera.start().then(() => {
    resizeOverlay(videoElement.videoWidth || 640, videoElement.videoHeight || 480);
    statusEl.innerText = "兩隻手嘅手指加埋＝目標數字就過關！";
    restartGame();
}).catch(err => {
    statusEl.innerText = "無法開啟 webcam，請確認鏡頭權限！";
    console.error(err);
});
