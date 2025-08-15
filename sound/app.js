// app.js'nin yeni ve tam hali

window.onload = () => {
    // === GENEL DEĞİŞKENLER ===
    let scene, camera, renderer, particles, ctx = null;
    let is3DModeActive = false;
    let mouseX = 0, mouseY = 0;

    // Sinaptik Ağ modu için değişkenler
    let neurons = [];
    let firings = [];

    // HTML elementlerini seç
    const fileInput = document.getElementById('audioFile');
    const audioPlayer = document.getElementById('audioPlayer');
    const canvas = document.getElementById('visualizerCanvas');
    const controls = document.getElementById('controls');
    const modeSelection = document.getElementById('modeSelection');
    const fileSelection = document.getElementById('fileSelection');
    const modeButtons = document.querySelectorAll('.mode-button');

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    let audioContext, analyser, source;
    let currentMode = '';

    // --- DURUM SIFIRLAMA FONKSİYONU ---
    function resetVisualizerState() {
        if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx = null;
        }
        if (is3DModeActive) {
            is3DModeActive = false;
            window.removeEventListener('mousemove', onDocumentMouseMove);
            renderer = null; scene = null; camera = null; particles = null;
        }
        neurons = [];
        firings = [];
    }

    // 1. Adım: Mod Seçimi
    modeButtons.forEach(button => {
        button.addEventListener('click', () => {
            currentMode = button.dataset.mode;
            modeSelection.classList.add('hidden');
            fileSelection.classList.remove('hidden');
        });
    });

    // 2. Adım: Dosya Seçimi
    fileInput.onchange = (event) => {
        resetVisualizerState();
        const file = event.target.files[0];
        if (!file) return;

        controls.style.opacity = '0';
        controls.style.transform = 'scale(0.8)';
        
        audioPlayer.src = URL.createObjectURL(file);
        audioPlayer.play();

        if (!audioContext) setupAudioContext();
        if (currentMode === 'storm') initStormMode3D();
    };

    function setupAudioContext() {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 512; // fftSize'ı artırmak daha detaylı dalgalar verebilir
        source = audioContext.createMediaElementSource(audioPlayer);
        source.connect(analyser);
        analyser.connect(audioContext.destination);
        renderFrame();
    }
    
    // dataArray boyutu fftSize'ın yarısıdır
    const dataArray = new Uint8Array(256);

    // === ANA ANİMASYON DÖNGÜSÜ ===
    function renderFrame() {
        requestAnimationFrame(renderFrame);
        if (!analyser) return;
        analyser.getByteFrequencyData(dataArray);

        const bass = getAverage(dataArray, 0, Math.floor(dataArray.length * 0.1));
        const mids = getAverage(dataArray, Math.floor(dataArray.length * 0.1) + 1, Math.floor(dataArray.length * 0.4));
        const treble = getAverage(dataArray, Math.floor(dataArray.length * 0.4) + 1, dataArray.length - 1);

        switch (currentMode) {
            case 'cosmic': drawCosmicMode(bass, mids, treble); break;
            case 'waves': drawWavesMode(dataArray); break;
            case 'storm': updateStormMode3D(bass, mids, treble); break;
            // DEĞİŞİKLİK: Artık ham dataArray'i de synapse moduna gönderiyoruz
            case 'synapse': drawSynapseMode(bass, mids, treble, dataArray); break;
        }
    }

    // === YENİ YARDIMCI FONKSİYON: DALGALI ÇİZGİ ÇİZME ===
    // Bu fonksiyon, iki nokta arasına Neon Dalgalar'daki gibi bir titreşimli çizgi çizer.
    function drawWavyLine(ctx, startX, startY, endX, endY, frequencyData, amplitude, segments = 16) {
        const dx = endX - startX;
        const dy = endY - startY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);
    
        ctx.save();
        ctx.translate(startX, startY);
        ctx.rotate(angle);
    
        ctx.beginPath();
        ctx.moveTo(0, 0);
    
        // Çizgiyi segmentlere ayır ve her segmenti frekans verisine göre saptır
        for (let i = 1; i <= segments; i++) {
            const progress = i / segments;
            const x = progress * distance;
    
            // Frekans verisinden bir örnek al (düşük-orta frekanslar daha iyi çalışır)
            const dataIndex = Math.floor(scale(progress, 0, 1, 5, 40)); 
            const normalizedValue = (frequencyData[dataIndex] / 128) - 1.0;
            const y = normalizedValue * amplitude;
    
            ctx.lineTo(x, y);
        }
    
        ctx.lineTo(distance, 0); // Son noktaya düzgünce bağla
        ctx.stroke();
        ctx.restore();
    }


    // ==========================================================
    // === "YAŞAYAN NÖRAL AĞ" MODU (DALGALI ÇİZGİLERLE) ===
    // ==========================================================
    function initSynapseMode() {
        // ... (Bu fonksiyon önceki kodla aynı, değişiklik yok)
        neurons = [];
        firings = [];
        const neuronCount = 70; 
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        const minDistanceFromCenter = 120;
        const minDistanceBetweenPeers = 50;
        const maxRadius = Math.min(centerX, centerY) * 0.9;

        neurons.push({ x: centerX, y: centerY, isCenter: true });

        for (let i = 0; i < neuronCount - 1; i++) {
            let newX, newY, isValidPosition = false, attempts = 0;
            while (!isValidPosition && attempts < 50) {
                const angle = Math.random() * Math.PI * 2;
                const radius = minDistanceFromCenter + Math.random() * (maxRadius - minDistanceFromCenter);
                newX = centerX + Math.cos(angle) * radius;
                newY = centerY + Math.sin(angle) * radius;
                isValidPosition = true;
                for (const existingNeuron of neurons) {
                    if(existingNeuron.isCenter) continue;
                    const dx = newX - existingNeuron.x; const dy = newY - existingNeuron.y;
                    if (Math.sqrt(dx * dx + dy * dy) < minDistanceBetweenPeers) {
                        isValidPosition = false; break;
                    }
                }
                attempts++;
            }
            if (isValidPosition) {
                neurons.push({ x: newX, y: newY, originalX: newX, originalY: newY, phase: Math.random() * Math.PI * 2, isCenter: false });
            }
        }
    }

    function drawSynapseMode(bass, mids, treble, frequencyData) {
        if (!ctx) ctx = canvas.getContext('2d');
        if (neurons.length === 0) initSynapseMode();

        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        ctx.fillStyle = 'rgba(5, 0, 20, 0.15)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const hue = scale(mids, 0, 200, 260, 330);

        // Nöron konumlarını güncelleme (Öncekiyle aynı)
        const bassPushForce = scale(bass, 120, 255, 0, 80);
        const driftAmount = 15;
        neurons.forEach(neuron => {
            if (neuron.isCenter) return;
            const vectorX = neuron.originalX - centerX; const vectorY = neuron.originalY - centerY;
            const len = Math.sqrt(vectorX * vectorX + vectorY * vectorY) || 1;
            const normalizedX = vectorX / len; const normalizedY = vectorY / len;
            const driftX = Math.cos(Date.now() / 2000 + neuron.phase) * driftAmount;
            const driftY = Math.sin(Date.now() / 2000 + neuron.phase) * driftAmount;
            const targetX = neuron.originalX + driftX + normalizedX * bassPushForce;
            const targetY = neuron.originalY + driftY + normalizedY * bassPushForce;
            neuron.x += (targetX - neuron.x) * 0.08;
            neuron.y += (targetY - neuron.y) * 0.08;
        });

        // --- YENİ BAĞLANTI ÇİZİM MANTIĞI ---
        
        // 1. Merkezden çıkan ana bağlantılar
        const mainWaveAmplitude = scale(bass, 60, 255, 2, 90); // Bas ile titreşim genliği
        ctx.strokeStyle = `hsla(${hue - 40}, 100%, 70%, 0.15)`;
        ctx.lineWidth = 1.5;
        neurons.forEach(neuron => {
            if (!neuron.isCenter) {
                drawWavyLine(ctx, neurons[0].x, neurons[0].y, neuron.x, neuron.y, frequencyData, mainWaveAmplitude);
            }
        });

        // 2. Nöronlar arası yakınsal bağlantılar
        const connectionThreshold = 180;
        const peerWaveAmplitude = scale(mids, 80, 220, 2, 50); // Orta seslerle titreşim genliği
        ctx.strokeStyle = `hsla(${hue - 20}, 100%, 80%, 0.05)`; // Daha soluk
        ctx.lineWidth = 1;
        for (let i = 1; i < neurons.length; i++) {
            for (let j = i + 1; j < neurons.length; j++) {
                const n1 = neurons[i]; const n2 = neurons[j];
                const dx = n1.x - n2.x; const dy = n1.y - n2.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance < connectionThreshold) {
                    drawWavyLine(ctx, n1.x, n1.y, n2.x, n2.y, frequencyData, peerWaveAmplitude, 8); // Daha az segment, daha basit dalga
                }
            }
        }
        
        // Ateşlemeler (Bunlar düz çizgi kalmalı, ani ve keskin bir kontrast yaratır)
        firings = firings.filter(fire => {
            fire.life -= 0.05;
            if (fire.life <= 0) return false;
            const from = neurons[fire.from]; const to = neurons[fire.to];
            ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y);
            ctx.lineWidth = fire.life * 2.5; ctx.strokeStyle = `rgba(255, 255, 255, ${fire.life * 0.9})`;
            ctx.stroke();
            return true;
        });

        // Nöronları çizme (Öncekiyle aynı)
        neurons.forEach(neuron => {
            const bassPulse = scale(bass, 0, 255, 0, neuron.isCenter ? 25 : 10);
            const radius = (neuron.isCenter ? 15 : 4) + bassPulse;
            ctx.beginPath(); ctx.arc(neuron.x, neuron.y, radius, 0, Math.PI * 2);
            const grad = ctx.createRadialGradient(neuron.x, neuron.y, 0, neuron.x, neuron.y, radius);
            grad.addColorStop(0, `hsla(${hue}, 100%, 85%, 1)`); grad.addColorStop(1, `hsla(${hue}, 100%, 50%, 0)`);
            ctx.fillStyle = grad; ctx.fill();
        });

        // Yeni ateşleme yaratma (Öncekiyle aynı)
        const fireChance = scale(treble, 120, 255, 0, 0.4);
        if (Math.random() < fireChance && neurons.length > 1) {
            const numToFire = Math.ceil(scale(treble, 120, 255, 0, 3));
            for (let i = 0; i < numToFire; i++) {
                let fromIndex, toIndex;
                do {
                    fromIndex = Math.floor(Math.random() * neurons.length);
                    toIndex = Math.floor(Math.random() * neurons.length);
                } while(fromIndex === toIndex);
                firings.push({ from: fromIndex, to: toIndex, life: 1.0 });
            }
        }
    }
    
    // === DİĞER MODLAR VE YARDIMCI FONKSİYONLAR (DEĞİŞİKLİK YOK) ===
    function drawCosmicMode(bass, mids, treble) {
        if (!ctx) ctx = canvas.getContext('2d');
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        const overallLoudness = (bass + mids + treble) / 3;
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

        const baseRadius = Math.pow(scale(overallLoudness, 0, 200, 0, 1), 2) * (canvas.height / 3);
        const bassKick = scale(bass, 0, 255, 0, 100);
        const mainRadius = baseRadius + bassKick;

        const waveCount = 5;
        for (let i = 1; i <= waveCount; i++) {
            const waveRadius = mainRadius + (i * 15) + Math.sin(Date.now() / 400 + i * 0.5) * 10;
            const opacity = 0.8 - (i / waveCount) * 0.7;
            const lineWidth = Math.max(1, 5 - i);
            if (waveRadius <= 0) continue;
            ctx.strokeStyle = `hsla(${scale(mids, 0, 255, 180, 300)}, 100%, 70%, ${opacity})`;
            ctx.lineWidth = lineWidth;
            ctx.beginPath();
            ctx.arc(canvas.width / 2, canvas.height / 2, waveRadius, 0, 2 * Math.PI);
            ctx.stroke();
        }
    }

    function drawWavesMode(dataArray) {
        if (!ctx) ctx = canvas.getContext('2d');
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.lineWidth = 4;
        ctx.strokeStyle = `hsl(${180 + (Date.now() / 50) % 180}, 100%, 60%)`;
        ctx.shadowColor = ctx.strokeStyle;
        ctx.shadowBlur = 15;
        
        ctx.beginPath();
        const sliceWidth = canvas.width * 1.0 / dataArray.length;
        let x = 0;
        for (let i = 0; i < dataArray.length; i++) {
            const v = dataArray[i] / 128.0;
            const y = v * canvas.height / 2;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
            x += sliceWidth;
        }
        ctx.lineTo(canvas.width, canvas.height / 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
    }

    function initStormMode3D() {
        is3DModeActive = true;
        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 3000);
        camera.position.z = 1000;
        const particleCount = 50000;
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        const sizes = new Float32Array(particleCount);
        const color = new THREE.Color();
        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 2000;
            positions[i * 3 + 1] = (Math.random() - 0.5) * 2000;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 2000;
            color.setHSL(Math.random(), 1.0, 0.5);
            colors[i * 3] = color.r; colors[i * 3 + 1] = color.g; colors[i * 3 + 2] = color.b;
            sizes[i] = 20;
        }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        const material = new THREE.PointsMaterial({
            size: 15, vertexColors: true, blending: THREE.AdditiveBlending,
            transparent: true, sizeAttenuation: true, depthTest: false
        });
        particles = new THREE.Points(geometry, material);
        scene.add(particles);
        renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(window.innerWidth, window.innerHeight);
        window.addEventListener('mousemove', onDocumentMouseMove, false);
    }

    function updateStormMode3D(bass, mids, treble) {
        if (!renderer || !particles) return;
        camera.position.x += (mouseX - camera.position.x) * 0.01;
        camera.position.y += (-mouseY - camera.position.y) * 0.01;
        camera.lookAt(scene.position);
        const bassPulse = scale(bass, 0, 255, 1, 1.15);
        particles.scale.set(bassPulse, bassPulse, bassPulse);
        const sizes = particles.geometry.attributes.size.array;
        const colors = particles.geometry.attributes.color.array;
        const baseHue = scale(mids, 0, 255, 0.5, 0.85);
        for (let i = 0; i < sizes.length; i++) {
            const trebleFlash = scale(treble, 120, 255, 1, 15);
            sizes[i] = Math.max(5, trebleFlash * Math.random());
            const color = new THREE.Color();
            color.setHSL(baseHue + Math.random() * 0.1, 1.0, 0.6);
            colors[i * 3] = color.r; colors[i * 3 + 1] = color.g; colors[i * 3 + 2] = color.b;
        }
        particles.geometry.attributes.size.needsUpdate = true;
        particles.geometry.attributes.color.needsUpdate = true;
        renderer.render(scene, camera);
    }

    function onDocumentMouseMove(event) {
        mouseX = event.clientX - window.innerWidth / 2;
        mouseY = event.clientY - window.innerHeight / 2;
    }

    function getAverage(array, start, end) {
        let sum = 0;
        const count = end - start + 1;
        for (let i = start; i <= end; i++) sum += array[i];
        return count > 0 ? sum / count : 0;
    }

    function scale(value, inMin, inMax, outMin, outMax) {
        if (value < inMin) return outMin;
        if (value > inMax) return outMax;
        return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
    }

    audioPlayer.onended = () => {
        resetVisualizerState();
        controls.style.opacity = '1';
        controls.style.transform = 'scale(1)';
        modeSelection.classList.remove('hidden');
        fileSelection.classList.add('hidden');
    };

    window.onresize = () => {
        const newWidth = window.innerWidth;
        const newHeight = window.innerHeight;
        canvas.width = newWidth;
        canvas.height = newHeight;
        if (is3DModeActive && renderer) {
            camera.aspect = newWidth / newHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(newWidth, newHeight);
        }
    };

    function drawCosmicMode(bass, mids, treble) {
        if (!ctx) ctx = canvas.getContext('2d');
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const overallLoudness = (bass + mids + treble) / 3;
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
        const baseRadius = Math.pow(scale(overallLoudness, 0, 200, 0, 1), 2) * (canvas.height / 3);
        const bassKick = scale(bass, 0, 255, 0, 100);
        const mainRadius = baseRadius + bassKick;
        const waveCount = 5;
        for (let i = 1; i <= waveCount; i++) {
            const waveRadius = mainRadius + (i * 15) + Math.sin(Date.now() / 400 + i * 0.5) * 10;
            const opacity = 0.8 - (i / waveCount) * 0.7;
            const lineWidth = Math.max(1, 5 - i);
            if (waveRadius <= 0) continue;
            ctx.strokeStyle = `hsla(${scale(mids, 0, 255, 180, 300)}, 100%, 70%, ${opacity})`;
            ctx.lineWidth = lineWidth;
            ctx.beginPath();
            ctx.arc(canvas.width / 2, canvas.height / 2, waveRadius, 0, 2 * Math.PI);
            ctx.stroke();
        }
    }
    function drawWavesMode(dataArray) {
        if (!ctx) ctx = canvas.getContext('2d');
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.lineWidth = 4;
        ctx.strokeStyle = `hsl(${180 + (Date.now() / 50) % 180}, 100%, 60%)`;
        ctx.shadowColor = ctx.strokeStyle;
        ctx.shadowBlur = 15;
        ctx.beginPath();
        const sliceWidth = canvas.width * 1.0 / dataArray.length;
        let x = 0;
        for (let i = 0; i < dataArray.length; i++) {
            const v = dataArray[i] / 128.0;
            const y = v * canvas.height / 2;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
            x += sliceWidth;
        }
        ctx.lineTo(canvas.width, canvas.height / 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
    }
    function initStormMode3D() {
        is3DModeActive = true;
        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 3000);
        camera.position.z = 1000;
        const particleCount = 50000;
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        const sizes = new Float32Array(particleCount);
        const color = new THREE.Color();
        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 2000;
            positions[i * 3 + 1] = (Math.random() - 0.5) * 2000;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 2000;
            color.setHSL(Math.random(), 1.0, 0.5);
            colors[i * 3] = color.r; colors[i * 3 + 1] = color.g; colors[i * 3 + 2] = color.b;
            sizes[i] = 20;
        }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        const material = new THREE.PointsMaterial({ size: 15, vertexColors: true, blending: THREE.AdditiveBlending, transparent: true, sizeAttenuation: true, depthTest: false });
        particles = new THREE.Points(geometry, material);
        scene.add(particles);
        renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(window.innerWidth, window.innerHeight);
        window.addEventListener('mousemove', onDocumentMouseMove, false);
    }
    function updateStormMode3D(bass, mids, treble) {
        if (!renderer || !particles) return;
        camera.position.x += (mouseX - camera.position.x) * 0.01;
        camera.position.y += (-mouseY - camera.position.y) * 0.01;
        camera.lookAt(scene.position);
        const bassPulse = scale(bass, 0, 255, 1, 1.15);
        particles.scale.set(bassPulse, bassPulse, bassPulse);
        const sizes = particles.geometry.attributes.size.array;
        const colors = particles.geometry.attributes.color.array;
        const baseHue = scale(mids, 0, 255, 0.5, 0.85);
        for (let i = 0; i < sizes.length; i++) {
            const trebleFlash = scale(treble, 120, 255, 1, 15);
            sizes[i] = Math.max(5, trebleFlash * Math.random());
            const color = new THREE.Color();
            color.setHSL(baseHue + Math.random() * 0.1, 1.0, 0.6);
            colors[i * 3] = color.r; colors[i * 3 + 1] = color.g; colors[i * 3 + 2] = color.b;
        }
        particles.geometry.attributes.size.needsUpdate = true;
        particles.geometry.attributes.color.needsUpdate = true;
        renderer.render(scene, camera);
    }
    function onDocumentMouseMove(event) { mouseX = event.clientX - window.innerWidth / 2; mouseY = event.clientY - window.innerHeight / 2; }
    function getAverage(array, start, end) { let sum = 0; const count = end - start + 1; for (let i = start; i <= end; i++) sum += array[i]; return count > 0 ? sum / count : 0; }
    function scale(value, inMin, inMax, outMin, outMax) { if (value < inMin) return outMin; if (value > inMax) return outMax; return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin; }
    audioPlayer.onended = () => { resetVisualizerState(); controls.style.opacity = '1'; controls.style.transform = 'scale(1)'; modeSelection.classList.remove('hidden'); fileSelection.classList.add('hidden'); };
    window.onresize = () => {
        const newWidth = window.innerWidth;
        const newHeight = window.innerHeight;
        canvas.width = newWidth; canvas.height = newHeight;
        if (is3DModeActive && renderer) {
            camera.aspect = newWidth / newHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(newWidth, newHeight);
        }
        if(currentMode === 'synapse') {
            initSynapseMode();
        }
    };
};