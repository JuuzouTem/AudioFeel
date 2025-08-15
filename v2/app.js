window.onload = () => {
    // HTML elementlerini seç (Değişiklik yok)
    const fileInput = document.getElementById('audioFile');
    const audioPlayer = document.getElementById('audioPlayer');
    const canvas = document.getElementById('visualizerCanvas');
    const ctx = canvas.getContext('2d');
    const controls = document.getElementById('controls');
    const modeSelection = document.getElementById('modeSelection');
    const fileSelection = document.getElementById('fileSelection');
    const modeButtons = document.querySelectorAll('.mode-button');

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    let audioContext, analyser, source;
    let currentMode = '';

    // Mod seçimi ve dosya seçimi mantığı (Değişiklik yok)
    modeButtons.forEach(button => {
        button.addEventListener('click', () => {
            currentMode = button.dataset.mode;
            modeSelection.classList.add('hidden');
            fileSelection.classList.remove('hidden');
        });
    });

    fileInput.onchange = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        controls.style.opacity = '0';
        controls.style.transform = 'scale(0.8)';
        
        audioPlayer.src = URL.createObjectURL(file);
        audioPlayer.play();

        if (!audioContext) {
            setupAudioContext();
        }
    };

    function setupAudioContext() {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 512;
        source = audioContext.createMediaElementSource(audioPlayer);
        source.connect(analyser);
        analyser.connect(audioContext.destination);
        renderFrame();
    }

    const bufferLength = analyser ? analyser.frequencyBinCount : 256;
    const dataArray = new Uint8Array(bufferLength);

    function renderFrame() {
        requestAnimationFrame(renderFrame);
        analyser.getByteFrequencyData(dataArray);

        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const bass = getAverage(dataArray, 0, Math.floor(bufferLength * 0.1));
        const mids = getAverage(dataArray, Math.floor(bufferLength * 0.1) + 1, Math.floor(bufferLength * 0.4));
        const treble = getAverage(dataArray, Math.floor(bufferLength * 0.4) + 1, bufferLength - 1);
        const overallLoudness = (bass + mids + treble) / 3;

        switch (currentMode) {
            case 'cosmic':
                drawCosmicMode(bass, mids, treble, overallLoudness);
                break;
            case 'waves':
                drawWavesMode(dataArray);
                break;
            case 'storm':
                drawStormMode(bass, mids, treble, overallLoudness);
                break;
        }
    }

    // --- GÜNCELLENMİŞ KOZMİK NABIZ MODU ---
    function drawCosmicMode(bass, mids, treble, overallLoudness) {
        // Arka plan nabzı ve parçacıklar aynı kalıyor
        const bassPulse = scale(bass, 0, 255, 0.05, 0.4);
        ctx.fillStyle = `rgba(80, 0, 150, ${bassPulse})`;
        ctx.beginPath();
        ctx.arc(canvas.width / 2, canvas.height / 2, Math.min(canvas.width, canvas.height), 0, 2 * Math.PI);
        ctx.fill();

        const sparkCount = Math.round(scale(treble, 0, 255, 0, 50));
        for (let i = 0; i < sparkCount; i++) {
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            const size = Math.random() * 2 + 1;
            const brightness = scale(treble, 100, 255, 50, 100);
            ctx.fillStyle = `hsl(${50 + Math.random() * 20}, 100%, ${brightness}%)`;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, 2 * Math.PI);
            ctx.fill();
        }

        // --- YENİ KÜRE VE MOIRÉ EFEKTİ MANTIĞI ---
        
        // 1. Sınırsız büyüme ve sıfıra inebilme
        // Math.pow kullanarak daha dramatik bir büyüme sağlıyoruz. 
        // overallLoudness 0 ise, baseRadius da 0 olur.
        const baseRadius = Math.pow(scale(overallLoudness, 0, 200, 0, 1), 2) * (canvas.height / 3);
        const bassKick = scale(bass, 0, 255, 0, 100);
        const mainRadius = baseRadius + bassKick;

        // 2. Moiré / Girişim efekti için çoklu dalgalar çizimi
        const waveCount = 5; // Kaç tane dalga çizeceğimiz
        for (let i = 1; i <= waveCount; i++) {
            // Her dalga, ana yarıçapa göre biraz daha dışarıda ve zamanla salınım yapıyor
            const waveRadius = mainRadius + (i * 15) + Math.sin(Date.now() / 400 + i * 0.5) * 10;
            
            // Dıştaki dalgalar daha sönük ve ince olsun
            const opacity = 0.8 - (i / waveCount) * 0.7;
            const lineWidth = Math.max(1, 5 - i);

            // Müzik yoksa dalgaları da gösterme
            if (waveRadius <= 0) continue;

            ctx.strokeStyle = `hsla(${scale(mids, 0, 255, 180, 300)}, 100%, 70%, ${opacity})`;
            ctx.lineWidth = lineWidth;
            ctx.beginPath();
            ctx.arc(canvas.width / 2, canvas.height / 2, waveRadius, 0, 2 * Math.PI);
            ctx.stroke();
        }
    }


    // Diğer çizim modları (Değişiklik yok)
    function drawWavesMode(dataArray) {
        // ... (Kod aynı)
        ctx.lineWidth = 4;
        ctx.strokeStyle = `hsl(${180 + (Date.now() / 50) % 180}, 100%, 60%)`;
        ctx.shadowColor = ctx.strokeStyle;
        ctx.shadowBlur = 15;
        
        ctx.beginPath();
        const sliceWidth = canvas.width * 1.0 / bufferLength;
        let x = 0;
        for (let i = 0; i < bufferLength; i++) {
            const v = dataArray[i] / 128.0;
            const y = v * canvas.height / 2;
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
            x += sliceWidth;
        }
        ctx.lineTo(canvas.width, canvas.height / 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
    }

    function drawStormMode(bass, mids, treble, overallLoudness) {
        // ... (Kod aynı)
        const particleCount = Math.round(scale(overallLoudness, 0, 255, 10, 200));
        for (let i = 0; i < particleCount; i++) {
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            const size = scale(bass, 0, 255, 1, 10) * Math.random();
            const colorValue = scale(treble, 0, 255, 200, 360);
            
            ctx.fillStyle = `hsl(${colorValue}, 90%, 65%)`;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, 2 * Math.PI);
            ctx.fill();
        }
    }


    // Yardımcı fonksiyonlar ve olay dinleyicileri (Değişiklik yok)
    function getAverage(array, start, end) {
        let sum = 0;
        const count = end - start + 1;
        for (let i = start; i <= end; i++) sum += array[i];
        return count > 0 ? sum / count : 0;
    }

    function scale(value, inMin, inMax, outMin, outMax) {
        return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
    }
    
    audioPlayer.onended = () => {
        controls.style.opacity = '1';
        controls.style.transform = 'scale(1)';
        modeSelection.classList.remove('hidden');
        fileSelection.classList.add('hidden');
    };

    window.onresize = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    };
};