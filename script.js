const videoElement = document.getElementById('webcam');
const targetNumEl = document.getElementById('target-number');
const progressEl = document.getElementById('progress');
const statusEl = document.getElementById('game-status');
const detectedResultEl = document.getElementById('detected-result');
const victoryModal = document.getElementById('victory-modal');

let currentTarget = 0;
let score = 0;
const TOTAL_QUESTIONS = 10;
let isCooldown = false; // 避免比對成功後重複觸發

// 生成 0 ~ 5 的隨機個位數（適合作為單手手勢）
function getRandomNumber() {
    return Math.floor(Math.random() * 6);
}

function nextQuestion() {
    if (score >= TOTAL_QUESTIONS) {
        victoryModal.classList.remove('hidden');
        statusEl.innerText = "遊戲完成！";
        return;
    }
    currentTarget = getRandomNumber();
    targetNumEl.innerText = currentTarget;
    progressEl.innerText = `${score} / ${TOTAL_QUESTIONS}`;
}

function restartGame() {
    score = 0;
    victoryModal.classList.add('hidden');
    statusEl.innerText = "請根據提示比出手勢！";
    nextQuestion();
}

// 手指張開檢測邏輯 (單手 0-5)
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

// MediaPipe Hands 初始化
const hands = new Hands({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
});

hands.setOptions({
    maxNumHands: 1, // 任意一隻手即可
    modelComplexity: 1,
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.7
});

hands.onResults((results) => {
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const landmarks = results.multiHandLandmarks[0];
        const detectedFingers = countFingers(landmarks);

        detectedResultEl.innerText = `偵測到：${detectedFingers}`;

        // 比對邏輯
        if (!isCooldown && score < TOTAL_QUESTIONS) {
            if (detectedFingers === currentTarget) {
                isCooldown = true;
                statusEl.innerText = "🎯 答對了！下一個...";
                statusEl.style.color = "#2ed573";
                score++;

                // 閃爍效果或延遲換題，給小朋友反應時間
                setTimeout(() => {
                    statusEl.innerText = "請根據提示比出手勢！";
                    statusEl.style.color = "#4ba3e3";
                    nextQuestion();
                    isCooldown = false;
                }, 1000);
            }
        }
    } else {
        detectedResultEl.innerText = "請將手放入畫面中";
    }
});

// 開啟 Webcam 鏡頭
const camera = new Camera(videoElement, {
    onFrame: async () => {
        await hands.send({ image: videoElement });
    },
    width: 640,
    height: 480
});

camera.start().then(() => {
    statusEl.innerText = "請根據提示比出手勢！";
    restartGame();
}).catch(err => {
    statusEl.innerText = "無法開啟 webcam，請確認鏡頭權限！";
    console.error(err);
});
