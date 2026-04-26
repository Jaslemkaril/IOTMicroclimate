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
    // Use relative /api when served by the Express server itself (port 3000 or
    // production). Fall back to port 3000 only when running via a separate dev
    // server (e.g. VS Code Live Server on :5500).
    const API_BASE = window.location.port && window.location.port !== '3000'
        ? `${window.location.protocol}//${window.location.hostname}:3000/api`
        : `${window.location.protocol}//${window.location.host}/api`;
    let apiAvailable = false;

    // Check if backend is running
    async function checkApi() {
        try {
            const res = await fetch(API_BASE + '/health', { signal: AbortSignal.timeout(4000) });
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
                const stale = d.seconds_ago > 30; // No reading in last 30s = ESP32 offline
                if (stale) {
                    clearSensorUI();
                    return;
                }
                updateSensorUI(d.moisture, d.temperature, d.humidity, d.water_flow, d.moisture_1, d.moisture_2, d.moisture_3, d.moisture_4);
                const reading = {
                    moisture:    parseFloat(d.moisture),
                    temperature: parseFloat(d.temperature),
                    humidity:    parseFloat(d.humidity)
                };
                if (prevSensorReading) updateTrendArrows(reading, prevSensorReading);
                prevSensorReading = reading;
                updateSensorCardStatus(d.moisture, d.temperature, d.humidity);
            } else {
                clearSensorUI();
            }
        } catch (err) {
            console.warn('Sensor fetch failed:', err.message);
        }
    }

    function clearSensorUI() {
        ['moistureValue','tempValue','humidityValue','flowValue'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = '--';
        });
        ['moistureGauge','tempGauge','humidityGauge','flowGauge'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.width = '0%';
        });
        document.querySelectorAll('.last-update').forEach(el => {
            el.textContent = 'Waiting for ESP32...';
        });
        ['liveBadgeMoisture','liveBadgeTemp','liveBadgeHumidity','liveBadgeFlow'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });
    }

    // Update sensor card UI with real or simulated values
    function updateSensorUI(moisture, temperature, humidity, waterFlow, moisture_1, moisture_2, moisture_3, moisture_4) {
        const moistureEl = document.getElementById('moistureValue');
        const tempEl     = document.getElementById('tempValue');
        const humidityEl = document.getElementById('humidityValue');
        const flowEl     = document.getElementById('flowValue');

        if (moistureEl)  { moistureEl.textContent  = parseFloat(moisture).toFixed(0);    flashValue(moistureEl); }
        if (tempEl)      { tempEl.textContent      = parseFloat(temperature).toFixed(1); flashValue(tempEl); }
        if (humidityEl)  { humidityEl.textContent  = parseFloat(humidity).toFixed(0);    flashValue(humidityEl); }
        const flowNum = parseFloat(waterFlow);
        if (flowEl) {
            if (flowNum > 30) {
                // Physically impossible for this pump — firmware not yet reflashed
                flowEl.textContent = 'ERR';
                flowEl.title = `Raw value ${flowNum.toFixed(1)} L/min — reflash ESP32 firmware to fix`;
                flowEl.style.color = '#ef4444';
                flashValue(flowEl);
            } else {
                flowEl.textContent = flowNum.toFixed(1);
                flowEl.style.color = '';
                flowEl.title = '';
                flashValue(flowEl);
            }
        }

        // Update multi-zone moisture display
        updateMoistureZones(moisture_1, moisture_2, moisture_3, moisture_4);

        animateGauge('tempGauge', (temperature / 50) * 100);
        animateGauge('humidityGauge', humidity);
        animateGauge('flowGauge', Math.min((flowNum / 30) * 100, 100));

        document.querySelectorAll('.last-update').forEach(el => {
            el.textContent = 'Updated just now';
        });

        ['liveBadgeMoisture','liveBadgeTemp','liveBadgeHumidity','liveBadgeFlow'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'flex';
        });
    }

    // Update multi-zone moisture display
    function updateMoistureZones(m1, m2, m3, m4) {
        const zones = [
            { value: m1, bar: 'zoneBar1', text: 'zoneValue1', status: 'zoneStatus1' },
            { value: m2, bar: 'zoneBar2', text: 'zoneValue2', status: 'zoneStatus2' },
            { value: m3, bar: 'zoneBar3', text: 'zoneValue3', status: 'zoneStatus3' },
            { value: m4, bar: 'zoneBar4', text: 'zoneValue4', status: 'zoneStatus4' }
        ];

        let lowCount = 0;
        let validCount = 0;

        zones.forEach(zone => {
            const val = parseFloat(zone.value);
            const barEl = document.getElementById(zone.bar);
            const textEl = document.getElementById(zone.text);
            const statusEl = document.getElementById(zone.status);

            if (isNaN(val) || val === null) {
                // No data for this zone
                if (barEl) {
                    barEl.style.width = '0%';
                    barEl.className = 'zone-bar';
                }
                if (textEl) textEl.textContent = '—';
                if (statusEl) statusEl.textContent = '—';
                return;
            }

            validCount++;

            // Update bar
            if (barEl) {
                barEl.style.width = val + '%';
                if (val < 40) {
                    barEl.className = 'zone-bar low';
                    lowCount++;
                } else if (val >= 40 && val <= 60) {
                    barEl.className = 'zone-bar optimal';
                } else {
                    barEl.className = 'zone-bar high';
                }
            }

            // Update value
            if (textEl) {
                textEl.textContent = val.toFixed(0) + '%';
                flashValue(textEl);
            }

            // Update status icon
            if (statusEl) {
                if (val < 40) {
                    statusEl.textContent = '⚠️';
                    statusEl.title = 'Low moisture';
                } else if (val >= 40 && val <= 60) {
                    statusEl.textContent = '✓';
                    statusEl.title = 'Optimal';
                } else {
                    statusEl.textContent = '⚡';
                    statusEl.title = 'High moisture';
                }
            }
        });

        // Update summary
        const summaryEl = document.getElementById('zoneSummary');
        if (summaryEl && validCount > 0) {
            if (lowCount === 0) {
                summaryEl.className = 'zone-summary success';
                summaryEl.innerHTML = '<i class="fas fa-check-circle"></i><span>All zones optimal — no irrigation needed</span>';
            } else if (lowCount === validCount) {
                summaryEl.className = 'zone-summary warning';
                summaryEl.innerHTML = '<i class="fas fa-exclamation-triangle"></i><span>All zones need water — start irrigation immediately</span>';
            } else {
                summaryEl.className = 'zone-summary warning';
                const zoneNames = [];
                if (parseFloat(m1) < 40) zoneNames.push('A');
                if (parseFloat(m2) < 40) zoneNames.push('B');
                if (parseFloat(m3) < 40) zoneNames.push('C');
                if (parseFloat(m4) < 40) zoneNames.push('D');
                summaryEl.innerHTML = `<i class="fas fa-exclamation-triangle"></i><span>${lowCount} zone${lowCount > 1 ? 's' : ''} need attention — irrigate Zone${zoneNames.length > 1 ? 's' : ''} ${zoneNames.join(', ')}</span>`;
            }
        }
    }

    // Flash value element briefly on live update
    function flashValue(el) {
        el.classList.remove('value-updated');
        void el.offsetWidth; // force reflow
        el.classList.add('value-updated');
        el.addEventListener('animationend', () => el.classList.remove('value-updated'), { once: true });
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
    let chartLabels   = [];
    let moistureData  = [];
    let tempData      = [];
    let humidityData  = [];

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
    async function fetchChartData(range = 'live') {
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
                const labelEl = document.getElementById('chartRangeLabel');
                const rangeLabelMapLocal = { live: 'Live', '1h': '1 Hour', '24h': '24h', '7d': '7 Days' };
                if (labelEl) labelEl.textContent = rangeLabelMapLocal[range] || range;
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
    let liveChartInterval = null;
    const rangeLabelMap = { live: 'Live', '1h': '1 Hour', '24h': '24h', '7d': '7 Days' };

    function startLiveChartPolling() {
        if (liveChartInterval) return;
        liveChartInterval = setInterval(() => {
            if (apiAvailable) fetchChartData('live');
        }, 3000);
    }
    function stopLiveChartPolling() {
        clearInterval(liveChartInterval);
        liveChartInterval = null;
    }

    document.querySelectorAll('.chip[data-range]').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('.chip[data-range]').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            const range = chip.dataset.range;
            const labelEl = document.getElementById('chartRangeLabel');
            if (labelEl) labelEl.textContent = rangeLabelMap[range] || range;
            if (range === 'live') {
                startLiveChartPolling();
            } else {
                stopLiveChartPolling();
            }
            fetchChartData(range);
        });
    });
    // Start live polling by default
    startLiveChartPolling();

    // ---------- HEALTH DOUGHNUT CHART ----------
    const healthCtx = document.getElementById('healthChart')?.getContext('2d');
    let healthChart;

    // Default health data (overwritten by API when available)
    let fieldHealthData = [];

    // Fetch fields from MySQL and compute health scores
    async function fetchFieldHealth() {
        try {
            const res = await fetch(API_BASE + '/fields');
            const json = await res.json();
            if (json.success && json.data.length > 0) {
                const healthColors = ['#22c55e', '#16a34a', '#f59e0b', '#f97316', '#ef4444', '#8b5cf6'];
                // Only include fields that have real, fresh sensor data (within 30s)
                const liveFields = json.data.filter(f => f.seconds_ago !== null && f.seconds_ago <= 30);
                if (liveFields.length === 0) {
                    // ESP32 offline — show 0% health
                    fieldHealthData = [{ name: 'No Data', score: 0, color: '#4b5563' }];
                    rebuildHealthChart();
                    updateFieldTable(json.data);
                    return;
                }
                fieldHealthData = liveFields.map((f, i) => {
                    const t = f.temperature !== null && f.seconds_ago <= 30 ? parseFloat(f.temperature) : null;
                    const m = f.moisture    !== null && f.seconds_ago <= 30 ? parseFloat(f.moisture)    : null;
                    const h = f.humidity    !== null && f.seconds_ago <= 30 ? parseFloat(f.humidity)    : null;
                    // Score built entirely from live sensor readings
                    let score = 50; // neutral baseline
                    // Moisture: optimal 40-60%
                    if (m !== null) {
                        if (m >= 40 && m <= 60)       score += 20;
                        else if (m >= 30 && m < 40)   score += 10;
                        else if (m >= 60 && m <= 75)  score += 10;
                        else if (m < 20 || m > 85)    score -= 20;
                        else if (m < 30 || m > 75)    score -= 10;
                    }
                    // Temperature: optimal 20-30°C
                    if (t !== null) {
                        if (t >= 20 && t <= 30)  score += 20;
                        else if (t > 35)         score -= 25;
                        else if (t > 30)         score -= 10;
                        else if (t < 15)         score -= 15;
                    }
                    // Humidity: optimal 50-70%
                    if (h !== null) {
                        if (h >= 50 && h <= 70)  score += 10;
                        else if (h < 30 || h > 90) score -= 10;
                    }
                    score = Math.max(0, Math.min(100, score));
                    return {
                        name: `${f.name}`,
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
        if (!tbody) return;
        if (fields.length === 0) {
            tbody.innerHTML = '<tr class="empty-row"><td colspan="7" style="text-align:center;padding:32px;color:var(--text-muted);"><i class="fas fa-seedling" style="margin-right:8px;"></i>No fields yet \u2014 click <strong>+ Add Field</strong> to get started.</td></tr>';
            return;
        }
        tbody.innerHTML = fields.map(f => {
            const moisture = f.moisture !== null ? parseFloat(f.moisture).toFixed(0) : '\u2014';
            const temp     = f.temperature !== null ? parseFloat(f.temperature).toFixed(1) + '\u00b0C' : '\u2014';
            const hum      = f.humidity    !== null ? parseFloat(f.humidity).toFixed(0) + '%' : '\u2014';

            // Derive status from actual sensor values
            const tVal = f.temperature !== null ? parseFloat(f.temperature) : null;
            const mVal = f.moisture    !== null ? parseFloat(f.moisture)    : null;
            const hasData = tVal !== null || mVal !== null;

            let statusClass, statusLabel;
            if (!hasData) {
                statusClass = 'no-data'; statusLabel = 'No Data';
            } else if ((tVal !== null && tVal > 35) || (mVal !== null && mVal < 20)) {
                statusClass = 'critical'; statusLabel = tVal > 35 ? 'High Temp' : 'Dry';
            } else if ((tVal !== null && tVal > 30) || (mVal !== null && (mVal < 30 || mVal > 75))) {
                statusClass = 'warning';
                statusLabel = tVal !== null && tVal > 30 ? 'Warm' : mVal > 75 ? 'Overwatered' : 'Low Moisture';
            } else {
                statusClass = 'healthy'; statusLabel = 'Healthy';
            }

            const mDisplay = mVal !== null ? mVal : 0;
            const barColor = mDisplay > 65 ? 'bg-orange' : 'bg-green';
            return `<tr data-field-id="${f.id}" data-field-name="${f.name}" data-field-crop="${f.crop || ''}" data-field-icon="${f.crop_icon || 'fa-leaf'}">
                <td data-label="Field"><strong>${f.name}</strong></td>
                <td data-label="Crop"><i class="fas ${f.crop_icon || 'fa-leaf'}"></i> ${f.crop || 'N/A'}</td>
                <td data-label="Status"><span class="status-badge ${statusClass}">${statusLabel}</span></td>
                <td data-label="Moisture">
                    <div class="moisture-cell">
                        <div class="mini-bar"><div class="mini-fill fill-${moisture} ${barColor}" style="width:${Math.min(mDisplay,100)}%"></div></div>
                        <span class="moisture-val">${moisture}%</span>
                    </div>
                </td>
                <td data-label="Temperature" class="col-hide-sm">${temp}</td>
                <td data-label="Humidity" class="col-hide-sm">${hum}</td>
                <td data-label="Actions" class="field-actions-cell">
                    <button class="btn btn-xs btn-outline btn-details">Details</button>
                    <button class="btn btn-xs btn-edit" title="Edit plant"><i class="fas fa-pen"></i></button>
                </td>
            </tr>`;
        }).join('');
    }

    function rebuildHealthChart() {
        if (!healthCtx) return;

        if (healthChart) healthChart.destroy();

        const scoreEl = document.getElementById('healthScore');
        const heroHealth = document.getElementById('heroHealth');
        const legendContainer = document.getElementById('healthLegend');

        if (fieldHealthData.length === 0) {
            if (scoreEl) scoreEl.textContent = '\u2014';
            if (heroHealth) heroHealth.textContent = '\u2014';
            if (legendContainer) legendContainer.innerHTML = '<p style="text-align:center;color:var(--text-muted);font-size:13px;padding:16px 0;">No field data yet.</p>';
            return;
        }

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
        legendContainer.innerHTML = '';
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
        if (scoreEl) scoreEl.textContent = avgScore + '%';

        // Also update hero
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

    const TANK_CAPACITY_L = 7;
    const L_TO_GAL = 0.264172;  // 1 litre = 0.264172 US gallons (exact)

    let pumpOn = false;
    let waterTotal = 0;
    let pumpInterval = null;
    let pumpRuntimeSeconds = 0;
    let pumpRuntimeInterval = null;

    const TANK_RING_CIRCUMFERENCE = 2 * Math.PI * 50; // 314.16

    function updateTankUI(data) {
        const pct    = data.percent;
        const level  = data.level_liters;
        const status = data.status;
        const levelGal = level * L_TO_GAL;

        // SVG ring
        const ringFill = document.getElementById('tankRingFill');
        if (ringFill) {
            const offset = TANK_RING_CIRCUMFERENCE - (pct / 100) * TANK_RING_CIRCUMFERENCE;
            ringFill.style.strokeDashoffset = offset;
            ringFill.style.stroke =
                (status === 'empty' || status === 'critical') ? '#ef4444' :
                status === 'low'   ? '#f97316' :
                status === 'half'  ? '#facc15' :
                status === 'good'  ? '#22c55e' : '#38bdf8';
        }

        // Percentage text
        const pctEl = document.getElementById('tankPct');
        if (pctEl) pctEl.textContent = pct.toFixed(1) + '%';

        // L / capacity text
        const textEl = document.getElementById('tankText');
        if (textEl) textEl.textContent = level.toFixed(3) + ' / ' + data.capacity_liters + ' L';

        // Gallon sub-text in ring
        const galEl = document.getElementById('tankTextGal');
        if (galEl) galEl.textContent = levelGal.toFixed(3) + ' gal';

        // Remaining (L)
        const remEl = document.getElementById('tankRemaining');
        if (remEl) remEl.textContent = level.toFixed(3) + ' L';

        // Remaining (gal)
        const remGalEl = document.getElementById('tankRemainingGal');
        if (remGalEl) remGalEl.textContent = levelGal.toFixed(3) + ' gal';

        // Usable %
        const usableEl = document.getElementById('tankUsablePct');
        if (usableEl) usableEl.textContent = (data.usable_percent ?? pct).toFixed(1) + '%';

        // Last refill date
        const lastRefillEl = document.getElementById('tankLastRefill');
        if (lastRefillEl && data.last_refill) {
            const refillDate = new Date(data.last_refill);
            const now = new Date();
            const diffMs = now - refillDate;
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            
            if (diffDays > 0) {
                lastRefillEl.textContent = diffDays + ' day' + (diffDays > 1 ? 's' : '') + ' ago';
            } else if (diffHours > 0) {
                lastRefillEl.textContent = diffHours + ' hour' + (diffHours > 1 ? 's' : '') + ' ago';
            } else {
                lastRefillEl.textContent = 'Just now';
            }
        }

        // Progress bar
        const fill = document.getElementById('tankFill');
        if (fill) {
            fill.style.width = pct.toFixed(1) + '%';
            fill.classList.toggle('tank-low', pct <= 25);
            fill.classList.toggle('tank-mid', pct > 25 && pct <= 50);
        }

        // Status hint text
        const hintMap = { empty: 'Empty!', critical: 'Critical!', low: 'Low', half: 'Half', good: 'Good', full: 'Full' };
        const hintEl = document.getElementById('tankHint');
        if (hintEl) hintEl.textContent = hintMap[status] || 'Full';

        // Badge
        const badgeEl = document.getElementById('tankBadge');
        if (badgeEl) {
            badgeEl.textContent = status.toUpperCase();
            badgeEl.className   = 'tank-badge badge-' + status;
        }

        // Low-water banner
        const banner = document.getElementById('tankLowBanner');
        if (banner) banner.classList.toggle('visible', ['low', 'critical', 'empty'].includes(status));
    }

    async function fetchTankStatus() {
        try {
            const res  = await fetch(API_BASE + '/tank');
            const json = await res.json();
            if (json.success) updateTankUI(json.data);
        } catch { /* silent */ }
    }

    async function refillTank() {
        const btn = document.getElementById('tankRefillBtn');
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refilling...'; }
        try {
            const res  = await fetch(API_BASE + '/tank/reset', { method: 'POST' });
            const json = await res.json();
            if (json.success) {
                fetchTankStatus();
                fetchAlerts();
            }
        } catch { /* silent */ }
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-fill-drip"></i> Refill'; }
    }

    document.getElementById('tankRefillBtn')?.addEventListener('click', refillTank);

    async function fetchPumpToday() {
        try {
            const res  = await fetch(API_BASE + '/pump/today');
            const json = await res.json();
            if (json.success) {
                waterTotal = parseFloat(json.data.total_liters) || 0;
                const cycles = parseInt(json.data.cycles) || 0;
                const waterTotalGal = waterTotal * L_TO_GAL;
                
                if (totalWaterEl)  totalWaterEl.textContent  = waterTotal.toFixed(3) + ' L';
                const galEl = document.getElementById('totalWaterGal');
                if (galEl) galEl.textContent = waterTotalGal.toFixed(3) + ' gal';
                
                // Mirror into tank Used Today rows
                const usedLEl   = document.getElementById('tankUsedL');
                const usedGalEl = document.getElementById('tankUsedGal');
                const cyclesEl  = document.getElementById('tankCycles');
                
                if (usedLEl)   usedLEl.textContent   = waterTotal.toFixed(3) + ' L';
                if (usedGalEl) usedGalEl.textContent = waterTotalGal.toFixed(3) + ' gal';
                if (cyclesEl)  cyclesEl.textContent  = cycles;
                
                // Calculate consumption rate (L/hour)
                const now = new Date();
                const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                const hoursElapsed = (now - startOfDay) / (1000 * 60 * 60);
                const consumptionRate = hoursElapsed > 0 ? waterTotal / hoursElapsed : 0;
                
                const rateEl = document.getElementById('tankConsumptionRate');
                if (rateEl) rateEl.textContent = consumptionRate.toFixed(2) + ' L/hr';
                
                // Calculate estimated time until empty
                const tankRes = await fetch(API_BASE + '/tank');
                const tankJson = await tankRes.json();
                if (tankJson.success && consumptionRate > 0) {
                    const remaining = parseFloat(tankJson.data.level_liters);
                    const hoursRemaining = remaining / consumptionRate;
                    const timeEl = document.getElementById('tankTimeRemaining');
                    
                    if (timeEl) {
                        if (hoursRemaining > 24) {
                            timeEl.textContent = (hoursRemaining / 24).toFixed(1) + ' days';
                        } else if (hoursRemaining > 1) {
                            timeEl.textContent = hoursRemaining.toFixed(1) + ' hours';
                        } else {
                            timeEl.textContent = (hoursRemaining * 60).toFixed(0) + ' minutes';
                        }
                    }
                } else {
                    const timeEl = document.getElementById('tankTimeRemaining');
                    if (timeEl) timeEl.textContent = '—';
                }
            }
        } catch { /* silent */ }
    }

    // ========== CSV/PNG EXPORT & DATE COMPARISON ==========

    // Export pump events as CSV
    async function exportPumpCSV() {
        try {
            const today = new Date().toISOString().split('T')[0];
            const res = await fetch(`${API_BASE}/pump/events?startDate=${today}`);
            const json = await res.json();
            
            if (!json.success || !json.data.events.length) {
                showToast('No pump events found for today', 'warning');
                return;
            }

            // Build CSV content
            const headers = ['Date/Time', 'Action', 'Mode', 'Water Used (L)'];
            const rows = json.data.events.map(event => [
                new Date(event.created_at).toLocaleString(),
                event.action.toUpperCase(),
                event.mode,
                event.water_used_l.toFixed(3)
            ]);

            let csvContent = headers.join(',') + '\n';
            rows.forEach(row => {
                csvContent += row.map(cell => `"${cell}"`).join(',') + '\n';
            });

            // Add summary at the end
            csvContent += '\n';
            csvContent += `"Total Events","${json.data.totalEvents}"\n`;
            csvContent += `"Total Water Used (L)","${json.data.totalWaterUsed.toFixed(3)}"\n`;

            // Trigger download
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `terrasync-pump-data-${today}.csv`;
            link.click();
            URL.revokeObjectURL(link.href);

            showToast('CSV exported successfully', 'success');
        } catch (err) {
            console.error('CSV export error:', err);
            showToast('Failed to export CSV', 'danger');
        }
    }

    // Export chart as PNG
    function exportChartPNG() {
        try {
            if (!trendChart) {
                showToast('Chart not available', 'warning');
                return;
            }

            // Get chart canvas and convert to image
            const canvas = trendChart.canvas;
            const url = canvas.toDataURL('image/png');
            
            // Trigger download
            const link = document.createElement('a');
            link.href = url;
            link.download = `terrasync-chart-${new Date().toISOString().split('T')[0]}.png`;
            link.click();

            showToast('Chart exported as PNG', 'success');
        } catch (err) {
            console.error('PNG export error:', err);
            showToast('Failed to export PNG', 'danger');
        }
    }

    // Compare water consumption between two dates
    async function compareDates(date1, date2) {
        try {
            if (!date1 || !date2) {
                showToast('Please select both dates', 'warning');
                return;
            }

            // Fetch data for both dates
            const [res1, res2] = await Promise.all([
                fetch(`${API_BASE}/pump/events?startDate=${date1}`),
                fetch(`${API_BASE}/pump/events?startDate=${date2}`)
            ]);

            const [json1, json2] = await Promise.all([res1.json(), res2.json()]);

            if (!json1.success || !json2.success) {
                showToast('Failed to fetch comparison data', 'danger');
                return;
            }

            const data1 = json1.data;
            const data2 = json2.data;

            // Calculate differences
            const waterDiff = data1.totalWaterUsed - data2.totalWaterUsed;
            const eventsDiff = data1.totalEvents - data2.totalEvents;
            const cyclesDiff = data1.offEvents - data2.offEvents;

            // Display results
            const resultDiv = document.getElementById('comparisonResult');
            const statsDiv = document.getElementById('comparisonStats');

            if (resultDiv && statsDiv) {
                statsDiv.innerHTML = `
                    <div class="comparison-stat">
                        <span class="comparison-stat-label">${date1} Water Used</span>
                        <div class="comparison-stat-value">${data1.totalWaterUsed.toFixed(3)} L</div>
                    </div>
                    <div class="comparison-stat">
                        <span class="comparison-stat-label">${date2} Water Used</span>
                        <div class="comparison-stat-value">${data2.totalWaterUsed.toFixed(3)} L</div>
                    </div>
                    <div class="comparison-stat">
                        <span class="comparison-stat-label">Difference</span>
                        <div class="comparison-stat-value">${Math.abs(waterDiff).toFixed(3)} L</div>
                        <div class="comparison-stat-diff ${waterDiff > 0 ? 'positive' : 'negative'}">
                            <i class="fas fa-arrow-${waterDiff > 0 ? 'up' : 'down'}"></i>
                            ${waterDiff > 0 ? 'More' : 'Less'} than ${date2}
                        </div>
                    </div>
                    <div class="comparison-stat">
                        <span class="comparison-stat-label">Pump Cycles</span>
                        <div class="comparison-stat-value">${data1.offEvents} vs ${data2.offEvents}</div>
                        <div class="comparison-stat-diff ${cyclesDiff > 0 ? 'positive' : 'negative'}">
                            ${Math.abs(cyclesDiff)} ${cyclesDiff > 0 ? 'more' : 'fewer'} cycles
                        </div>
                    </div>
                `;
                resultDiv.style.display = 'block';
            }

            showToast('Comparison complete', 'success');
        } catch (err) {
            console.error('Date comparison error:', err);
            showToast('Failed to compare dates', 'danger');
        }
    }

    // Toast notification helper
    function showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'warning' ? 'exclamation-triangle' : type === 'danger' ? 'times-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;
        container.appendChild(toast);

        // Animate in
        setTimeout(() => toast.classList.add('show'), 10);

        // Remove after 3 seconds
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // Event listeners for export/comparison buttons
    document.getElementById('exportCSV')?.addEventListener('click', exportPumpCSV);
    document.getElementById('exportPNG')?.addEventListener('click', exportChartPNG);
    
    const compareBtn = document.getElementById('compareBtn');
    const compareModal = document.getElementById('compareModal');
    const compareClose = document.getElementById('compareClose');
    const runComparison = document.getElementById('runComparison');

    compareBtn?.addEventListener('click', () => {
        compareModal?.classList.add('show');
        // Set default dates (today and yesterday)
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        const date1Input = document.getElementById('compareDate1');
        const date2Input = document.getElementById('compareDate2');
        if (date1Input) date1Input.value = today.toISOString().split('T')[0];
        if (date2Input) date2Input.value = yesterday.toISOString().split('T')[0];
        
        // Hide previous results
        const resultDiv = document.getElementById('comparisonResult');
        if (resultDiv) resultDiv.style.display = 'none';
    });

    compareClose?.addEventListener('click', () => {
        compareModal?.classList.remove('show');
    });

    compareModal?.addEventListener('click', (e) => {
        if (e.target === compareModal) {
            compareModal.classList.remove('show');
        }
    });

    runComparison?.addEventListener('click', () => {
        const date1 = document.getElementById('compareDate1')?.value;
        const date2 = document.getElementById('compareDate2')?.value;
        compareDates(date1, date2);
    });

    // ========== END CSV/PNG EXPORT & DATE COMPARISON ==========

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

        // Update hardware panel relay/pump status immediately
        updateHardwareStatus(true, 0);

        // Notify backend
        if (apiAvailable) {
            const activeMode = 'manual';
            fetch(API_BASE + '/pump/toggle', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: on ? 'on' : 'off', mode: activeMode, field_id: 1 })
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    console.log(`✅ Pump ${on ? 'ON' : 'OFF'} command sent successfully`);
                } else {
                    console.error('❌ Pump toggle failed:', data.error);
                }
            })
            .catch(err => {
                console.warn('❌ Pump API call failed:', err.message);
            });
        }

        // Track water usage counter when pump is on
        if (on) {
            pumpInterval = setInterval(() => {
                waterTotal += 0.1;
                if (totalWaterEl) totalWaterEl.textContent = waterTotal.toFixed(1) + ' L';
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

    // Live updates — only poll when API is available
    setInterval(() => {
        if (apiAvailable) {
            fetchLatestSensors();
        }
    }, 5000);

    // ---------- FETCH ALERTS FROM API ----------
    async function fetchAlerts() {
        try {
            const res = await fetch(API_BASE + '/alerts?limit=10');
            const json = await res.json();
            const notifList  = document.getElementById('notifList');
            const alertsList = document.getElementById('alertsList');
            if (json.success && json.data.length > 0) {
                const iconMap = {
                    warning: 'fa-temperature-high',
                    danger:  'fa-triangle-exclamation',
                    info:    'fa-droplet',
                    success: 'fa-microchip'
                };

                // Populate dropdown
                if (notifList) {
                    notifList.innerHTML = json.data.map(a => {
                        const icon = iconMap[a.type] || 'fa-bell';
                        const timeAgo = getTimeAgo(new Date(a.created_at));
                        return `<div class="notif-item ${a.type} ${a.is_read ? '' : 'unread'}" data-alert-id="${a.id}">
                            <div class="alert-icon"><i class="fas ${icon}"></i></div>
                            <div class="alert-content">
                                <strong>${a.title}</strong>
                                <p>${a.message}</p>
                            </div>
                            <span class="alert-time">${timeAgo}</span>
                            <button class="notif-dismiss" title="Dismiss"><i class="fas fa-xmark"></i></button>
                        </div>`;
                    }).join('');
                }

                // Populate main-page Recent Alerts card
                if (alertsList) {
                    alertsList.innerHTML = json.data.map(a => {
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
            } else {
                if (notifList)  notifList.innerHTML  = '<div style="text-align:center;padding:24px 16px;color:var(--text-muted);font-size:13px;">No notifications.</div>';
                if (alertsList) alertsList.innerHTML = '<div class="empty-state-alerts" style="text-align:center;padding:32px;color:var(--text-muted);"><i class="fas fa-bell-slash" style="font-size:24px;display:block;margin-bottom:10px;"></i>No alerts yet.</div>';
                const badge = document.querySelector('.notification-btn .badge');
                if (badge) badge.style.display = 'none';
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

    // Clicking individual notification items marks them read; dismiss button removes them
    document.getElementById('notifList')?.addEventListener('click', async (e) => {
        const dismissBtn = e.target.closest('.notif-dismiss');
        if (dismissBtn) {
            const item = dismissBtn.closest('.notif-item');
            if (item) {
                const alertId = item.dataset.alertId;
                if (item.classList.contains('unread')) {
                    const badge = document.querySelector('.notification-btn .badge');
                    if (badge) {
                        const count = Math.max(0, parseInt(badge.textContent) - 1);
                        badge.textContent = count;
                        if (count === 0) badge.style.display = 'none';
                    }
                }
                item.remove();
                if (apiAvailable && alertId) {
                    try { await fetch(API_BASE + `/alerts/${alertId}/read`, { method: 'PUT' }); } catch {}
                }
                const notifList = document.getElementById('notifList');
                if (notifList && !notifList.querySelector('.notif-item')) {
                    notifList.innerHTML = '<div style="text-align:center;padding:24px 16px;color:var(--text-muted);font-size:13px;">No notifications.</div>';
                }
            }
            return;
        }

        const item = e.target.closest('.notif-item');
        if (item && item.classList.contains('unread')) {
            item.classList.remove('unread');
            const alertId = item.dataset.alertId;
            const badge = document.querySelector('.notification-btn .badge');
            if (badge) {
                const count = Math.max(0, parseInt(badge.textContent) - 1);
                badge.textContent = count;
                if (count === 0) badge.style.display = 'none';
            }
            if (apiAvailable && alertId) {
                try { await fetch(API_BASE + `/alerts/${alertId}/read`, { method: 'PUT' }); } catch {}
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
    // Event delegation for Details and Edit buttons (works for dynamically added rows too)
    document.getElementById('fieldTable')?.addEventListener('click', (e) => {
        const row = e.target.closest('tr');
        if (!row) return;

        // ── Edit button ──────────────────────────────
        if (e.target.closest('.btn-edit')) {
            const fieldId   = row.dataset.fieldId;
            const fieldName = row.dataset.fieldName;
            const fieldCrop = row.dataset.fieldCrop;
            const fieldIcon = row.dataset.fieldIcon;

            document.getElementById('editFieldId').value       = fieldId;
            document.getElementById('editFieldName').value     = fieldName;
            document.getElementById('editFieldCrop').value     = fieldCrop;
            document.getElementById('editFieldIcon').value     = fieldIcon;
            openModal('editFieldModal');
            return;
        }

        // ── Details button ───────────────────────────
        if (!e.target.closest('.btn-details')) return;

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

    // ---------- EDIT FIELD FORM SUBMIT ----------
    document.getElementById('editFieldForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id       = document.getElementById('editFieldId').value;
        const name     = document.getElementById('editFieldName').value.trim();
        const crop     = document.getElementById('editFieldCrop').value;
        const cropIcon = document.getElementById('editFieldIcon').value;

        if (!name) { showToast('Plant name is required', 'warning'); return; }

        try {
            const res  = await fetch(`${API_BASE}/fields/${id}`, {
                method:  'PUT',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({ name, crop, crop_icon: cropIcon })
            });
            const json = await res.json();
            if (json.success) {
                showToast(`"${name}" updated successfully!`, 'success');
                closeModal('editFieldModal');
                fetchFieldHealth(); // refresh table
            } else {
                showToast('Update failed: ' + json.error, 'error');
            }
        } catch (err) {
            showToast('API error: ' + err.message, 'error');
        }
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
            fetchChartData('live');
            fetchFieldHealth();
            setInterval(fetchFieldHealth, 15000);
            fetchAlerts();
            setInterval(fetchAlerts, 30000);
            fetchEsp32Status();
            setInterval(fetchEsp32Status, 15000);
            fetchPumpToday();
            fetchTankStatus();
            setInterval(fetchTankStatus, 15000);
        } else {
            rebuildHealthChart();
        }
    });

    // Auto-retry every 30s so the dashboard recovers if server was starting up
    setInterval(async () => {
        if (!apiAvailable) {
            const ok = await checkApi();
            if (ok) {
                setConnectionStatus('live');
                fetchLatestSensors();
                fetchChartData('live');
                fetchFieldHealth();
                fetchAlerts();
                fetchEsp32Status();
                setInterval(fetchEsp32Status, 15000);
                fetchPumpToday();
                fetchTankStatus();
            }
        }
    }, 30000);



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

    // ---------- ESP32 STATUS ----------
    async function fetchEsp32Status() {
        try {
            const res  = await fetch(API_BASE + '/sensors/esp32-status', { signal: AbortSignal.timeout(3000) });
            const json = await res.json();
            updateEsp32UI(json.connected, json.secondsAgo);
            updateHardwareStatus(json.connected, json.secondsAgo);
        } catch {
            updateEsp32UI(false, null);
            updateHardwareStatus(false, null);
        }
    }

    function updateEsp32UI(connected, secondsAgo) {        // Topbar badge
        const badge = document.getElementById('esp32Badge');
        const dot   = document.getElementById('esp32Dot');
        const label = document.getElementById('esp32Label');
        if (badge) badge.className = 'esp32-badge ' + (connected ? 'esp32-online' : 'esp32-offline');
        if (dot)   dot.className   = 'esp32-dot '   + (connected ? 'online' : 'offline');
        if (label) {
            if (connected) {
                label.textContent = 'ESP32 Online';
            } else if (secondsAgo !== null) {
                const mins = Math.floor(secondsAgo / 60);
                label.textContent = mins < 60 ? `ESP32 — ${mins}m ago` : 'ESP32 Offline';
            } else {
                label.textContent = 'ESP32 Offline';
            }
        }
        // Show/hide sensor live badges
        ['liveBadgeMoisture','liveBadgeTemp','liveBadgeHumidity','liveBadgeFlow'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = connected ? 'flex' : 'none';
        });
        // Sidebar footer dot
        const sidebarDot   = document.querySelector('.device-status .status-dot');
        const sidebarLabel = document.querySelector('.device-status span');
        if (sidebarDot)   sidebarDot.className   = 'status-dot ' + (connected ? 'online' : 'offline');
        if (sidebarLabel) {
            if (connected) {
                sidebarLabel.textContent = 'ESP32 Connected';
            } else if (secondsAgo !== null) {
                const mins = Math.floor(secondsAgo / 60);
                sidebarLabel.textContent = mins < 60 ? `ESP32 — last seen ${mins}m ago` : 'ESP32 Disconnected';
            } else {
                sidebarLabel.textContent = 'ESP32 Disconnected';
            }
        }
    }

    // ---------- HARDWARE COMPONENT STATUS ----------
    function updateHardwareStatus(esp32Connected, secondsAgo) {
        function setHw(id, cssClass, label) {
            const el = document.getElementById(id);
            if (!el) return;
            el.className = 'hw-status ' + cssClass;
            el.textContent = label;
            // Colorize the hw-icon based on status
            const hwIcon = el.closest('.hw-item')?.querySelector('.hw-icon');
            if (hwIcon) {
                if (cssClass === 'online') {
                    hwIcon.style.background = 'rgba(34, 197, 94, 0.12)';
                    hwIcon.style.color = '#16a34a';
                } else if (cssClass === 'warning') {
                    hwIcon.style.background = 'rgba(245, 158, 11, 0.12)';
                    hwIcon.style.color = '#d97706';
                } else {
                    hwIcon.style.background = '';
                    hwIcon.style.color = '';
                }
            }
        }

        // ESP32
        if (esp32Connected) {
            setHw('hwStatusEsp32', 'online', 'Online');
        } else if (secondsAgo !== null) {
            const mins = Math.floor(secondsAgo / 60);
            setHw('hwStatusEsp32', 'offline', mins < 60 ? `Offline (${mins}m ago)` : 'Offline');
        } else {
            setHw('hwStatusEsp32', 'offline', 'Offline');
        }

        // Sensors — active only when ESP32 is connected and posting
        if (esp32Connected) {
            setHw('hwStatusMoisture', 'online', 'Active');
            setHw('hwStatusDht',      'online', 'Active');
            setHw('hwStatusFlow',     'warning', 'Standby');
        } else {
            setHw('hwStatusMoisture', 'offline', 'No signal');
            setHw('hwStatusDht',      'offline', 'No signal');
            setHw('hwStatusFlow',     'offline', 'No signal');
        }

        // Relay and pump follow pump state
        setHw('hwStatusRelay', pumpOn ? 'online' : 'offline', pumpOn ? 'Relay ON' : 'Standby');
        setHw('hwStatusPump',  pumpOn ? 'online' : 'offline', pumpOn ? 'Running'  : 'Off');
    }

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

    // ---------- PNG IMAGE EXPORT ----------
    document.getElementById('exportImgBtn')?.addEventListener('click', () => {
        const chartCanvas = document.getElementById('trendChart');
        if (!chartCanvas) return;

        const range          = document.querySelector('.chip[data-range].active')?.dataset.range || 'live';
        const rangeLabelMap2 = { live: 'Live (last 60 readings)', '1h': 'Last 1 Hour', '24h': 'Last 24 Hours', '7d': 'Last 7 Days' };
        const rangeLabel     = rangeLabelMap2[range] || range;
        const now            = new Date();
        const timestamp      = now.toLocaleString('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'full', timeStyle: 'medium' });

        // Collect latest sensor values from DOM
        const moisture = document.getElementById('moistureValue')?.textContent || '--';
        const temp     = document.getElementById('tempValue')?.textContent     || '--';
        const humidity = document.getElementById('humidityValue')?.textContent || '--';
        const flow     = document.getElementById('flowValue')?.textContent     || '--';

        const W         = Math.max(chartCanvas.width, 900);
        const HEADER    = 90;
        const FOOTER    = 64;
        const SIDEBAR   = 180;
        const CHART_H   = Math.round(W * 0.42);
        const H         = HEADER + CHART_H + FOOTER;

        const out = document.createElement('canvas');
        out.width  = W + SIDEBAR;
        out.height = H;
        const ctx  = out.getContext('2d');

        // ── White background ─────────────────────────────────
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, out.width, out.height);

        // ── Green header banner ───────────────────────────────
        const grad = ctx.createLinearGradient(0, 0, W + SIDEBAR, 0);
        grad.addColorStop(0, '#166534');
        grad.addColorStop(1, '#15803d');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, out.width, HEADER);

        // Logo text
        ctx.fillStyle = '#ffffff';
        ctx.font      = 'bold 22px Arial, sans-serif';
        ctx.fillText('🌿 TerraSync', 20, 32);

        ctx.fillStyle = '#bbf7d0';
        ctx.font      = '13px Arial, sans-serif';
        ctx.fillText('Smart IoT Precision Farming Dashboard', 20, 52);

        // Report title (right-aligned)
        ctx.textAlign = 'right';
        ctx.fillStyle = '#ffffff';
        ctx.font      = 'bold 15px Arial, sans-serif';
        ctx.fillText(`Sensor Trends Report`, W + SIDEBAR - 20, 30);
        ctx.fillStyle = '#bbf7d0';
        ctx.font      = '12px Arial, sans-serif';
        ctx.fillText(`Range: ${rangeLabel}`, W + SIDEBAR - 20, 50);
        ctx.fillText(`Field: Jaslem Farm`, W + SIDEBAR - 20, 68);
        ctx.textAlign = 'left';

        // ── Draw chart ────────────────────────────────────────
        const chartY = HEADER + 8;
        // Light grey chart background
        ctx.fillStyle = '#f0fdf4';
        ctx.fillRect(0, chartY - 8, W, CHART_H + 16);
        ctx.drawImage(chartCanvas, 0, chartY, W, CHART_H);

        // ── Sidebar: Current Readings ─────────────────────────
        const sbX = W;
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(sbX, HEADER, SIDEBAR, H - HEADER);

        // Sidebar border
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth   = 1;
        ctx.beginPath();
        ctx.moveTo(sbX, HEADER);
        ctx.lineTo(sbX, H);
        ctx.stroke();

        ctx.fillStyle = '#1e293b';
        ctx.font      = 'bold 12px Arial, sans-serif';
        ctx.fillText('Current Readings', sbX + 12, HEADER + 24);

        ctx.fillStyle = '#94a3b8';
        ctx.font      = '10px Arial, sans-serif';
        ctx.fillText('Live sensor values', sbX + 12, HEADER + 38);

        // Divider
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(sbX + 12, HEADER + 44, SIDEBAR - 24, 1);

        const readings = [
            { label: 'Soil Moisture', value: moisture + ' %',   color: '#3b82f6', icon: '💧' },
            { label: 'Temperature',   value: temp     + ' °C',  color: '#ef4444', icon: '🌡' },
            { label: 'Humidity',      value: humidity + ' %',   color: '#06b6d4', icon: '💨' },
            { label: 'Water Flow',    value: flow     + ' L/m', color: '#8b5cf6', icon: '🚿' },
        ];

        readings.forEach((r, i) => {
            const ry = HEADER + 58 + i * 52;
            // Card background
            ctx.fillStyle = '#ffffff';
            roundRect(ctx, sbX + 10, ry, SIDEBAR - 20, 44, 6);
            ctx.fill();
            ctx.strokeStyle = r.color + '40';
            ctx.lineWidth   = 1.5;
            roundRect(ctx, sbX + 10, ry, SIDEBAR - 20, 44, 6);
            ctx.stroke();

            // Color accent bar
            ctx.fillStyle = r.color;
            roundRect(ctx, sbX + 10, ry, 4, 44, 2);
            ctx.fill();

            // Icon + label
            ctx.fillStyle = '#64748b';
            ctx.font      = '10px Arial, sans-serif';
            ctx.fillText(r.icon + ' ' + r.label, sbX + 20, ry + 16);

            // Value
            ctx.fillStyle = r.color;
            ctx.font      = 'bold 15px Arial, sans-serif';
            ctx.fillText(r.value, sbX + 20, ry + 33);
        });

        // ── Legend ────────────────────────────────────────────
        const legendItems = [
            { label: 'Moisture (%)',      color: '#3b82f6' },
            { label: 'Temperature (°C)',  color: '#ef4444' },
            { label: 'Humidity (%)',      color: '#06b6d4' },
        ];
        const legendY = HEADER + CHART_H + 20;
        ctx.fillStyle = '#475569';
        ctx.font      = 'bold 11px Arial, sans-serif';
        ctx.fillText('LEGEND:', 20, legendY + 4);

        legendItems.forEach((item, i) => {
            const lx = 90 + i * 160;
            ctx.fillStyle = item.color;
            ctx.fillRect(lx, legendY - 8, 28, 10);
            ctx.fillStyle = '#1e293b';
            ctx.font      = '11px Arial, sans-serif';
            ctx.fillText(item.label, lx + 34, legendY + 2);
        });

        // ── Footer ────────────────────────────────────────────
        const footerY = H - FOOTER + 10;
        ctx.fillStyle = '#f1f5f9';
        ctx.fillRect(0, footerY - 10, out.width, FOOTER + 10);
        ctx.fillStyle = '#94a3b8';
        ctx.font      = '10px Arial, sans-serif';
        ctx.fillText(`Generated: ${timestamp}`, 20, footerY + 10);
        ctx.fillText('TerraSync — Smart IoT Precision Farming System', 20, footerY + 26);
        ctx.textAlign = 'right';
        ctx.fillText('Optimal Moisture: 40–60%   |   Optimal Temp: 20–30°C   |   Optimal Humidity: 50–70%', out.width - SIDEBAR - 10, footerY + 10);
        ctx.fillText('Printed from localhost:3000', out.width - 20, footerY + 26);
        ctx.textAlign = 'left';

        // ── Download ──────────────────────────────────────────
        const a      = document.createElement('a');
        a.href       = out.toDataURL('image/png');
        a.download   = `jaslem-farm-${range}-${now.toISOString().slice(0,10)}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        showToast(`Chart saved as PNG (${rangeLabel})`, 'success');
    });

    function roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }



    // ---------- CSV EXPORT (dropdown) ----------
    const csvWrap = document.getElementById('csvWrap');
    const csvMenu = document.getElementById('csvMenu');

    document.getElementById('exportCsvBtn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        csvMenu?.classList.toggle('open');
    });
    document.addEventListener('click', () => csvMenu?.classList.remove('open'));

    async function downloadCsv(range) {
        try {
            const res  = await fetch(`${API_BASE}/sensors/history?field_id=1&range=${range}`);
            const json = await res.json();
            if (!json.success || !json.data.length) { showToast('No data for this period', 'warning'); return; }
            const header = 'Time,Moisture (%),Temperature (°C),Humidity (%),Water Flow (L/min)';
            const rows = json.data.map(r =>
                `${r.label},${r.moisture ?? ''},${r.temperature ?? ''},${r.humidity ?? ''},${r.water_flow ?? ''}`
            );
            const csv  = [header, ...rows].join('\n');
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url  = URL.createObjectURL(blob);
            const a    = document.createElement('a');
            a.href     = url;
            const rangeNames = { '1h': 'this-hour', '24h': 'today', '7d': 'this-week' };
            a.download = `jaslem-farm-${rangeNames[range] || range}-${new Date().toISOString().slice(0,10)}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showToast(`CSV downloaded (${rangeLabelMap[range] || range})`, 'success');
        } catch { showToast('CSV export failed', 'danger'); }
        csvMenu?.classList.remove('open');
    }

    document.querySelectorAll('.csv-opt').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            downloadCsv(btn.dataset.csvRange);
        });
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
