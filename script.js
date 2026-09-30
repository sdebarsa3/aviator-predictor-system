// Prediction History Storage
class PredictionHistory {
    constructor() {
        this.predictions = JSON.parse(localStorage.getItem('aviatorPredictions')) || [];
    }

    add(prediction) {
        this.predictions.unshift(prediction);
        if (this.predictions.length > 20) {
            this.predictions.pop();
        }
        this.save();
    }

    getAll() {
        return this.predictions;
    }

    save() {
        localStorage.setItem('aviatorPredictions', JSON.stringify(this.predictions));
    }

    clear() {
        this.predictions = [];
        this.save();
    }
}

// Aviator Prediction Algorithm
class AviatorPredictor {
    constructor() {
        this.minMultiplier = 1.0;
        this.maxMultiplier = 15.0;
    }

    // Generate hash from server number
    generateHash(serverNumber) {
        let hash = 0;
        const str = serverNumber.toString();
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash);
    }

    // Predict multiplier based on server number
    predict(serverNumber) {
        if (!serverNumber || serverNumber < 1 || serverNumber > 1000) {
            throw new Error('Server number must be between 1 and 1000');
        }

        const hash = this.generateHash(serverNumber);
        
        // Generate pseudo-random value using hash
        const random1 = (Math.sin(hash) * 10000) % 1;
        const random2 = (Math.cos(hash * 2) * 10000) % 1;
        const random3 = (Math.tan(hash * 3) * 10000) % 1;
        
        // Combine random values
        const combined = (random1 + random2 + random3) / 3;
        
        // Apply non-linear transformation for better distribution
        const transformed = Math.pow(combined, 0.6);
        
        // Map to multiplier range
        const multiplier = this.minMultiplier + (transformed * (this.maxMultiplier - this.minMultiplier));
        
        // Round to 2 decimal places
        const roundedMultiplier = Math.round(multiplier * 100) / 100;

        // Calculate confidence based on server number patterns
        const confidence = this.calculateConfidence(serverNumber, hash, roundedMultiplier);

        // Determine signal type
        const signalType = this.determineSignalType(roundedMultiplier, confidence);

        return {
            multiplier: roundedMultiplier,
            confidence: confidence,
            hash: hash.toString(16).substring(0, 12).toUpperCase(),
            signalType: signalType,
            timestamp: new Date().toLocaleTimeString(),
            serverNumber: serverNumber
        };
    }

    // Calculate confidence percentage (0-100)
    calculateConfidence(serverNumber, hash, multiplier) {
        // Base confidence from hash distribution
        const hashConfidence = (Math.abs(Math.sin(hash)) * 100);
        
        // Adjust based on multiplier position in range
        const multiplierNormalized = (multiplier - this.minMultiplier) / (this.maxMultiplier - this.minMultiplier);
        const multiplierConfidence = 50 + (Math.abs(0.5 - multiplierNormalized) * 100);
        
        // Server number pattern confidence
        const serverPattern = serverNumber % 10;
        const patternConfidence = 50 + (Math.abs(5 - serverPattern) * 5);
        
        // Combine all factors
        let combined = (hashConfidence * 0.4) + (multiplierConfidence * 0.35) + (patternConfidence * 0.25);
        
        // Clamp between 50-95 for realistic confidence
        combined = Math.max(50, Math.min(95, combined));
        
        return Math.round(combined);
    }

    // Determine signal type based on prediction
    determineSignalType(multiplier, confidence) {
        if (confidence >= 80) {
            if (multiplier < 3) return 'STRONG BUY';
            if (multiplier < 7) return 'BUY';
            return 'HOLD';
        } else if (confidence >= 65) {
            if (multiplier < 5) return 'BUY';
            return 'NEUTRAL';
        } else {
            return 'WEAK SIGNAL';
        }
    }
}

// UI Manager
class UIManager {
    constructor() {
        this.serverInput = document.getElementById('serverNumber');
        this.predictBtn = document.getElementById('predictBtn');
        this.resultsSection = document.getElementById('resultsSection');
        this.multiplierValue = document.getElementById('multiplierValue');
        this.confidencePercentage = document.getElementById('confidencePercentage');
        this.confidenceFill = document.getElementById('confidenceFill');
        this.confidenceLabel = document.getElementById('confidenceLabel');
        this.serverHash = document.getElementById('serverHash');
        this.signalType = document.getElementById('signalType');
        this.timestamp = document.getElementById('timestamp');
        this.riskIndicator = document.getElementById('riskIndicator');
        this.historyList = document.getElementById('historyList');
        this.copyBtn = document.getElementById('copyBtn');
        this.newPredictionBtn = document.getElementById('newPredictionBtn');
        
        this.predictor = new AviatorPredictor();
        this.history = new PredictionHistory();
        
        this.setupEventListeners();
        this.renderHistory();
    }

