/* ============================================================
   TerraSync — Smart IoT Precision Farming Dashboard
   JavaScript  |  2026
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
    // ---------- SIDEBAR ----------
    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.getElementById('sidebarToggle');
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');

    sidebarToggle?.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
    });

    mobileMenuBtn?.addEventListener('click', () => {
        sidebar.classList.toggle('mobile-open');
        toggleOverlay(true);
    });

    // Overlay for mobile
    let overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    document.body.appendChild(overlay);
    overlay.addEventListener('click', () => {
        sidebar.classList.remove('mobile-open');
        overlay.classList.remove('show');
    });

    function toggleOverlay(show) {
        if (show && sidebar.classList.contains('mobile-open')) {
            overlay.classList.add('show');
        } else {
            overlay.classList.remove('show');
        }
    }

    // ---------- THEME TOGGLE ----------
    const themeToggle = document.getElementById('themeToggle');
    const html = document.documentElement;
    const savedTheme = localStorage.getItem('terrasync-theme') || 'light';
    html.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);

    themeToggle?.addEventListener('click', () => {
        const current = html.getAttribute('data-theme');
        const next = current === 'light' ? 'dark' : 'light';
        html.setAttribute('data-theme', next);
        localStorage.setItem('terrasync-theme', next);
        updateThemeIcon(next);
        updateChartTheme();
    });

    function updateThemeIcon(theme) {
        const icon = themeToggle?.querySelector('i');
        if (icon) {
            icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        }
    }

    // ---------- NOTIFICATIONS ----------
    const notifBtn = document.getElementById('notifBtn');
    const notifDropdown = document.getElementById('notifDropdown');

    notifBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        notifDropdown.classList.toggle('show');
    });

    document.addEventListener('click', (e) => {
        if (!notifDropdown?.contains(e.target)) {
            notifDropdown?.classList.remove('show');
        }
    });

    // ---------- HERO PARTICLES ----------
    const particlesContainer = document.getElementById('heroParticles');
    if (particlesContainer) {
        for (let i = 0; i < 20; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            const size = Math.random() * 6 + 3;
            particle.style.width = size + 'px';
            particle.style.height = size + 'px';
            particle.style.left = Math.random() * 100 + '%';
            particle.style.animationDuration = Math.random() * 6 + 4 + 's';
            particle.style.animationDelay = Math.random() * 5 + 's';
            particlesContainer.appendChild(particle);
        }
    }

    // ---------- API CONFIGURATION ----------
    const API_BASE = window.location.origin + '/api';
    let apiAvailable = false;

    // Check if backend is running
    async function checkApi() {
        try {
            const res = await fetch(API_BASE + '/health', { signal: AbortSignal.timeout(2000) });
            const data = await res.json();
            apiAvailable = data.status === 'ok';
        } catch {
            apiAvailable = false;
        }
        console.log(apiAvailable ? '✅ API connected — using MySQL data' : '⚠️ API unavailable — using simulated data');
        return apiAvailable;
    }

    // ---------- SENSOR DATA (API or fallback) ----------
    const sensorData = {
        moisture: { value: 0, target: 52, min: 30, max: 80, unit: '%' },
        temperature: { value: 0, target: 27.5, min: 18, max: 42, unit: '°C' },
        humidity: { value: 0, target: 62, min: 35, max: 85, unit: '%' },
        waterflow: { value: 0, target: 0, min: 0, max: 30, unit: 'L/min' }
    };
    let prevSensorReading = null;

    // Fetch latest sensor values from MySQL
    async function fetchLatestSensors() {
        try {
            const res = await fetch(API_BASE + '/sensors/latest');
            const json = await res.json();
            if (json.success && json.data.length > 0) {
                const d = json.data[0]; // Primary field
                updateSensorUI(d.moisture, d.temperature, d.humidity, d.water_flow);
                const reading = {
                    moisture:    parseFloat(d.moisture),
                    temperature: parseFloat(d.temperature),
                    humidity:    parseFloat(d.humidity)
                };
                if (prevSensorReading) updateTrendArrows(reading, prevSensorReading);
                prevSensorReading = reading;
                updateSensorCardStatus(d.moisture, d.temperature, d.humidity);
                checkAutoIrrigation(reading.moisture);
            }
        } catch (err) {
            console.warn('Sensor fetch failed:', err.message);
        }
    }

    // Update sensor card UI with real or simulated values
    function updateSensorUI(moisture, temperature, humidity, waterFlow) {
        const moistureEl = document.getElementById('moistureValue');
        const tempEl     = document.getElementById('tempValue');
        const humidityEl = document.getElementById('humidityValue');
        const flowEl     = document.getElementById('flowValue');

        if (moistureEl)  moistureEl.textContent  = parseFloat(moisture).toFixed(0);
        if (tempEl)      tempEl.textContent      = parseFloat(temperature).toFixed(1);
        if (humidityEl)  humidityEl.textContent  = parseFloat(humidity).toFixed(0);
        if (flowEl)      flowEl.textContent      = parseFloat(waterFlow).toFixed(1);

        animateGauge('moistureGauge', moisture);
        animateGauge('tempGauge', (temperature / 50) * 100);
        animateGauge('humidityGauge', humidity);
        animateGauge('flowGauge', (waterFlow / 30) * 100);

        document.querySelectorAll('.last-update').forEach(el => {
            el.textContent = 'Updated just now';
        });
    }

    function animateSensorValues() {
        animateValue('moistureValue', sensorData.moisture.target, 0);
        animateGauge('moistureGauge', sensorData.moisture.target, 100);

        animateValue('tempValue', sensorData.temperature.target, 1);
        animateGauge('tempGauge', (sensorData.temperature.target / 50) * 100, 100);

        animateValue('humidityValue', sensorData.humidity.target, 0);
        animateGauge('humidityGauge', sensorData.humidity.target, 100);

        animateValue('flowValue', sensorData.waterflow.target, 1);
        animateGauge('flowGauge', (sensorData.waterflow.target / 30) * 100, 100);
    }

    function animateValue(elementId, target, decimals = 0) {
        const el = document.getElementById(elementId);
        if (!el) return;

        const duration = 1500;
        const start = 0;
        const startTime = performance.now();

        function update(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
            const current = start + (target - start) * eased;
            el.textContent = current.toFixed(decimals);

            if (progress < 1) {
                requestAnimationFrame(update);
            }
        }

        requestAnimationFrame(update);
    }

    function animateGauge(gaugeId, targetPercent) {
        const gauge = document.getElementById(gaugeId);
        if (gauge) {
            setTimeout(() => {
                gauge.style.width = Math.min(targetPercent, 100) + '%';
            }, 200);
        }
    }

    // Animation start is now handled in the initialization block below

    // ---------- SENSOR TREND CHART ----------
    const trendCtx = document.getElementById('trendChart')?.getContext('2d');
    let trendChart;

    // Default fallback data
    let chartLabels   = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0') + ':00');
    let moistureData  = generateFallbackData(52, 4, 24);
    let tempData      = generateFallbackData(28, 3, 24);
    let humidityData  = generateFallbackData(62, 5, 24);

    function generateFallbackData(base, variance, count) {
        const data = [];
        let val = base;
        for (let i = 0; i < count; i++) {
            val += (Math.random() - 0.5) * variance;
            val = Math.max(base - variance * 2, Math.min(base + variance * 2, val));
            data.push(parseFloat(val.toFixed(1)));
        }
        return data;
    }

    // Fetch chart data from MySQL
    async function fetchChartData(range = '24h') {
        try {
            const res = await fetch(`${API_BASE}/sensors/history?field_id=1&range=${range}`);
            const json = await res.json();
            if (json.success && json.data.length > 0) {
                chartLabels  = json.data.map(r => r.label);
                moistureData = json.data.map(r => r.moisture);
                tempData     = json.data.map(r => r.temperature);
                humidityData = json.data.map(r => r.humidity);

                if (trendChart) {
                    trendChart.data.labels = chartLabels;
                    trendChart.data.datasets[0].data = moistureData;
                    trendChart.data.datasets[1].data = tempData;
                    trendChart.data.datasets[2].data = humidityData;
                    trendChart.update();
                }
            }
        } catch (err) {
            console.warn('Chart data fetch failed:', err.message);
        }
    }

    if (trendCtx) {
        function getChartColors() {
            const isDark = html.getAttribute('data-theme') === 'dark';
            return {
                grid: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                text: isDark ? '#6a9a6a' : '#7a9a7a'
            };
        }

        function createTrendChart() {
            const colors = getChartColors();

            trendChart = new Chart(trendCtx, {
                type: 'line',
                data: {
                    labels: chartLabels,
                    datasets: [
                        {
                            label: 'Moisture (%)',
                            data: moistureData,
                            borderColor: '#3b82f6',
                            backgroundColor: 'rgba(59, 130, 246, 0.08)',
                            fill: true,
                            tension: 0.4,
                            borderWidth: 2.5,
                            pointRadius: 0,
                            pointHoverRadius: 6,
                            pointHoverBackgroundColor: '#3b82f6'
                        },
                        {
                            label: 'Temperature (°C)',
                            data: tempData,
                            borderColor: '#ef4444',
                            backgroundColor: 'rgba(239, 68, 68, 0.05)',
                            fill: true,
                            tension: 0.4,
                            borderWidth: 2.5,
                            pointRadius: 0,
                            pointHoverRadius: 6,
                            pointHoverBackgroundColor: '#ef4444'
                        },
                        {
                            label: 'Humidity (%)',
                            data: humidityData,
                            borderColor: '#06b6d4',
                            backgroundColor: 'rgba(6, 182, 212, 0.05)',
                            fill: true,
                            tension: 0.4,
                            borderWidth: 2.5,
                            pointRadius: 0,
                            pointHoverRadius: 6,
                            pointHoverBackgroundColor: '#06b6d4'
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: {
                        mode: 'index',
                        intersect: false
                    },
                    plugins: {
                        legend: {
                            position: 'top',
                            labels: {
                                usePointStyle: true,
                                pointStyle: 'circle',
                                padding: 20,
                                font: { size: 12, family: 'Inter' },
                                color: colors.text
                            }
                        },
                        tooltip: {
                            backgroundColor: 'rgba(15, 31, 15, 0.9)',
                            titleFont: { size: 13, family: 'Inter' },
                            bodyFont: { size: 12, family: 'Inter' },
                            padding: 12,
                            cornerRadius: 10,
                            displayColors: true,
                            boxPadding: 4
                        }
                    },
                    scales: {
                        x: {
                            grid: { color: colors.grid },
                            ticks: {
                                color: colors.text,
                                font: { size: 11 },
                                maxTicksLimit: 12
                            }
                        },
                        y: {
                            grid: { color: colors.grid },
                            ticks: {
                                color: colors.text,
                                font: { size: 11 }
                            }
                        }
                    }
                }
            });
        }

        createTrendChart();
    }

    function updateChartTheme() {
        if (trendChart) {
            const colors = getChartColors();
            trendChart.options.scales.x.grid.color = colors.grid;
            trendChart.options.scales.x.ticks.color = colors.text;
            trendChart.options.scales.y.grid.color = colors.grid;
            trendChart.options.scales.y.ticks.color = colors.text;
            trendChart.options.plugins.legend.labels.color = colors.text;
            trendChart.update('none');
        }
        if (healthChart) {
            healthChart.update('none');
        }
    }

    // Chart range chips — fetch from API when available
    document.querySelectorAll('.chip[data-range]').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('.chip[data-range]').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            const range = chip.dataset.range;
            if (apiAvailable) {
                fetchChartData(range);
            }
        });
    });

    // ---------- HEALTH DOUGHNUT CHART ----------
    const healthCtx = document.getElementById('healthChart')?.getContext('2d');
    let healthChart;

    // Default health data (overwritten by API when available)
    let fieldHealthData = [
        { name: "Yuri's Farm (Carrots)", score: 85, color: '#22c55e' },
        { name: "Anthony's Farm (Corn)", score: 90, color: '#16a34a' },
        { name: "Field A (Balinghoy)", score: 65, color: '#f59e0b' },
        { name: "Field B (Kamote)", score: 70, color: '#f97316' }
    ];

    // Fetch fields from MySQL and compute health scores
    async function fetchFieldHealth() {
        try {
            const res = await fetch(API_BASE + '/fields');
            const json = await res.json();
            if (json.success && json.data.length > 0) {
                const healthColors = ['#22c55e', '#16a34a', '#f59e0b', '#f97316', '#ef4444', '#8b5cf6'];
                fieldHealthData = json.data.map((f, i) => {
                    // Compute a simple health score based on sensor values
                    let score = 80;
                    if (f.moisture !== null) {
                        if (f.moisture >= 40 && f.moisture <= 60) score += 5;
                        else if (f.moisture < 30 || f.moisture > 75) score -= 15;
                    }
                    if (f.temperature !== null) {
                        if (f.temperature >= 20 && f.temperature <= 30) score += 5;
                        else if (f.temperature > 35) score -= 20;
                    }
                    score = Math.max(0, Math.min(100, score));
                    return {
                        name: `${f.name} (${f.crop || 'N/A'})`,
                        score,
                        color: healthColors[i % healthColors.length]
                    };
                });
                rebuildHealthChart();

                // Also update the field table
                updateFieldTable(json.data);
            }
        } catch (err) {
            console.warn('Field health fetch failed:', err.message);
        }
    }

    function updateFieldTable(fields) {
        const tbody = document.querySelector('#fieldTable tbody');
        if (!tbody || fields.length === 0) return;
        tbody.innerHTML = fields.map(f => {
            const moisture = f.moisture !== null ? parseFloat(f.moisture).toFixed(0) : '—';
            const temp = f.temperature !== null ? parseFloat(f.temperature).toFixed(1) + '°C' : '—';
            const hum = f.humidity !== null ? parseFloat(f.humidity).toFixed(0) + '%' : '—';
            const statusClass = f.status === 'healthy' ? 'healthy' : f.status === 'warning' ? 'warning' : 'critical';
            const statusLabel = f.status === 'healthy' ? 'Healthy' : f.status === 'warning' ? 'High Temp' : 'Critical';
            const mVal = f.moisture !== null ? parseFloat(f.moisture) : 0;
            const barColor = mVal > 65 ? 'bg-orange' : 'bg-green';
            return `<tr>
                <td><strong>${f.name}</strong></td>
                <td><i class="fas ${f.crop_icon || 'fa-leaf'}"></i> ${f.crop || 'N/A'}</td>
                <td><span class="status-badge ${statusClass}">${statusLabel}</span></td>
                <td>
                    <div class="mini-bar"><div class="mini-fill fill-${moisture} ${barColor}"></div></div>
                    <span>${moisture}%</span>
                </td>
                <td>${temp}</td>
                <td>${hum}</td>
                <td><button class="btn btn-xs btn-outline">Details</button></td>
            </tr>`;
        }).join('');
    }

    function rebuildHealthChart() {
        if (!healthCtx) return;

        if (healthChart) healthChart.destroy();

        healthChart = new Chart(healthCtx, {
            type: 'doughnut',
            data: {
                labels: fieldHealthData.map(f => f.name),
                datasets: [{
                    data: fieldHealthData.map(f => f.score),
                    backgroundColor: fieldHealthData.map(f => f.color),
                    borderWidth: 0,
                    spacing: 4,
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                cutout: '72%',
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(15, 31, 15, 0.9)',
                        padding: 12,
                        cornerRadius: 10,
                        bodyFont: { family: 'Inter' },
                        callbacks: {
                            label: (ctx) => ` ${ctx.label}: ${ctx.raw}%`
                        }
                    }
                }
            }
        });

        // Build legend
        const legendContainer = document.getElementById('healthLegend');
        if (legendContainer) {
            fieldHealthData.forEach(field => {
                const item = document.createElement('div');
                item.className = 'health-legend-item';
                item.innerHTML = `
                    <div class="legend-color" style="background:${field.color}"></div>
                    <span class="legend-name">${field.name}</span>
                    <span class="legend-value">${field.score}%</span>
                `;
                legendContainer.appendChild(item);
            });
        }

        // Overall score
        const avgScore = Math.round(
            fieldHealthData.reduce((sum, f) => sum + f.score, 0) / fieldHealthData.length
        );
        const scoreEl = document.getElementById('healthScore');
        if (scoreEl) scoreEl.textContent = avgScore + '%';

        // Also update hero
        const heroHealth = document.getElementById('heroHealth');
        if (heroHealth) heroHealth.textContent = avgScore + '%';

        // Update hero ring
        const heroRing = document.getElementById('heroRing');
        if (heroRing) {
            const circumference = 2 * Math.PI * 90;
            const offset = circumference * (1 - avgScore / 100);
            heroRing.setAttribute('stroke-dasharray', circumference);
            heroRing.setAttribute('stroke-dashoffset', offset);
        }
    }

    // ---------- PUMP CONTROL ----------
    const pumpSwitch = document.getElementById('pumpSwitch');
    const pumpRing = document.getElementById('pumpRing');
    const pumpProgress = document.getElementById('pumpProgress');
    const pumpStatusText = document.getElementById('pumpStatus');
    const pumpBtnText = document.getElementById('pumpBtnText');
    const pumpToggleBtn = document.getElementById('pumpToggleBtn');
    const relayStatusEl = document.getElementById('relayStatus');
    const totalWaterEl = document.getElementById('totalWater');
    const lastIrrigationEl = document.getElementById('lastIrrigation');

    let pumpOn = false;
    let waterTotal = 0;
    let pumpInterval = null;
    let pumpRuntimeSeconds = 0;
    let pumpRuntimeInterval = null;

    function setPumpState(on) {
        pumpOn = on;
        pumpRing?.classList.toggle('active', on);

        if (pumpStatusText) {
            pumpStatusText.textContent = on ? 'Pump is RUNNING' : 'Pump is OFF';
            pumpStatusText.style.color = on ? '#22c55e' : '';
        }

        if (pumpBtnText) {
            pumpBtnText.textContent = on ? 'Stop Pump' : 'Toggle Pump';
        }

        if (relayStatusEl) {
            relayStatusEl.textContent = on ? 'Relay ON' : 'Relay OFF';
        }

        // Animate pump ring
        if (pumpProgress) {
            const circumference = 2 * Math.PI * 54;
            pumpProgress.style.transition = 'stroke-dashoffset 0.8s ease';
            pumpProgress.setAttribute('stroke-dashoffset', on ? '0' : circumference);
        }

        if (pumpSwitch) pumpSwitch.checked = on;

        // Notify backend
        if (apiAvailable) {
            const activeMode = document.querySelector('.mode-btn.active')?.dataset.mode || 'manual';
            fetch(API_BASE + '/pump/toggle', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: on ? 'on' : 'off', mode: activeMode, field_id: 1 })
            }).catch(err => console.warn('Pump API call failed:', err.message));
        }

        // Simulate water usage when pump is on
        if (on) {
            pumpInterval = setInterval(() => {
                waterTotal += 0.1;
                if (totalWaterEl) totalWaterEl.textContent = waterTotal.toFixed(1) + ' L';

                // Animate flow sensor value
                const flowVal = document.getElementById('flowValue');
                const flowGauge = document.getElementById('flowGauge');
                if (flowVal) flowVal.textContent = (1.5 + Math.random() * 0.5).toFixed(1);
                if (flowGauge) flowGauge.style.width = ((1.8 / 30) * 100) + '%';
            }, 1000);

            // Pump runtime counter
            pumpRuntimeSeconds = 0;
            pumpRuntimeInterval = setInterval(() => {
                pumpRuntimeSeconds++;
                const min = String(Math.floor(pumpRuntimeSeconds / 60)).padStart(2, '0');
                const sec = String(pumpRuntimeSeconds % 60).padStart(2, '0');
                const runtimeEl = document.getElementById('pumpRuntime');
                if (runtimeEl) runtimeEl.textContent = `${min}:${sec}`;
            }, 1000);

            if (lastIrrigationEl) lastIrrigationEl.textContent = 'Now';
        } else {
            clearInterval(pumpInterval);
            clearInterval(pumpRuntimeInterval);
            const runtimeEl = document.getElementById('pumpRuntime');
            if (runtimeEl) runtimeEl.textContent = '00:00';

            const flowVal = document.getElementById('flowValue');
            const flowGauge = document.getElementById('flowGauge');
            if (flowVal) flowVal.textContent = '0.0';
            if (flowGauge) flowGauge.style.width = '0%';

            if (lastIrrigationEl && waterTotal > 0) {
                lastIrrigationEl.textContent = 'Just now';
            }
        }
    }

    pumpSwitch?.addEventListener('change', () => {
        setPumpState(pumpSwitch.checked);
    });

    pumpToggleBtn?.addEventListener('click', () => {
        setPumpState(!pumpOn);
    });

    // Pump mode buttons
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            // Show auto-threshold panel only when Auto mode is selected
            const autoThresh = document.getElementById('autoThreshold');
            if (autoThresh) {
                autoThresh.style.display = btn.dataset.mode === 'auto' ? 'flex' : 'none';
            }
        });
    });
    // Auto mode is active by default, so show threshold panel on load
    (() => {
        const autoThresh = document.getElementById('autoThreshold');
        if (autoThresh) autoThresh.style.display = 'flex';
    })();

    // ---------- LIVE UPDATES (API polling or simulated fallback) ----------
    setInterval(() => {
        if (apiAvailable) {
            // Poll API for real data
            fetchLatestSensors();
        } else {
            // Fallback: slight random variation to simulate sensor noise
            const moistureEl = document.getElementById('moistureValue');
            const tempEl = document.getElementById('tempValue');
            const humidityEl = document.getElementById('humidityValue');
            const moistureGauge = document.getElementById('moistureGauge');
            const tempGauge = document.getElementById('tempGauge');
            const humidityGauge = document.getElementById('humidityGauge');

            if (moistureEl) {
                const m = parseFloat(moistureEl.textContent) + (Math.random() - 0.5) * 2;
                const mv = Math.max(20, Math.min(90, m));
                moistureEl.textContent = mv.toFixed(0);
                if (moistureGauge) moistureGauge.style.width = mv + '%';
            }

            if (tempEl) {
                const t = parseFloat(tempEl.textContent) + (Math.random() - 0.5) * 0.5;
                const tv = Math.max(15, Math.min(45, t));
                tempEl.textContent = tv.toFixed(1);
                if (tempGauge) tempGauge.style.width = (tv / 50 * 100) + '%';
            }

            if (humidityEl) {
                const h = parseFloat(humidityEl.textContent) + (Math.random() - 0.5) * 3;
                const hv = Math.max(20, Math.min(95, h));
                humidityEl.textContent = hv.toFixed(0);
                if (humidityGauge) humidityGauge.style.width = hv + '%';
            }

            document.querySelectorAll('.last-update').forEach(el => {
                el.textContent = 'Updated just now';
            });
        }
    }, 5000);

    // ---------- FETCH ALERTS FROM API ----------
    async function fetchAlerts() {
        try {
            const res = await fetch(API_BASE + '/alerts?limit=10');
            const json = await res.json();
            if (json.success && json.data.length > 0) {
                const alertsList = document.getElementById('alertsList');
                if (alertsList) {
                    alertsList.innerHTML = json.data.map(a => {
                        const iconMap = {
                            warning: 'fa-temperature-high',
                            danger:  'fa-triangle-exclamation',
                            info:    'fa-droplet',
                            success: 'fa-microchip'
                        };
                        const icon = iconMap[a.type] || 'fa-bell';
                        const timeAgo = getTimeAgo(new Date(a.created_at));
                        return `<div class="alert-item ${a.type}" data-alert-id="${a.id}">
                            <div class="alert-icon"><i class="fas ${icon}"></i></div>
                            <div class="alert-content">
                                <strong>${a.title}</strong>
                                <p>${a.message}</p>
                            </div>
                            <span class="alert-time">${timeAgo}</span>
                            <button class="alert-dismiss" title="Dismiss"><i class="fas fa-xmark"></i></button>
                        </div>`;
                    }).join('');
                }

                // Update notification badge
                const unread = json.data.filter(a => !a.is_read).length;
                const badge = document.querySelector('.notification-btn .badge');
                if (badge) {
                    badge.textContent = unread;
                    badge.style.display = unread > 0 ? '' : 'none';
                }
            }
        } catch (err) {
            console.warn('Alerts fetch failed:', err.message);
        }
    }

    function getTimeAgo(date) {
        const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
        if (seconds < 60)   return 'Just now';
        if (seconds < 3600) return Math.floor(seconds / 60) + ' min ago';
        if (seconds < 86400) return Math.floor(seconds / 3600) + ' hr ago';
        return Math.floor(seconds / 86400) + ' day(s) ago';
    }

    // ---------- NAV CLICK HANDLING ----------
    const sectionMap = {
        'Dashboard':   '.hero-banner',
        'Fields':      '#fieldTable',
        'Crop Health': '#healthChart',
        'Irrigation':  '.pump-card',
        'Analytics':   '.chart-card',
        'History':     '.chart-card',
        'Devices':     '.hardware-card',
        'Alerts':      '#alertsList',
        'Settings':    null   // opens user dropdown
    };

    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            item.classList.add('active');

            // Close mobile sidebar
            sidebar?.classList.remove('mobile-open');
            overlay?.classList.remove('show');

            const label = item.querySelector('span')?.textContent;
            if (label === 'Settings') {
                openModal('settingsModal');
                initSettingsModal();
                return;
            }

            const target = sectionMap[label];
            if (target) {
                const el = document.querySelector(target);
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    // Briefly highlight the section
                    el.closest('.card, section, .sensor-cards')?.classList.add('search-highlight');
                    setTimeout(() => {
                        el.closest('.card, section, .sensor-cards')?.classList.remove('search-highlight');
                    }, 1500);
                }
            }
            
            // Update page title
            const pageTitle = document.querySelector('.page-title h2');
            const breadcrumb = document.querySelector('.page-title .breadcrumb');
            if (pageTitle && label) {
                pageTitle.textContent = label;
                const breadcrumbs = {
                    'Dashboard':   'Real-time microclimate monitoring',
                    'Fields':      'Manage your farm fields',
                    'Crop Health': 'Monitor crop health scores',
                    'Irrigation':  'Control water pump & irrigation',
                    'Analytics':   'Sensor trends & analytics',
                    'History':     'Historical sensor data',
                    'Devices':     'Hardware & device status',
                    'Alerts':      'View all system alerts'
                };
                if (breadcrumb) breadcrumb.textContent = breadcrumbs[label] || '';
            }
        });
    });

    // ---------- SEARCH BOX ----------
    const searchInput = document.querySelector('.search-box input');
    searchInput?.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        
        // Search through field table rows
        const rows = document.querySelectorAll('#fieldTable tbody tr');
        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = query === '' || text.includes(query) ? '' : 'none';
        });

        // Search through alerts
        const alertItems = document.querySelectorAll('#alertsList .alert-item');
        alertItems.forEach(item => {
            const text = item.textContent.toLowerCase();
            item.style.display = query === '' || text.includes(query) ? '' : 'none';
        });

        // Search through hardware items
        const hwItems = document.querySelectorAll('.hw-item');
        hwItems.forEach(item => {
            const text = item.textContent.toLowerCase();
            item.style.display = query === '' || text.includes(query) ? '' : 'none';
        });

        // If query matches a sensor name, highlight that card
        document.querySelectorAll('.sensor-card').forEach(card => {
            const name = card.querySelector('h3')?.textContent.toLowerCase() || '';
            if (query && name.includes(query)) {
                card.classList.add('search-highlight');
            } else {
                card.classList.remove('search-highlight');
            }
        });

        // Clear highlights if empty
        if (query === '') {
            document.querySelectorAll('.search-highlight').forEach(el => el.classList.remove('search-highlight'));
        }
    });

    // Clear search on Escape
    searchInput?.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            searchInput.value = '';
            searchInput.dispatchEvent(new Event('input'));
            searchInput.blur();
        }
    });

    // ---------- USER PROFILE DROPDOWN ----------
    const userProfile = document.getElementById('userProfile');
    const userDropdown = document.getElementById('userDropdown');

    userProfile?.addEventListener('click', (e) => {
        e.stopPropagation();
        userDropdown?.classList.toggle('show');
        // Close notification dropdown if open
        notifDropdown?.classList.remove('show');
    });

    document.addEventListener('click', (e) => {
        if (!userDropdown?.contains(e.target) && !userProfile?.contains(e.target)) {
            userDropdown?.classList.remove('show');
        }
    });

    // User dropdown actions
    document.querySelectorAll('.user-dropdown-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const action = item.dataset.action;
            userDropdown?.classList.remove('show');

            switch (action) {
                case 'profile':
                    openModal('profileModal');
                    loadProfileStats();
                    break;
                case 'settings':
                    openModal('settingsModal');
                    initSettingsModal();
                    break;
                case 'devices':
                    document.querySelector('.hardware-card')?.scrollIntoView({ behavior: 'smooth' });
                    break;
                case 'logout':
                    showToast('Logged out successfully', 'success');
                    break;
            }
        });
    });

    // ---------- MARK ALL READ (Notifications) ----------
    const markAllReadBtn = document.getElementById('markAllReadBtn');
    markAllReadBtn?.addEventListener('click', async () => {
        // Mark visually
        document.querySelectorAll('.notif-item.unread').forEach(item => {
            item.classList.remove('unread');
        });
        // Update badge
        const badge = document.querySelector('.notification-btn .badge');
        if (badge) {
            badge.textContent = '0';
            badge.style.display = 'none';
        }

        // Call API
        if (apiAvailable) {
            try {
                await fetch(API_BASE + '/alerts/read-all', { method: 'PUT' });
            } catch (err) {
                console.warn('Mark all read failed:', err.message);
            }
        }

        showToast('All notifications marked as read', 'success');
    });

    // Clicking individual notification items marks them read
    document.getElementById('notifList')?.addEventListener('click', (e) => {
        const item = e.target.closest('.notif-item');
        if (item && item.classList.contains('unread')) {
            item.classList.remove('unread');
            // Decrement badge
            const badge = document.querySelector('.notification-btn .badge');
            if (badge) {
                const count = Math.max(0, parseInt(badge.textContent) - 1);
                badge.textContent = count;
                if (count === 0) badge.style.display = 'none';
            }
        }
    });

    // ---------- ADD FIELD MODAL ----------
    const addFieldBtn = document.getElementById('addFieldBtn');
    const addFieldModal = document.getElementById('addFieldModal');
    const addFieldForm = document.getElementById('addFieldForm');

    addFieldBtn?.addEventListener('click', () => {
        openModal('addFieldModal');
    });

    addFieldForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('fieldName').value.trim();
        const crop = document.getElementById('fieldCrop').value;
        const cropIcon = document.getElementById('fieldIcon').value;

        if (!name) {
            showToast('Please enter a field name', 'warning');
            return;
        }

        // Send to API
        if (apiAvailable) {
            try {
                const res = await fetch(API_BASE + '/fields', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, crop, crop_icon: cropIcon, status: 'healthy' })
                });
                const json = await res.json();
                if (json.success) {
                    showToast(`Field "${name}" added successfully!`, 'success');
                    closeModal('addFieldModal');
                    addFieldForm.reset();
                    // Refresh field table
                    fetchFieldHealth();
                } else {
                    showToast('Failed to add field: ' + json.error, 'error');
                }
            } catch (err) {
                showToast('API error: ' + err.message, 'error');
            }
        } else {
            // Fallback: add to table directly
            const tbody = document.querySelector('#fieldTable tbody');
            if (tbody) {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td><strong>${name}</strong></td>
                    <td><i class="fas ${cropIcon}"></i> ${crop}</td>
                    <td><span class="status-badge healthy">Healthy</span></td>
                    <td><div class="mini-bar"><div class="mini-fill fill-50 bg-green"></div></div><span>50%</span></td>
                    <td>—</td>
                    <td>—</td>
                    <td><button class="btn btn-xs btn-outline">Details</button></td>
                `;
                tbody.appendChild(row);
            }
            showToast(`Field "${name}" added (local only — start API to save)`, 'warning');
            closeModal('addFieldModal');
            addFieldForm.reset();
        }
    });

    // ---------- FIELD DETAILS MODAL ----------
    // Event delegation for Details buttons (works for dynamically added rows too)
    document.getElementById('fieldTable')?.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn');
        if (!btn || !btn.textContent.includes('Details')) return;

        const row = btn.closest('tr');
        if (!row) return;

        const cells = row.querySelectorAll('td');
        const fieldName = cells[0]?.textContent.trim() || 'Unknown';
        const crop = cells[1]?.textContent.trim() || '—';
        const status = cells[2]?.textContent.trim() || '—';
        const moisture = cells[3]?.querySelector('span')?.textContent || '—';
        const temp = cells[4]?.textContent.trim() || '—';
        const humidity = cells[5]?.textContent.trim() || '—';

        document.getElementById('detailFieldName').textContent = fieldName;
        document.getElementById('detailMoisture').textContent = moisture;
        document.getElementById('detailTemp').textContent = temp;
        document.getElementById('detailHumidity').textContent = humidity;
        document.getElementById('detailFlow').textContent = '0.0 L/min';
        document.getElementById('detailCrop').textContent = crop;
        document.getElementById('detailStatus').textContent = status;
        document.getElementById('detailLastReading').textContent = 'Just now';

        openModal('fieldDetailModal');
    });

    // ---------- VIEW ALL ALERTS ----------
    const viewAllAlertsBtn = document.getElementById('viewAllAlertsBtn');
    viewAllAlertsBtn?.addEventListener('click', async () => {
        // Scroll to alerts section
        document.getElementById('alertsList')?.scrollIntoView({ behavior: 'smooth' });

        // If API available, load more alerts
        if (apiAvailable) {
            try {
                const res = await fetch(API_BASE + '/alerts?limit=50');
                const json = await res.json();
                if (json.success && json.data.length > 0) {
                    const alertsList = document.getElementById('alertsList');
                    if (alertsList) {
                        alertsList.innerHTML = json.data.map(a => {
                            const iconMap = {
                                warning: 'fa-temperature-high',
                                danger:  'fa-triangle-exclamation',
                                info:    'fa-droplet',
                                success: 'fa-microchip'
                            };
                            const icon = iconMap[a.type] || 'fa-bell';
                            const timeAgo = getTimeAgo(new Date(a.created_at));
                            return `<div class="alert-item ${a.type}" data-alert-id="${a.id}">
                                <div class="alert-icon"><i class="fas ${icon}"></i></div>
                                <div class="alert-content">
                                    <strong>${a.title}</strong>
                                    <p>${a.message}</p>
                                </div>
                                <span class="alert-time">${timeAgo}</span>
                                <button class="alert-dismiss" title="Dismiss"><i class="fas fa-xmark"></i></button>
                            </div>`;
                        }).join('');
                    }
                    showToast(`Loaded ${json.data.length} alerts`, 'info');
                }
            } catch (err) {
                console.warn('Load all alerts failed:', err.message);
            }
        }

        // Update button text briefly
        viewAllAlertsBtn.innerHTML = '<i class="fas fa-check"></i> Showing All';
        setTimeout(() => {
            viewAllAlertsBtn.innerHTML = 'View All';
        }, 2000);
    });

    // ---------- MODAL HELPERS ----------
    function openModal(id) {
        const modal = document.getElementById(id);
        if (modal) {
            modal.classList.add('show');
            document.body.style.overflow = 'hidden';
        }
    }

    function closeModal(id) {
        const modal = document.getElementById(id);
        if (modal) {
            modal.classList.remove('show');
            document.body.style.overflow = '';
        }
    }

    // Close modal via X buttons
    document.querySelectorAll('[data-close-modal]').forEach(btn => {
        btn.addEventListener('click', () => {
            closeModal(btn.dataset.closeModal);
        });
    });

    // Close modal by clicking overlay background
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                closeModal(overlay.id);
            }
        });
    });

    // Close modal with Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal-overlay.show').forEach(m => closeModal(m.id));
            userDropdown?.classList.remove('show');
            notifDropdown?.classList.remove('show');
        }
    });

    // ---------- TOAST HELPER ----------
    function showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const iconMap = {
            success: 'fa-circle-check',
            warning: 'fa-triangle-exclamation',
            info:    'fa-circle-info',
            error:   'fa-circle-xmark'
        };

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <i class="fas ${iconMap[type] || 'fa-circle-info'}"></i>
            <span>${message}</span>
            <button class="toast-close"><i class="fas fa-xmark"></i></button>
        `;

        container.appendChild(toast);

        // Close on click
        toast.querySelector('.toast-close')?.addEventListener('click', () => {
            toast.style.animation = 'toastOut 0.3s ease forwards';
            setTimeout(() => toast.remove(), 300);
        });

        // Auto-dismiss after 4s
        setTimeout(() => {
            if (toast.parentNode) {
                toast.style.animation = 'toastOut 0.3s ease forwards';
                setTimeout(() => toast.remove(), 300);
            }
        }, 4000);
    }

    // ---------- SENSOR CARD CLICK (expand detail) ----------
    document.querySelectorAll('.sensor-card').forEach(card => {
        card.style.cursor = 'pointer';
        card.addEventListener('click', () => {
            const sensor = card.dataset.sensor;
            const value = card.querySelector('.value')?.textContent || '—';
            const unit = card.querySelector('.unit')?.textContent || '';
            const name = card.querySelector('h3')?.textContent || 'Sensor';
            showToast(`${name}: ${value}${unit}`, 'info');
        });
    });

    // ---------- HARDWARE ITEM CLICK ----------
    document.querySelectorAll('.hw-item').forEach(item => {
        item.style.cursor = 'pointer';
        item.addEventListener('click', () => {
            const name = item.querySelector('.hw-name')?.textContent || 'Device';
            const status = item.querySelector('.hw-status')?.textContent || 'Unknown';
            showToast(`${name} — Status: ${status}`, 'info');
        });
    });

    // ---------- CURRENT DATE/TIME ----------
    function updateDateTime() {
        const now = new Date();
        // Could display somewhere if needed
    }
    updateDateTime();
    setInterval(updateDateTime, 60000);

    // ---------- INITIALIZATION ----------
    // Check API, then load data from MySQL or fall back to simulated
    checkApi().then(available => {
        setConnectionStatus(available ? 'live' : 'demo');
        if (available) {
            fetchLatestSensors();
            fetchChartData('24h');
            fetchFieldHealth();
            fetchAlerts();
        } else {
            // Use simulated data (animations already start below)
            setTimeout(animateSensorValues, 600);
            rebuildHealthChart();
        }
    });

    // ============================================================
    //  ENHANCEMENTS
    // ============================================================

    // ---------- LIVE CLOCK ----------
    function updateClock() {
        const now = new Date();
        const h = now.getHours().toString().padStart(2, '0');
        const m = now.getMinutes().toString().padStart(2, '0');
        const s = now.getSeconds().toString().padStart(2, '0');
        const el = document.getElementById('topbarClock');
        if (el) el.textContent = `${h}:${m}:${s}`;
    }
    updateClock();
    setInterval(updateClock, 1000);

    // ---------- CONNECTION STATUS BADGE ----------
    function setConnectionStatus(state) {
        const badge = document.getElementById('connectionBadge');
        const label = document.getElementById('connectionLabel');
        if (!badge) return;
        badge.className = 'connection-badge conn-' + state;
        const labels = { live: 'Live', demo: 'Demo mode', connecting: 'Connecting…' };
        if (label) label.textContent = labels[state] || state;
    }
    setConnectionStatus('connecting');

    // ---------- REFRESH BUTTON ----------
    async function refreshAll() {
        const available = await checkApi();
        setConnectionStatus(available ? 'live' : 'demo');
        if (available) {
            await Promise.all([
                fetchLatestSensors(),
                fetchChartData(document.querySelector('.chip[data-range].active')?.dataset.range || '24h'),
                fetchFieldHealth(),
                fetchAlerts()
            ]);
        }
    }

    document.getElementById('refreshBtn')?.addEventListener('click', async () => {
        const btn = document.getElementById('refreshBtn');
        btn?.classList.add('spin');
        await refreshAll();
        setTimeout(() => btn?.classList.remove('spin'), 600);
        showToast('Data refreshed', 'success');
    });

    // ---------- CSV EXPORT ----------
    document.getElementById('exportCsvBtn')?.addEventListener('click', () => {
        const range = document.querySelector('.chip[data-range].active')?.dataset.range || '24h';
        const header = 'Time,Moisture (%),Temperature (°C),Humidity (%)';
        const rows = chartLabels.map((lbl, i) =>
            `${lbl},${moistureData[i] ?? ''},${tempData[i] ?? ''},${humidityData[i] ?? ''}`
        );
        const csv = [header, ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `terrasync-sensors-${range}-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('CSV exported successfully', 'success');
    });

    // ---------- DYNAMIC SENSOR STATUS (Optimal / Warning / Critical) ----------
    const THRESHOLDS = {
        moisture:    { optimal: [40, 60], warning: [25, 75] },
        temperature: { optimal: [20, 30], warning: [15, 35] },
        humidity:    { optimal: [50, 70], warning: [30, 85] }
    };

    function getSensorLevel(sensor, value) {
        const t = THRESHOLDS[sensor];
        if (!t) return 'optimal';
        const v = parseFloat(value);
        if (v >= t.optimal[0] && v <= t.optimal[1]) return 'optimal';
        if (v >= t.warning[0] && v <= t.warning[1]) return 'warning';
        return 'critical';
    }

    function updateSensorCardStatus(moisture, temperature, humidity) {
        const checks = [
            { selector: '[data-sensor="moisture"]',    sensor: 'moisture',    value: moisture    },
            { selector: '[data-sensor="temperature"]', sensor: 'temperature', value: temperature },
            { selector: '[data-sensor="humidity"]',    sensor: 'humidity',    value: humidity    }
        ];
        checks.forEach(({ selector, sensor, value }) => {
            const card = document.querySelector(selector);
            if (!card) return;
            const statusEl = card.querySelector('.sensor-status');
            if (statusEl) {
                statusEl.className = `sensor-status ${getSensorLevel(sensor, value)}`;
            }
        });
    }

    // ---------- COMPUTED TREND ARROWS ----------
    function updateTrendArrows(current, prev) {
        const sensors = [
            { sel: '[data-sensor="moisture"]',    key: 'moisture',    unit: '%', decimals: 0 },
            { sel: '[data-sensor="temperature"]', key: 'temperature', unit: '°', decimals: 1 },
            { sel: '[data-sensor="humidity"]',    key: 'humidity',    unit: '%', decimals: 0 }
        ];
        sensors.forEach(({ sel, key, unit, decimals }) => {
            const card = document.querySelector(sel);
            if (!card) return;
            const trend = card.querySelector('.sensor-trend');
            if (!trend) return;
            const diff = (current[key] || 0) - (prev[key] || 0);
            const sign = diff >= 0 ? '+' : '';
            const dir  = diff > 0.001 ? 'up' : diff < -0.001 ? 'down' : 'neutral';
            const icon = dir === 'up' ? 'fa-arrow-trend-up' : dir === 'down' ? 'fa-arrow-trend-down' : 'fa-minus';
            trend.className = `sensor-trend ${dir}`;
            trend.innerHTML = `<i class="fas ${icon}"></i><span>${sign}${diff.toFixed(decimals)}${unit}</span>`;
        });
    }

    // ---------- AUTO-IRRIGATION (Auto mode only) ----------
    function checkAutoIrrigation(moisture) {
        const mode = document.querySelector('.mode-btn.active')?.dataset.mode;
        if (mode !== 'auto') return;
        const onThresh  = parseInt(document.getElementById('moistureThreshold')?.value    || '30', 10);
        const offThresh = parseInt(document.getElementById('moistureThresholdOff')?.value || '60', 10);
        if (!pumpOn && moisture < onThresh) {
            setPumpState(true);
            showToast(`Auto-irrigation ON — moisture at ${moisture.toFixed(0)}%`, 'warning');
        } else if (pumpOn && moisture >= offThresh) {
            setPumpState(false);
            showToast(`Auto-irrigation OFF — moisture restored to ${moisture.toFixed(0)}%`, 'success');
        }
    }

    // ---------- ALERT DISMISS (event delegation) ----------
    document.getElementById('alertsList')?.addEventListener('click', async (e) => {
        const dismissBtn = e.target.closest('.alert-dismiss');
        if (!dismissBtn) return;
        const alertItem = dismissBtn.closest('.alert-item');
        if (!alertItem) return;
        alertItem.style.animation = 'fadeOutRight 0.35s ease forwards';
        setTimeout(() => alertItem.remove(), 350);
        const alertId = alertItem.dataset.alertId;
        if (alertId && apiAvailable) {
            try {
                await fetch(`${API_BASE}/alerts/${alertId}/read`, { method: 'PUT' });
            } catch { /* silent */ }
        }
    });

    // ============================================================
    //  SETTINGS MODAL
    // ============================================================

    let settingsInitialized = false;

    function initSettingsModal() {
        loadSettingsValues();
        if (settingsInitialized) return;
        settingsInitialized = true;

        // ── Tab switching ──
        document.querySelectorAll('.settings-nav-item').forEach(item => {
            item.addEventListener('click', () => {
                document.querySelectorAll('.settings-nav-item').forEach(i => i.classList.remove('active'));
                document.querySelectorAll('.settings-panel').forEach(p => p.classList.remove('active'));
                item.classList.add('active');
                const panel = document.getElementById('stab-' + item.dataset.stab);
                if (panel) panel.classList.add('active');
            });
        });

        // ── Save buttons ──
        document.querySelectorAll('[data-save]').forEach(btn => {
            btn.addEventListener('click', () => {
                saveSettingsSection(btn.dataset.save);
            });
        });

        // ── Network: live API URL preview ──
        const hostEl  = document.getElementById('netHost');
        const portEl  = document.getElementById('netPort');
        function updateApiUrl() {
            const url = document.getElementById('netApiUrl');
            if (url && hostEl && portEl) {
                url.textContent = `http://${hostEl.value || 'localhost'}:${portEl.value || 3000}/api`;
            }
        }
        hostEl?.addEventListener('input', updateApiUrl);
        portEl?.addEventListener('input', updateApiUrl);

        // ── Network: Test DB connection ──
        document.getElementById('netTestBtn')?.addEventListener('click', async () => {
            const dot  = document.getElementById('netDbDot');
            const txt  = document.getElementById('netDbStatusText');
            if (dot) { dot.className = 'conn-dot conn-dot-sm'; }
            if (txt)  txt.textContent = 'Testing…';
            try {
                const res  = await fetch(API_BASE + '/health', { signal: AbortSignal.timeout(3000) });
                const data = await res.json();
                const ok   = data.database === 'connected';
                if (dot) dot.className = 'conn-dot conn-dot-sm ' + (ok ? 'online' : 'offline-dot');
                if (txt)  txt.textContent = ok ? 'Connected' : 'Disconnected';
                showToast(ok ? 'Database connected ✓' : 'Database unreachable', ok ? 'success' : 'error');
            } catch {
                if (dot) dot.className = 'conn-dot conn-dot-sm offline-dot';
                if (txt)  txt.textContent = 'Unreachable';
                showToast('API server unreachable', 'error');
            }
        });

        // ── Network: Generate token ──
        document.getElementById('genTokenBtn')?.addEventListener('click', () => {
            const token = Array.from(crypto.getRandomValues(new Uint8Array(24)))
                .map(b => b.toString(16).padStart(2, '0')).join('');
            const inp = document.getElementById('netApiToken');
            if (inp) { inp.value = token; inp.type = 'text'; }
            showToast('Token generated — remember to save', 'success');
        });

        // ── Password show/hide in network panel ──
        document.querySelectorAll('.settings-panel .pw-toggle').forEach(btn => {
            if (btn.closest('#stab-network')) {
                btn.addEventListener('click', () => {
                    const inp = document.getElementById(btn.dataset.target);
                    if (!inp) return;
                    const show = inp.type === 'password';
                    inp.type = show ? 'text' : 'password';
                    btn.querySelector('i').className = show ? 'fas fa-eye-slash' : 'fas fa-eye';
                });
            }
        });

        // ── Hardware: Calibration live preview ──
        document.getElementById('hwCalTestVal')?.addEventListener('input', updateCalPreview);
        document.getElementById('hwMoistDry')?.addEventListener('input', updateCalPreview);
        document.getElementById('hwMoistWet')?.addEventListener('input', updateCalPreview);

        function updateCalPreview() {
            const raw  = parseInt(document.getElementById('hwCalTestVal')?.value, 10);
            const dry  = parseInt(document.getElementById('hwMoistDry')?.value,   10) || 3400;
            const wet  = parseInt(document.getElementById('hwMoistWet')?.value,   10) || 800;
            const fill = document.getElementById('calTestFill');
            const pct  = document.getElementById('calTestPct');
            if (isNaN(raw) || !fill || !pct) { if (pct) pct.textContent = '—'; return; }
            const clamped = Math.max(Math.min(raw, dry), wet);
            const mapped  = Math.round(((dry - clamped) / (dry - wet)) * 100);
            fill.style.width = mapped + '%';
            pct.textContent  = mapped + '%';
        }

        // ── Browser notifications permission ──
        document.getElementById('notifBrowser')?.addEventListener('change', async (e) => {
            if (e.target.checked && 'Notification' in window) {
                const perm = await Notification.requestPermission();
                if (perm !== 'granted') {
                    e.target.checked = false;
                    showToast('Browser notifications permission denied', 'warning');
                } else {
                    showToast('Browser notifications enabled', 'success');
                }
            }
        });

        // ── Danger Zone actions ──
        function confirmAction(title, message, onConfirm) {
            document.getElementById('confirmTitle').innerHTML =
                `<i class="fas fa-triangle-exclamation"></i> ${title}`;
            document.getElementById('confirmMessage').textContent = message;
            const okBtn = document.getElementById('confirmOkBtn');
            const clone = okBtn.cloneNode(true);
            okBtn.parentNode.replaceChild(clone, clone.parentNode.querySelector('#confirmOkBtn'));
            document.getElementById('confirmOkBtn').addEventListener('click', () => {
                closeModal('confirmDialog');
                onConfirm();
            }, { once: true });
            openModal('confirmDialog');
        }

        document.getElementById('dangerClearAlerts')?.addEventListener('click', () => {
            confirmAction('Clear All Alerts',
                'This will permanently delete every alert record. Are you sure?',
                async () => {
                    showToast('All alerts cleared', 'success');
                    document.getElementById('alertsList').innerHTML =
                        '<p style="color:var(--text-muted);text-align:center;padding:20px">No alerts</p>';
                });
        });

        document.getElementById('dangerClearHistory')?.addEventListener('click', () => {
            confirmAction('Clear Sensor History',
                'All historical sensor readings will be deleted. Latest readings remain. Continue?',
                () => {
                    chartLabels  = [];
                    moistureData = [];
                    tempData     = [];
                    humidityData = [];
                    if (trendChart) { trendChart.data.labels = []; trendChart.data.datasets.forEach(d => d.data = []); trendChart.update(); }
                    showToast('Sensor history cleared', 'success');
                });
        });

        document.getElementById('dangerResetPrefs')?.addEventListener('click', () => {
            confirmAction('Reset Dashboard Preferences',
                'All saved preferences (profile, theme, thresholds) will be reset to defaults.',
                () => {
                    ['terrasync-theme','terrasync-avatar-color','terrasync-profile',
                     'terrasync-temp-unit','terrasync-default-range','terrasync-refresh-interval',
                     'terrasync-alert-sound','terrasync-settings'].forEach(k => localStorage.removeItem(k));
                    html.setAttribute('data-theme', 'light');
                    updateThemeIcon('light');
                    updateChartTheme();
                    showToast('Dashboard preferences reset to defaults', 'success');
                });
        });

        document.getElementById('dangerFactoryReset')?.addEventListener('click', () => {
            confirmAction('Factory Reset',
                '⚠️ ALL data — fields, sensors, alerts, pump events — will be permanently wiped. This cannot be undone.',
                () => {
                    showToast('Factory reset initiated — refresh the page', 'error');
                });
        });
    }

    // ── Load all saved settings from localStorage into the form ──
    function loadSettingsValues() {
        const s = JSON.parse(localStorage.getItem('terrasync-settings') || '{}');

        const set = (id, val) => { const el = document.getElementById(id); if (el && val !== undefined) { if (el.type === 'checkbox') el.checked = val; else el.value = val; } };

        set('sysName',          s.sysName          ?? 'TerraSync');
        set('sysFarm',          s.sysFarm          ?? 'Precision Farm — Cebu');
        set('sysTimezone',      s.sysTimezone      ?? 'Asia/Manila');
        set('sysDateFormat',    s.sysDateFormat    ?? 'MMM DD, YYYY');
        set('sysTempUnit',      s.sysTempUnit      ?? 'C');
        set('sysLanguage',      s.sysLanguage      ?? 'en');
        set('sysPollInterval',  s.sysPollInterval  ?? '5000');
        set('sysChartRange',    s.sysChartRange    ?? '24h');
        set('sysAutoRefresh',   s.sysAutoRefresh   ?? true);
        set('sysAnimateGauges', s.sysAnimateGauges ?? true);

        set('thMoistureOptMin', s.thMoistureOptMin ?? 40);
        set('thMoistureOptMax', s.thMoistureOptMax ?? 60);
        set('thMoistureCrit',   s.thMoistureCrit   ?? 25);
        set('thTempOptMin',     s.thTempOptMin     ?? 20);
        set('thTempOptMax',     s.thTempOptMax     ?? 30);
        set('thTempAlert',      s.thTempAlert      ?? 35);
        set('thHumidOptMin',    s.thHumidOptMin    ?? 50);
        set('thHumidOptMax',    s.thHumidOptMax    ?? 70);
        set('thHumidWarn',      s.thHumidWarn      ?? 30);
        set('thAutoIrrOn',      s.thAutoIrrOn      ?? 30);
        set('thAutoIrrOff',     s.thAutoIrrOff     ?? 60);

        set('notifHighTemp',    s.notifHighTemp    ?? true);
        set('notifLowMoisture', s.notifLowMoisture ?? true);
        set('notifPump',        s.notifPump        ?? true);
        set('notifDevice',      s.notifDevice      ?? true);
        set('notifSound',       s.notifSound       ?? true);
        set('notifBrowser',     s.notifBrowser     ?? false);
        set('notifToast',       s.notifToast       ?? true);
        set('notifEmail',       s.notifEmail       ?? false);
        set('notifEmailAddr',   s.notifEmailAddr   ?? 'jaslem.karil@terrasync.io');

        set('netHost',          s.netHost   ?? 'localhost');
        set('netPort',          s.netPort   ?? 3000);
        set('netCors',          s.netCors   ?? true);
        set('dbHost',           s.dbHost    ?? 'localhost');
        set('dbPort',           s.dbPort    ?? 3306);
        set('dbName',           s.dbName    ?? 'terrasync');
        set('dbUser',           s.dbUser    ?? 'root');

        set('hwDhtPin',          s.hwDhtPin          ?? 4);
        set('hwMoistPin',        s.hwMoistPin        ?? 34);
        set('hwRelayPin',        s.hwRelayPin        ?? 26);
        set('hwRelayLogic',      s.hwRelayLogic      ?? 'active_low');
        set('hwDhtType',         s.hwDhtType         ?? 'DHT22');
        set('hwMoistDry',        s.hwMoistDry        ?? 3400);
        set('hwMoistWet',        s.hwMoistWet        ?? 800);
        set('hwSensorInterval',  s.hwSensorInterval  ?? 10000);
        set('hwPumpPollInterval',s.hwPumpPollInterval?? 5000);

        // Sync auto-irrigation inputs with pump panel
        const miOn  = document.getElementById('moistureThreshold');
        const miOff = document.getElementById('moistureThresholdOff');
        if (miOn  && s.thAutoIrrOn  !== undefined) miOn.value  = s.thAutoIrrOn;
        if (miOff && s.thAutoIrrOff !== undefined) miOff.value = s.thAutoIrrOff;

        // Refresh live API URL display
        const url = document.getElementById('netApiUrl');
        if (url) url.textContent = `http://${s.netHost || 'localhost'}:${s.netPort || 3000}/api`;
    }

    function saveSettingsSection(section) {
        const s = JSON.parse(localStorage.getItem('terrasync-settings') || '{}');
        const get = (id) => { const el = document.getElementById(id); if (!el) return undefined; return el.type === 'checkbox' ? el.checked : el.value; };

        if (section === 'general') {
            Object.assign(s, {
                sysName: get('sysName'), sysFarm: get('sysFarm'),
                sysTimezone: get('sysTimezone'), sysDateFormat: get('sysDateFormat'),
                sysTempUnit: get('sysTempUnit'), sysLanguage: get('sysLanguage'),
                sysPollInterval: get('sysPollInterval'), sysChartRange: get('sysChartRange'),
                sysAutoRefresh: get('sysAutoRefresh'), sysAnimateGauges: get('sysAnimateGauges')
            });
        } else if (section === 'sensors') {
            Object.assign(s, {
                thMoistureOptMin: +get('thMoistureOptMin'), thMoistureOptMax: +get('thMoistureOptMax'),
                thMoistureCrit:   +get('thMoistureCrit'),
                thTempOptMin:     +get('thTempOptMin'),     thTempOptMax:  +get('thTempOptMax'),
                thTempAlert:      +get('thTempAlert'),
                thHumidOptMin:    +get('thHumidOptMin'),    thHumidOptMax: +get('thHumidOptMax'),
                thHumidWarn:      +get('thHumidWarn'),
                thAutoIrrOn:      +get('thAutoIrrOn'),      thAutoIrrOff:  +get('thAutoIrrOff')
            });
            // Push auto-irrigation values to pump panel
            const miOn  = document.getElementById('moistureThreshold');
            const miOff = document.getElementById('moistureThresholdOff');
            if (miOn)  miOn.value  = s.thAutoIrrOn;
            if (miOff) miOff.value = s.thAutoIrrOff;
            // Update live THRESHOLDS used by sensor card status
            THRESHOLDS.moisture.optimal    = [s.thMoistureOptMin, s.thMoistureOptMax];
            THRESHOLDS.moisture.warning    = [s.thMoistureCrit,   s.thMoistureOptMax + 10];
            THRESHOLDS.temperature.optimal = [s.thTempOptMin,     s.thTempOptMax];
            THRESHOLDS.temperature.warning = [s.thTempOptMin - 5, s.thTempAlert];
            THRESHOLDS.humidity.optimal    = [s.thHumidOptMin,    s.thHumidOptMax];
            THRESHOLDS.humidity.warning    = [s.thHumidWarn,      s.thHumidOptMax + 10];
        } else if (section === 'notifications') {
            Object.assign(s, {
                notifHighTemp:    get('notifHighTemp'),    notifLowMoisture: get('notifLowMoisture'),
                notifPump:        get('notifPump'),        notifDevice:      get('notifDevice'),
                notifSound:       get('notifSound'),       notifBrowser:     get('notifBrowser'),
                notifToast:       get('notifToast'),       notifEmail:       get('notifEmail'),
                notifEmailAddr:   get('notifEmailAddr')
            });
        } else if (section === 'network') {
            Object.assign(s, {
                netHost: get('netHost'), netPort: +get('netPort'), netCors: get('netCors'),
                dbHost:  get('dbHost'),  dbPort:  +get('dbPort'),
                dbName:  get('dbName'),  dbUser:  get('dbUser')
            });
        } else if (section === 'hardware') {
            Object.assign(s, {
                hwDhtPin:           +get('hwDhtPin'),          hwMoistPin:   +get('hwMoistPin'),
                hwRelayPin:         +get('hwRelayPin'),        hwRelayLogic: get('hwRelayLogic'),
                hwDhtType:          get('hwDhtType'),
                hwMoistDry:         +get('hwMoistDry'),        hwMoistWet:   +get('hwMoistWet'),
                hwSensorInterval:   +get('hwSensorInterval'),  hwPumpPollInterval: +get('hwPumpPollInterval')
            });
        }

        localStorage.setItem('terrasync-settings', JSON.stringify(s));
        showToast('Settings saved', 'success');
    }

    // ============================================================
    //  PROFILE MODAL
    // ============================================================

    // ---------- Load live stats into profile header ----------
    async function loadProfileStats() {
        try {
            // Alert count
            const alertRes = await fetch(API_BASE + '/alerts?limit=200');
            const alertJson = await alertRes.json();
            if (alertJson.success) {
                document.getElementById('statAlerts').textContent = alertJson.data.length;
            }
        } catch { /* silent */ }

        // Field count
        try {
            const fieldRes = await fetch(API_BASE + '/fields');
            const fieldJson = await fieldRes.json();
            if (fieldJson.success) {
                document.getElementById('statFields').textContent = fieldJson.data.length;
            }
        } catch { /* silent */ }

        // Pump cycles (today only via /api/pump/today)
        try {
            const pumpRes = await fetch(API_BASE + '/pump/today');
            const pumpJson = await pumpRes.json();
            if (pumpJson.success) {
                document.getElementById('statPumpCycles').textContent = pumpJson.data.cycles || 0;
            }
        } catch { /* silent */ }
    }

    // ---------- Profile Tabs ----------
    document.querySelectorAll('.profile-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.profile-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.profile-tab-panel').forEach(p => p.classList.remove('active'));
            tab.classList.add('active');
            const panel = document.getElementById('tab-' + tab.dataset.tab);
            if (panel) panel.classList.add('active');
        });
    });

    // ---------- Avatar Color Picker ----------
    const avatarChangeBtn = document.getElementById('avatarChangeBtn');
    const avatarColorPicker = document.getElementById('avatarColorPicker');
    const profileAvatar = document.getElementById('profileAvatar');

    let savedAvatarColor = localStorage.getItem('terrasync-avatar-color') || '#16a34a';
    if (profileAvatar) {
        profileAvatar.style.background = savedAvatarColor;
    }
    // Sync topbar avatar color too
    function syncTopbarAvatar(color) {
        document.querySelectorAll('.avatar').forEach(el => {
            el.style.background = color;
        });
    }
    syncTopbarAvatar(savedAvatarColor);

    avatarChangeBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        avatarColorPicker?.classList.toggle('show');
    });

    avatarColorPicker?.querySelectorAll('.av-color').forEach(btn => {
        btn.addEventListener('click', () => {
            const color = btn.dataset.color;
            savedAvatarColor = color;
            localStorage.setItem('terrasync-avatar-color', color);
            if (profileAvatar) profileAvatar.style.background = color;
            syncTopbarAvatar(color);
            avatarColorPicker.classList.remove('show');
            showToast('Avatar color updated', 'success');
        });
    });

    document.addEventListener('click', (e) => {
        if (!avatarColorPicker?.contains(e.target) && e.target !== avatarChangeBtn) {
            avatarColorPicker?.classList.remove('show');
        }
    });

    // ---------- Personal Info Form Save ----------
    document.getElementById('profileForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const first = document.getElementById('profileFirstName').value.trim();
        const last  = document.getElementById('profileLastName').value.trim();
        const fullName = `${first} ${last}`.trim() || 'User';
        const initials = (first[0] || '') + (last[0] || '');

        // Update avatar initials
        if (profileAvatar) profileAvatar.textContent = initials.toUpperCase();
        document.querySelectorAll('.avatar').forEach(el => {
            el.textContent = initials.toUpperCase();
        });

        // Update hero name + user-info
        const heroName = document.getElementById('profileHeroName');
        if (heroName) heroName.textContent = fullName;
        document.querySelectorAll('.user-name').forEach(el => {
            el.textContent = fullName;
        });

        // Save to localStorage
        localStorage.setItem('terrasync-profile', JSON.stringify({
            firstName: first, lastName: last,
            email: document.getElementById('profileEmail').value,
            phone: document.getElementById('profilePhone').value,
            location: document.getElementById('profileLocation').value,
            role: document.getElementById('profileRole').value,
            bio: document.getElementById('profileBio').value
        }));

        showToast('Profile saved successfully', 'success');
    });

    // Discard button restores saved values
    document.getElementById('profileDiscardBtn')?.addEventListener('click', () => {
        const saved = JSON.parse(localStorage.getItem('terrasync-profile') || 'null');
        if (saved) {
            document.getElementById('profileFirstName').value = saved.firstName || '';
            document.getElementById('profileLastName').value  = saved.lastName  || '';
            document.getElementById('profileEmail').value     = saved.email     || '';
            document.getElementById('profilePhone').value     = saved.phone     || '';
            document.getElementById('profileLocation').value  = saved.location  || '';
            document.getElementById('profileBio').value       = saved.bio       || '';
        }
        showToast('Changes discarded', 'info');
    });

    // ---------- Load saved profile on startup ----------
    (() => {
        const saved = JSON.parse(localStorage.getItem('terrasync-profile') || 'null');
        if (!saved) return;
        if (saved.firstName) document.getElementById('profileFirstName').value = saved.firstName;
        if (saved.lastName)  document.getElementById('profileLastName').value  = saved.lastName;
        if (saved.email)     document.getElementById('profileEmail').value     = saved.email;
        if (saved.phone)     document.getElementById('profilePhone').value     = saved.phone;
        if (saved.location)  document.getElementById('profileLocation').value  = saved.location;
        if (saved.bio)       document.getElementById('profileBio').value       = saved.bio;
        const full = `${saved.firstName || ''} ${saved.lastName || ''}`.trim();
        const initials = (saved.firstName?.[0] || '') + (saved.lastName?.[0] || '');
        if (profileAvatar && initials) profileAvatar.textContent = initials.toUpperCase();
        document.querySelectorAll('.avatar').forEach(el => {
            if (initials) el.textContent = initials.toUpperCase();
        });
        if (full) {
            document.querySelector('.user-name')?.childNodes.forEach?.(() => {});
            document.querySelectorAll('.user-name').forEach(el => el.textContent = full);
            const heroName = document.getElementById('profileHeroName');
            if (heroName) heroName.textContent = full;
        }
    })();

    // ---------- Password Show/Hide Toggles ----------
    document.querySelectorAll('.pw-toggle').forEach(btn => {
        btn.addEventListener('click', () => {
            const input = document.getElementById(btn.dataset.target);
            if (!input) return;
            const show = input.type === 'password';
            input.type = show ? 'text' : 'password';
            btn.querySelector('i').className = show ? 'fas fa-eye-slash' : 'fas fa-eye';
        });
    });

    // ---------- Password Strength Meter ----------
    document.getElementById('newPassword')?.addEventListener('input', (e) => {
        const pw = e.target.value;
        const bar = document.getElementById('passwordStrength');
        if (!bar) return;
        if (!pw) { bar.innerHTML = ''; return; }
        let score = 0;
        if (pw.length >= 8)                    score++;
        if (/[A-Z]/.test(pw))                  score++;
        if (/[0-9]/.test(pw))                  score++;
        if (/[^A-Za-z0-9]/.test(pw))           score++;
        const levels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
        const classes = ['', 'pw-weak', 'pw-fair', 'pw-good', 'pw-strong'];
        bar.innerHTML = `
            <div class="pw-bars">
                ${[1,2,3,4].map(i => `<div class="pw-bar ${i <= score ? classes[score] : ''}"></div>`).join('')}
            </div>
            <span class="pw-label ${classes[score]}">${levels[score]}</span>`;
    });

    // ---------- Security Form ----------
    document.getElementById('securityForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const np = document.getElementById('newPassword').value;
        const cp = document.getElementById('confirmPassword').value;
        if (!np) { showToast('Please enter a new password', 'warning'); return; }
        if (np.length < 8) { showToast('Password must be at least 8 characters', 'warning'); return; }
        if (np !== cp) { showToast('Passwords do not match', 'error'); return; }
        document.getElementById('currentPassword').value = '';
        document.getElementById('newPassword').value     = '';
        document.getElementById('confirmPassword').value = '';
        document.getElementById('passwordStrength').innerHTML = '';
        showToast('Password updated successfully', 'success');
    });

    // ---------- Preferences Tab ----------
    // Sync dark mode toggle with actual theme
    (() => {
        const prefDark = document.getElementById('prefDarkMode');
        if (prefDark) {
            prefDark.checked = html.getAttribute('data-theme') === 'dark';
            prefDark.addEventListener('change', () => {
                const next = prefDark.checked ? 'dark' : 'light';
                html.setAttribute('data-theme', next);
                localStorage.setItem('terrasync-theme', next);
                updateThemeIcon(next);
                updateChartTheme();
            });
        }

        // Temperature unit
        const prefTemp = document.getElementById('prefTempUnit');
        const savedUnit = localStorage.getItem('terrasync-temp-unit') || 'C';
        if (prefTemp) prefTemp.value = savedUnit;

        // Chart range default
        const prefCRange = document.getElementById('prefChartRange');
        const savedRange = localStorage.getItem('terrasync-default-range') || '24h';
        if (prefCRange) prefCRange.value = savedRange;

        // Refresh interval
        const prefInterval = document.getElementById('prefRefreshInterval');
        const savedInterval = localStorage.getItem('terrasync-refresh-interval') || '5000';
        if (prefInterval) prefInterval.value = savedInterval;
    })();

    document.getElementById('prefSaveBtn')?.addEventListener('click', () => {
        const unit     = document.getElementById('prefTempUnit')?.value || 'C';
        const range    = document.getElementById('prefChartRange')?.value || '24h';
        const interval = document.getElementById('prefRefreshInterval')?.value || '5000';
        const sound    = document.getElementById('prefAlertSound')?.checked ? '1' : '0';
        localStorage.setItem('terrasync-temp-unit',        unit);
        localStorage.setItem('terrasync-default-range',    range);
        localStorage.setItem('terrasync-refresh-interval', interval);
        localStorage.setItem('terrasync-alert-sound',      sound);
        showToast('Preferences saved', 'success');
    });

    console.log('🌱 TerraSync Dashboard loaded successfully');
    console.log('📡 Hardware: ESP32 30P (CP2102) | DHT22 | Capacitive Soil Moisture | YF-S201');
});
