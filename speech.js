class Speech {
    static #lock = Promise.resolve();
    static #visualCue = null;
    static #cueTimeoutId = null;
    static #synthesis = window.speechSynthesis;
    static #Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    static #loadStyles(){
        if(document.getElementById('speech-styles')) return;
        const addStyles = ((c,D)=>{const s=D.createElement('style');s.type='text/css';s.styleSheet?s.styleSheet.cssText=c:s.appendChild(D.createTextNode(c));D.head.appendChild(s);return s;});
        const s = addStyles(`
            .speech-cue { position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); background-color: rgba(0, 0, 0, 0.75); color: white; padding: 12px 24px; border-radius: 9999px; font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif; font-size: 16px; z-index: 1000; display: none; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); transition: opacity 0.3s ease, background-color 0.3s ease; }
            .speech-cue-error { background-color: #b91c1c; }
            .speech-cue-success { background-color: #16a34a; }
            .speech-cue::after { content: ''; position: absolute; bottom: 0; left: 0; height: 100%; background-color: rgba(255, 255, 255, 0.2); width: 100%; transform-origin: left; transform: scaleX(var(--timeout-progress, 0)); transition: transform 0.05s linear; }
        `, document);
        s.setAttribute('id', 'speech-styles');
    }

    static #createVisualCue(message, { isError = false, isSuccess = false } = {}) {
        if (this.#cueTimeoutId) {
            clearTimeout(this.#cueTimeoutId);
            this.#cueTimeoutId = null;
        }

        if (!this.#visualCue) {
            this.#visualCue = document.createElement("div");
            this.#visualCue.className = "speech-cue";
            document.body.appendChild(this.#visualCue);
        }
        this.#visualCue.textContent = message;
        this.#visualCue.style.display = 'block';
        
        this.#visualCue.classList.toggle('speech-cue-error', isError);
        this.#visualCue.classList.toggle('speech-cue-success', isSuccess);
    }

    static #removeVisualCue() {
        if (this.#visualCue) {
            this.#visualCue.style.display = 'none';
        }
    }
    
    static async #checkPermissions() {
        // 1. Check for basic API support first.
        if (!this.#synthesis || !this.#Recognition) {
            this.#createVisualCue('Speech APIs not supported by this browser.', { isError: true });
            this.#cueTimeoutId = setTimeout(() => this.#removeVisualCue(), 5000);
            return false;
        }

        if (!navigator.permissions) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                stream.getTracks().forEach(track => track.stop());
                return true;
            } catch (err) {
                this.#createVisualCue('Microphone access denied.', { isError: true });
                this.#cueTimeoutId = setTimeout(() => this.#removeVisualCue(), 5000);
                return false;
            }
        }

        const permissionStatus = await navigator.permissions.query({ name: 'microphone' });

        if (permissionStatus.state === 'granted') {
            return true;
        }

        if (permissionStatus.state === 'denied') {
            this.#createVisualCue('Microphone access denied. Please grant permission in browser settings.', { isError: true });
            this.#cueTimeoutId = setTimeout(() => this.#removeVisualCue(), 5000);
            return false;
        }

        if (permissionStatus.state === 'prompt') {
            this.#createVisualCue('Please grant microphone access in the browser prompt.');
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                stream.getTracks().forEach(track => track.stop());
                this.#removeVisualCue();
                return true;
            } catch (err) {
                this.#createVisualCue('Microphone access denied.', { isError: true });
                this.#cueTimeoutId = setTimeout(() => this.#removeVisualCue(), 5000);
                return false;
            }
        }
    }

    static async #acquireLock() {
        const currentLock = this.#lock;
        let releaseLock;
        this.#lock = new Promise((resolve) => {
            releaseLock = resolve;
        });
        await currentLock;
        return releaseLock;
    }

    static async speak(text, lang = "en-US") {
        const releaseLock = await this.#acquireLock();
        this.#createVisualCue('Speaking…');
        try {
            await new Promise((resolve, reject) => {
                if (this.#synthesis.speaking) this.#synthesis.cancel();
                const utterance = new SpeechSynthesisUtterance(text);
                utterance.lang = lang;
                utterance.onend = resolve;
                utterance.onerror = (event) => reject(new Error(`SpeechSynthesis Error: ${event.error}`));
                this.#synthesis.speak(utterance);
            });
        } finally {
            this.#removeVisualCue();
            releaseLock();
        }
    }

    static async listen(triggerText, lang = "en-US", timeout = 10000) {
        const releaseLock = await this.#acquireLock();
        let progressInterval = null;
        let detections = 0;
        
        try {
            const hasPermission = await this.#checkPermissions();
            if (hasPermission) this.#createVisualCue('Listening…');
            const cueElement = this.#visualCue;
            const startTime = Date.now();

            progressInterval = setInterval(() => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / timeout, 1);
                if (cueElement) {
                    cueElement.style.setProperty('--timeout-progress', progress);
                }
            }, 50);

            let recognition;

            return await new Promise((resolve, reject) => {
                recognition = new this.#Recognition();
                recognition.lang = lang;
                recognition.continuous = true;
                recognition.interimResults = false;

                let timeoutHandle = null;

                const finalize = async (result) => {
                    if (progressInterval) clearInterval(progressInterval);
                    progressInterval = null;
                    if (timeoutHandle) clearTimeout(timeoutHandle);
                    if (recognition) {
                        recognition.onresult = null;
                        recognition.onerror = null;
                        recognition.onend = null;
                        recognition.stop();
                        recognition = null;
                    }
                    
                    const message = result ? "Trigger matched!" : "No match found.";
                    this.#createVisualCue(message, { isSuccess: result, isError: !result });
                    await new Promise(r => setTimeout(r, 2500));
                    
                    resolve(result);
                };

                timeoutHandle = setTimeout(() => {
                    finalize(detections?false:null);
                }, timeout);

                recognition.onresult = (event) => {
                    const transcript = event.results[event.results.length - 1][0].transcript.trim().toLowerCase();
                    const triggers = Array.isArray(triggerText) ? triggerText.map(t => t.toLowerCase()) : [triggerText.toLowerCase()];
                    const triggerFound = triggers.some(trigger => transcript.includes(trigger));
                    detections ++;
                    if (triggerFound) {
                        finalize(true);
                    }
                };

                recognition.onerror = (event) => { 
                    return; // apparently there is no need to do anything in this case. We have succesfully tranfered this problem to the user.
                    if (event.error !== 'no-speech' && event.error !== 'aborted') {
                        reject(new Error(`SpeechSynthesis Error: ${event.error}`));
                    }
                };

                recognition.onend = () => {
                    if (recognition) recognition.start();
                };

                recognition.start();
            });
        } finally {
            if (progressInterval) clearInterval(progressInterval);
            if (this.#visualCue) this.#visualCue.style.setProperty('--timeout-progress', '0');
            this.#removeVisualCue();
            releaseLock();
        }
    }
}