    setupEventListeners() {
        this.predictBtn.addEventListener('click', () => this.handlePredict());
        this.serverInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handlePredict();
            }
        });
        this.copyBtn.addEventListener('click', () => this.handleCopy());
        this.newPredictionBtn.addEventListener('click', () => this.handleNewPrediction());
    }

    handlePredict() {
        const serverNumber = parseInt(this.serverInput.value);

        if (!serverNumber || isNaN(serverNumber)) {
            this.showError('Please enter a valid server number');
            return;
        }

        if (serverNumber < 1 || serverNumber > 1000) {
            this.showError('Server number must be between 1 and 1000');
            return;
        }

        try {
            const prediction = this.predictor.predict(serverNumber);
            this.displayPrediction(prediction);
            this.history.add(prediction);
            this.renderHistory();
        } catch (error) {
            this.showError(error.message);
        }
    }

    displayPrediction(prediction) {
        // Animate multiplier value
        this.animateValue(this.multiplierValue, 0, prediction.multiplier, 1000, (val) => {
            return val.toFixed(2) + 'x';
        });

        // Animate confidence bar
        this.animateValue(this.confidencePercentage, 0, prediction.confidence, 1000, (val) => {
            this.confidenceFill.style.width = val + '%';
            return Math.round(val) + '%';
        });

        // Update other fields
        this.serverHash.textContent = prediction.hash;
        this.signalType.textContent = prediction.signalType;
        this.timestamp.textContent = prediction.timestamp;

        // Update confidence label
        this.updateConfidenceLabel(prediction.confidence);

        // Update risk indicator
        this.updateRiskIndicator(prediction.multiplier, prediction.confidence);

        // Show results section
        this.resultsSection.style.display = 'block';
        this.resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    animateValue(element, start, end, duration, callback) {
        const range = end - start;
        const increment = range / (duration / 16);
        let current = start;

        const animate = () => {
            current += increment;
            if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
                current = end;
                element.textContent = callback(current);
            } else {
                element.textContent = callback(current);
                requestAnimationFrame(animate);
            }
        };

        animate();
    }

    updateConfidenceLabel(confidence) {
        if (confidence >= 85) {
            this.confidenceLabel.textContent = '✅ Very High Confidence - Strong Signal';
        } else if (confidence >= 75) {
            this.confidenceLabel.textContent = '✅ High Confidence - Good Signal';
        } else if (confidence >= 65) {
            this.confidenceLabel.textContent = '⚠️ Moderate Confidence - Neutral Signal';
        } else {
            this.confidenceLabel.textContent = '⚠️ Low Confidence - Weak Signal';
        }
    }

    updateRiskIndicator(multiplier, confidence) {
        const riskLevel = this.calculateRiskLevel(multiplier, confidence);
        
        const riskItems = this.riskIndicator.querySelectorAll('.risk-item');
        riskItems.forEach((item, index) => {
            const bar = item.querySelector('.risk-bar');
            if (index === riskLevel) {
                bar.style.opacity = '1';
                bar.style.boxShadow = '0 0 15px rgba(0, 212, 255, 0.5)';
            } else {
                bar.style.opacity = '0.3';
                bar.style.boxShadow = 'none';
            }
        });
    }

    calculateRiskLevel(multiplier, confidence) {
        // 0 = Low Risk, 1 = Medium Risk, 2 = High Risk
        if (confidence >= 75 && multiplier < 5) {
            return 0; // Low risk
        } else if (confidence >= 65 && multiplier < 10) {
            return 1; // Medium risk
        } else {
            return 2; // High risk
        }
    }

    renderHistory() {
        const predictions = this.history.getAll();
        
        if (predictions.length === 0) {
            this.historyList.innerHTML = '<p class="empty-history">No predictions yet</p>';
            return;
        }

        this.historyList.innerHTML = predictions.map((pred, index) => `
            <div class="history-item">
                <div>
                    <div class="history-item-multiplier">${pred.multiplier}x</div>
                    <div class="history-item-confidence">Server #${pred.serverNumber} | ${pred.signalType}</div>
                </div>
                <div class="history-item-time">${pred.timestamp}</div>
                <div style="font-weight: bold; color: #00d4ff;">${pred.confidence}%</div>
            </div>
        `).join('');
    }

    handleCopy() {
        const serverNumber = this.serverInput.value;
        const multiplier = this.multiplierValue.textContent;
        const confidence = this.confidencePercentage.textContent;
        const signalType = this.signalType.textContent;

        const text = `🎯 Aviator Predictor Signal\n\nServer: #${serverNumber}\nPredicted: ${multiplier}\nConfidence: ${confidence}\nSignal: ${signalType}`;
        
        navigator.clipboard.writeText(text).then(() => {
            this.copyBtn.textContent = '✅ Copied!';
            setTimeout(() => {
                this.copyBtn.textContent = '📋 Copy Prediction';
            }, 2000);
        });
    }

    handleNewPrediction() {
        this.serverInput.value = '';
        this.serverInput.focus();
        this.resultsSection.style.display = 'none';
    }

    showError(message) {
        alert('⚠️ ' + message);
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new UIManager();
    console.log('🎯 Aviator Predictor System initialized successfully');
});
