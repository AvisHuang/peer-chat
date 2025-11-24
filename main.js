/**
 * WeLIVE - PeerChat Application
 * Refactored for modularity and maintainability.
 */

const CONFIG = {
    ICE_SERVERS: { iceServers: [{ urls: ['stun:stun1.l.google.com:19302'] }] },
    API_BASE: '',
    MAX_PARTICIPANTS: 2
};

/**
 * Manages all UI interactions and DOM updates.
 */
class UIManager {
    constructor() {
        this.elements = {};
        this.cacheElements();
        this.bindEvents();
    }

    cacheElements() {
        this.elements = {
            app: document.getElementById('app'),
            profileSection: document.getElementById('profileSection'),
            profileForm: document.getElementById('profileForm'),
            displayNameInput: document.getElementById('displayNameInput'),
            currentIdentity: document.getElementById('currentIdentity'),
            currentDisplayName: document.getElementById('currentDisplayName'),
            changeNameBtn: document.getElementById('changeNameBtn'),
            roomsSection: document.getElementById('roomsSection'),
            createRoomForm: document.getElementById('createRoomForm'),
            newRoomName: document.getElementById('newRoomName'),
            roomsList: document.getElementById('roomsList'),
            conferenceSection: document.getElementById('conferenceSection'),
            roomName: document.getElementById('roomName'),
            participantsList: document.getElementById('participantsList'),
            toggleCamera: document.getElementById('toggleCamera'),
            toggleMic: document.getElementById('toggleMic'),
            leaveRoomBtn: document.getElementById('leaveRoomBtn'),
            messages: document.getElementById('messages'),
            messageInput: document.getElementById('messageInput'),
            sendBtn: document.getElementById('sendBtn'),
            reactionButtons: document.querySelectorAll('.reactionBtn'),
            lyricsBtn: document.getElementById('lyricsBtn'),
            lyricsModal: document.getElementById('lyricsModal'),
            songInput: document.getElementById('songInput'),
            artistInput: document.getElementById('artistInput'),
            searchLyricsBtn: document.getElementById('searchLyricsBtn'),
            cancelLyricsBtn: document.getElementById('cancelLyricsBtn'),
            startPollBtn: document.getElementById('startPollBtn'),
            pollContainer: document.getElementById('pollContainer'),
            pollModal: document.getElementById('pollModal'),
            pollQuestionInput: document.getElementById('pollQuestionInput'),
            pollOption1: document.getElementById('pollOption1'),
            pollOption2: document.getElementById('pollOption2'),
            pollOption3: document.getElementById('pollOption3'),
            createPollBtn: document.getElementById('createPollBtn'),
            cancelPollBtn: document.getElementById('cancelPollBtn'),
            stopPrompterBtn: document.getElementById('stopPrompterBtn'),
            prompterSpeed: document.getElementById('prompterSpeed'),
            clearPrompterBtn: document.getElementById('clearPrompterBtn'),
            shareScreenBtn: document.getElementById('shareScreenBtn'),
            localVideo: document.getElementById('localVideo'),
            remoteGrid: document.getElementById('remoteGrid'),
            stage: document.getElementById('stage'),
            notification: document.getElementById('notification'),
            localContainer: document.getElementById('localContainer')
        };
    }

    bindEvents() {
        // Events will be delegated to the App controller
    }

    bindLyricsEvents() {
        const elems = this.elements;
        if (!elems) return;
        if (elems.lyricsBtn) {
            elems.lyricsBtn.addEventListener('click', () => {
                if (elems.lyricsModal) elems.lyricsModal.classList.remove('hidden');
            });
        }

        if (elems.cancelLyricsBtn) {
            elems.cancelLyricsBtn.addEventListener('click', () => {
                if (elems.lyricsModal) elems.lyricsModal.classList.add('hidden');
                if (elems.songInput) elems.songInput.value = '';
                if (elems.artistInput) elems.artistInput.value = '';
                // stop any running lyric auto-scroll and prompter timer
                if (this.lyricsTimer) {
                    clearInterval(this.lyricsTimer);
                    this.lyricsTimer = null;
                }
                if (this.prompterTimer) {
                    clearInterval(this.prompterTimer);
                    this.prompterTimer = null;
                }
                const resultEl = document.getElementById('lyricsResult');
                if (resultEl) resultEl.innerHTML = '';
                const prompter = document.getElementById('prompter');
                if (prompter) {
                    if (this.prompterClickHandler) prompter.removeEventListener('click', this.prompterClickHandler);
                    // remove per-line handlers if present
                    if (this.prompterLineClickHandlers && this.prompterLineClickHandlers.length) {
                        this.prompterLineClickHandlers.forEach(item => {
                            try { item.el.removeEventListener('click', item.handler); } catch (e) {}
                        });
                        this.prompterLineClickHandlers = [];
                    }
                    if (this.resultLineClickHandlers && this.resultLineClickHandlers.length) {
                        this.resultLineClickHandlers.forEach(item => {
                            try { item.el.removeEventListener('click', item.handler); } catch (e) {}
                        });
                        this.resultLineClickHandlers = [];
                    }
                    prompter.innerHTML = '';
                    prompter.setAttribute('aria-hidden', 'true');
                    this.prompterClickHandler = null;
                    this.prompterHint = null;
                }
                // hide stop button
                const stopBtn = document.getElementById('stopPrompterBtn');
                if (stopBtn) stopBtn.classList.add('hidden');
                const clearBtn = document.getElementById('clearPrompterBtn');
                if (clearBtn) clearBtn.classList.add('hidden');
            });
        }

        // Stop/Pause prompter button: toggle pausing of click-to-advance
        if (elems.stopPrompterBtn) {
            elems.stopPrompterBtn.addEventListener('click', () => {
                this.prompterPaused = !!this.prompterPaused;
                this.prompterPaused = !this.prompterPaused;
                if (this.prompterPaused) {
                    elems.stopPrompterBtn.textContent = '繼續';
                    this.showNotification('已暫停提詞');
                } else {
                    elems.stopPrompterBtn.textContent = '暫停';
                    this.showNotification('繼續提詞');
                }
            });
        }

        if (elems.searchLyricsBtn) {
            elems.searchLyricsBtn.addEventListener('click', () => {
                const song = elems.songInput ? elems.songInput.value.trim() : '';
                const artist = elems.artistInput ? elems.artistInput.value.trim() : '';
                if (!song) {
                    this.showNotification('請輸入歌名', true);
                    return;
                }

                // Call server-side lyrics endpoint (uses Genius API)
                const resultEl = document.getElementById('lyricsResult');
                if (resultEl) {
                    resultEl.classList.remove('hidden');
                    resultEl.textContent = '搜尋中…';
                }

                fetch(`${CONFIG.API_BASE}/api/lyrics`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ song, artist })
                }).then(async (res) => {
                    if (!res.ok) {
                        const err = await res.json().catch(() => ({}));
                        throw new Error(err.message || '搜尋失敗');
                    }
                    return res.json();
                }).then(data => {
                    if (!resultEl) return;
                    const title = data.title || song;
                    const artistName = data.artist || artist || '';
                    const headerText = `${title}${artistName ? ' — ' + artistName : ''}`;

                    const lyricsText = data.lyrics || '';
                    const rawLines = lyricsText.split(/\r?\n/);
                    // remove purely empty / whitespace-only lines to avoid blank rows
                    const filtered = rawLines.map(l => (l || '')).filter(l => l.trim().length > 0);
                    const lines = filtered.length ? filtered : ['找不到歌詞'];

                    resultEl.innerHTML = '';
                    const h = document.createElement('div');
                    h.className = 'lyrics-header';
                    h.textContent = headerText;
                    const link = document.createElement('a');
                    link.href = data.url || '#';
                    link.target = '_blank';
                    link.rel = 'noopener noreferrer';
                    link.textContent = '在來源開啟';
                    link.style.marginLeft = '8px';
                    h.appendChild(link);

                    const linesContainer = document.createElement('div');
                    linesContainer.className = 'lyrics-lines';
                    lines.forEach(l => {
                        const row = document.createElement('div');
                        row.className = 'lyrics-line';
                        row.textContent = l || '\u00A0';
                        linesContainer.appendChild(row);
                    });

                    resultEl.appendChild(h);
                    resultEl.appendChild(linesContainer);

                    resultEl.scrollTop = 0;

                    // close the modal and show interrupt/clear buttons
                    if (elems.lyricsModal) elems.lyricsModal.classList.add('hidden');
                    if (elems.stopPrompterBtn) elems.stopPrompterBtn.classList.remove('hidden');
                    if (elems.clearPrompterBtn) elems.clearPrompterBtn.classList.remove('hidden');

                    // Also populate prompter area with the same lines
                    const prompter = document.getElementById('prompter');
                    if (prompter) {
                        prompter.innerHTML = '';
                        prompter.setAttribute('aria-hidden', 'false');
                        const pHeader = document.createElement('div');
                        pHeader.className = 'prompter-title';
                        pHeader.textContent = headerText;
                        const pLines = document.createElement('div');
                        pLines.className = 'prompter-lines';
                        lines.forEach(l => {
                            const r = document.createElement('div');
                            r.className = 'prompter-line';
                            r.textContent = l || '\u00A0';
                            pLines.appendChild(r);
                        });
                        prompter.appendChild(pHeader);
                        prompter.appendChild(pLines);
                        // prepare click-to-advance prompter: bold first line
                        const allLines = pLines.querySelectorAll('.prompter-line');
                        if (allLines.length) {
                            allLines.forEach(n => n.classList.remove('prompter-current'));
                            allLines[0].classList.add('prompter-current');
                        }
                        // initialize prompter state
                        this.prompterLines = Array.from(allLines || []);
                        this.prompterIndex = 0;
                        this.prompterPaused = false;

                        // capture result lines for sync (convert to array)
                        const resultLinesNodes = resultEl ? resultEl.querySelectorAll('.lyrics-line') : [];
                        this.resultLines = Array.from(resultLinesNodes || []);
                        // ensure result area highlights/scrolls to the first line
                        this.syncResultToIndex(0);

                        // attach per-line click handlers so user can click any line (prompter or result) to jump
                        this.prompterLineClickHandlers = [];
                        this.resultLineClickHandlers = [];
                        this.prompterLines.forEach((ln, idx) => {
                            const handler = (e) => {
                                e.stopPropagation();
                                this.jumpToIndex(idx);
                            };
                            ln.style.cursor = 'pointer';
                            ln.addEventListener('click', handler);
                            this.prompterLineClickHandlers.push({ el: ln, handler });
                        });
                        this.resultLines.forEach((ln, idx) => {
                            const handler = (e) => {
                                e.stopPropagation();
                                this.jumpToIndex(idx);
                            };
                            ln.style.cursor = 'pointer';
                            ln.addEventListener('click', handler);
                            this.resultLineClickHandlers.push({ el: ln, handler });
                        });

                        // add hint text
                        const hint = document.createElement('div');
                        hint.className = 'prompter-hint';
                        hint.textContent = '點一下換行';
                        prompter.appendChild(hint);
                        this.prompterHint = hint;

                        // attach click listener to prompter (store so we can remove later)
                        if (this.prompterClickHandler && typeof this.prompterClickHandler === 'function') {
                            prompter.removeEventListener('click', this.prompterClickHandler);
                        }
                        this.prompterClickHandler = this.advancePrompter.bind(this);
                        prompter.addEventListener('click', this.prompterClickHandler);
                    }
                }).catch(err => {
                    if (resultEl) resultEl.textContent = err.message || '搜尋失敗';
                    console.warn('lyrics search failed', err);
                }).finally(() => {
                    // keep modal open so user can read; clear inputs if desired
                    if (elems.songInput) elems.songInput.value = '';
                    if (elems.artistInput) elems.artistInput.value = '';
                    // hide modal-related temporary UI if present
                    // (do not remove prompter content)
                });
            });
        }

        // Clear prompter button handler
        if (elems.clearPrompterBtn) {
            elems.clearPrompterBtn.addEventListener('click', () => {
                const prompter = document.getElementById('prompter');
                if (prompter) {
                    if (this.prompterClickHandler) prompter.removeEventListener('click', this.prompterClickHandler);
                    if (this.prompterLineClickHandlers && this.prompterLineClickHandlers.length) {
                        this.prompterLineClickHandlers.forEach(item => {
                            try { item.el.removeEventListener('click', item.handler); } catch (e) {}
                        });
                        this.prompterLineClickHandlers = [];
                    }
                    if (this.resultLineClickHandlers && this.resultLineClickHandlers.length) {
                        this.resultLineClickHandlers.forEach(item => {
                            try { item.el.removeEventListener('click', item.handler); } catch (e) {}
                        });
                        this.resultLineClickHandlers = [];
                    }
                    prompter.innerHTML = '';
                    prompter.setAttribute('aria-hidden', 'true');
                }
                const resultEl = document.getElementById('lyricsResult');
                if (resultEl) resultEl.innerHTML = '';
                if (elems.stopPrompterBtn) elems.stopPrompterBtn.classList.add('hidden');
                if (elems.clearPrompterBtn) elems.clearPrompterBtn.classList.add('hidden');
                this.prompterLines = null;
                this.prompterIndex = 0;
                this.prompterPaused = false;
            });
        }
    }

    /* Poll UI handling */
    bindPollEvents() {
        const elems = this.elements;
        if (!elems) return;
        if (elems.startPollBtn) {
            elems.startPollBtn.addEventListener('click', () => {
                if (elems.pollModal) elems.pollModal.classList.remove('hidden');
            });
        }

        if (elems.cancelPollBtn) {
            elems.cancelPollBtn.addEventListener('click', () => {
                if (elems.pollModal) elems.pollModal.classList.add('hidden');
                if (elems.pollQuestionInput) elems.pollQuestionInput.value = '';
                if (elems.pollOption1) elems.pollOption1.value = '';
                if (elems.pollOption2) elems.pollOption2.value = '';
                if (elems.pollOption3) elems.pollOption3.value = '';
            });
        }
    }

    renderPoll(poll, isHost, counts) {
        const container = this.elements.pollContainer;
        if (!container) return;
        container.innerHTML = '';
        container.classList.remove('hidden');

        // close button (top-right)
        const closeBtn = document.createElement('button');
        closeBtn.className = 'poll-close';
        closeBtn.type = 'button';
        closeBtn.textContent = '×';
        closeBtn.title = '關閉';
        closeBtn.style.position = 'absolute';
        closeBtn.style.right = '8px';
        closeBtn.style.top = '6px';
        closeBtn.style.background = 'transparent';
        closeBtn.style.border = 'none';
        closeBtn.style.color = 'var(--text-primary)';
        closeBtn.style.fontSize = '18px';
        closeBtn.style.cursor = 'pointer';
        closeBtn.addEventListener('click', (ev) => { ev.stopPropagation(); this.clearPollDisplay(); });
        container.appendChild(closeBtn);

        // Make window draggable by the title (.poll-question)
        // Clean up any previous handlers
        try {
            if (container._dragCleanup) {
                container._dragCleanup();
                container._dragCleanup = null;
            }
        } catch (e) {}

        const titleEl = container.querySelector('.poll-question');
        let isDragging = false;
        let startX = 0, startY = 0;
        let origLeft = 0, origTop = 0;

        const toNumber = (v) => parseFloat(v) || 0;

        const onMouseMove = (ev) => {
            if (!isDragging) return;
            const clientX = ev.type.startsWith('touch') ? ev.touches[0].clientX : ev.clientX;
            const clientY = ev.type.startsWith('touch') ? ev.touches[0].clientY : ev.clientY;
            const dx = clientX - startX;
            const dy = clientY - startY;
            container.style.left = (origLeft + dx) + 'px';
            container.style.top = (origTop + dy) + 'px';
            // remove centering transform while moving
            container.style.transform = 'translate(0, 0)';
            container.classList.add('dragging');
        };

        const onMouseUp = (ev) => {
            if (!isDragging) return;
            isDragging = false;
            container.classList.remove('dragging');
            // store final position
            try { document.removeEventListener('mousemove', onMouseMove); document.removeEventListener('mouseup', onMouseUp); } catch (e) {}
            try { document.removeEventListener('touchmove', onMouseMove); document.removeEventListener('touchend', onMouseUp); } catch (e) {}
        };

        const onMouseDown = (ev) => {
            // don't start drag when clicking buttons/inputs
            if (ev.target && (ev.target.tagName === 'BUTTON' || ev.target.tagName === 'INPUT')) return;
            isDragging = true;
            const rect = container.getBoundingClientRect();
            startX = ev.type.startsWith('touch') ? ev.touches[0].clientX : ev.clientX;
            startY = ev.type.startsWith('touch') ? ev.touches[0].clientY : ev.clientY;
            // current left/top in pixels; if using transform centering, compute center-based coords
            // If style.left/top not set (centered), compute origLeft/origTop as center position
            const leftStyle = window.getComputedStyle(container).left;
            const topStyle = window.getComputedStyle(container).top;
            if (leftStyle && leftStyle !== 'auto') origLeft = toNumber(leftStyle);
            else origLeft = rect.left;
            if (topStyle && topStyle !== 'auto') origTop = toNumber(topStyle);
            else origTop = rect.top;

            // set explicit position to avoid flicker
            container.style.left = origLeft + 'px';
            container.style.top = origTop + 'px';
            container.style.transform = 'translate(0, 0)';

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
            document.addEventListener('touchmove', onMouseMove, { passive: false });
            document.addEventListener('touchend', onMouseUp);
        };

        if (titleEl) {
            titleEl.style.cursor = 'grab';
            titleEl.addEventListener('mousedown', onMouseDown);
            titleEl.addEventListener('touchstart', onMouseDown, { passive: false });
            // store cleanup to remove listeners later
            container._dragCleanup = () => {
                try { titleEl.removeEventListener('mousedown', onMouseDown); titleEl.removeEventListener('touchstart', onMouseDown); } catch (e) {}
                try { document.removeEventListener('mousemove', onMouseMove); document.removeEventListener('mouseup', onMouseUp); } catch (e) {}
                try { document.removeEventListener('touchmove', onMouseMove); document.removeEventListener('touchend', onMouseUp); } catch (e) {}
                container.classList.remove('dragging');
            };
        }

        const title = document.createElement('div');
        title.className = 'poll-question';
        title.textContent = poll.question;
        container.appendChild(title);

        const list = document.createElement('div');
        list.className = 'poll-options';
        poll.options.forEach((opt, idx) => {
            const row = document.createElement('div');
            row.className = 'poll-option-row';

            const btn = document.createElement('button');
            btn.className = 'poll-option';
            btn.type = 'button';
            btn.dataset.index = idx;
            btn.textContent = opt;

            const countSpan = document.createElement('span');
            countSpan.className = 'poll-count';
            countSpan.textContent = (counts && counts[idx] != null) ? String(counts[idx]) : '0';

            row.appendChild(btn);
            row.appendChild(countSpan);
            list.appendChild(row);
        });
        container.appendChild(list);

        const actions = document.createElement('div');
        actions.className = 'poll-actions';
        if (isHost) {
            const endBtn = document.createElement('button');
            endBtn.id = 'endPollBtn';
            endBtn.type = 'button';
            endBtn.textContent = '結束投票';
            actions.appendChild(endBtn);
        }
        const info = document.createElement('div');
        info.className = 'poll-info';
        info.textContent = '點選選項以投票';
        actions.appendChild(info);

        container.appendChild(actions);
    }

    updatePollCounts(counts) {
        const container = this.elements.pollContainer;
        if (!container) return;
        const countEls = container.querySelectorAll('.poll-count');
        countEls.forEach((el, idx) => {
            if (counts && counts[idx] != null) el.textContent = String(counts[idx]);
        });
    }

    clearPollDisplay() {
        const container = this.elements.pollContainer;
        if (!container) return;
        // remove drag handlers if present
        try {
            if (container._dragCleanup) {
                container._dragCleanup();
                container._dragCleanup = null;
            }
        } catch (e) {}
        container.innerHTML = '';
        container.classList.add('hidden');
        // reset centering so next open starts centered
        container.style.left = '';
        container.style.top = '';
        container.style.transform = 'translate(-50%, -50%)';
    }

    showNotification(message, isError = false) {
        const notif = this.elements.notification;

        notif.textContent = message;
        notif.style.backgroundColor = isError ? 'rgba(239, 68, 68, 0.9)' : 'rgba(15, 23, 42, 0.9)';
        notif.classList.remove('hidden');

        if (this.notificationTimeout) clearTimeout(this.notificationTimeout);
        this.notificationTimeout = setTimeout(() => {
            notif.classList.add('hidden');
        }, 3000);
        
    }

    advancePrompter() {
        // advance one line (used by container click)
        if (this.prompterPaused) return;
        if (!this.prompterLines || !this.prompterLines.length) return;
        // remove previous highlight
        if (this.prompterLines[this.prompterIndex]) this.prompterLines[this.prompterIndex].classList.remove('prompter-current');
        this.prompterIndex++;
        if (this.prompterIndex >= this.prompterLines.length) {
            // clamp to last
            this.prompterIndex = this.prompterLines.length - 1;
            if (this.prompterLines[this.prompterIndex]) this.prompterLines[this.prompterIndex].classList.add('prompter-current');
            // hide stop button and show clear
            const elems = this.elements;
            if (this.prompterHint) this.prompterHint.classList.add('hidden');
            if (elems.stopPrompterBtn) elems.stopPrompterBtn.classList.add('hidden');
            if (elems.clearPrompterBtn) elems.clearPrompterBtn.classList.remove('hidden');
            return;
        }
        const node = this.prompterLines[this.prompterIndex];
        if (node) node.classList.add('prompter-current');
        try { node.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) {}
        this.syncResultToIndex(this.prompterIndex);
    }

    syncResultToIndex(index) {
        const resultEl = document.getElementById('lyricsResult');
        if (!resultEl || !this.resultLines || !this.resultLines.length) return;
        // ensure resultLines is an array
        if (!Array.isArray(this.resultLines)) this.resultLines = Array.from(this.resultLines || []);
        const i = Math.max(0, Math.min(index, this.resultLines.length - 1));
        console.debug('[syncResultToIndex] syncing index', i, 'of', this.resultLines.length);
        this.resultLines.forEach(n => n.classList && n.classList.remove('lyrics-current'));
        const resNode = this.resultLines[i];
        if (!resNode) return;
        resNode.classList.add('lyrics-current');
        // place the target line at the top of the result viewport (just below header)
        try {
            const header = resultEl.querySelector('.lyrics-header');
            const headerHeight = header ? header.offsetHeight : 0;
            // offsetTop of resNode is relative to its offsetParent (the lines container)
            // We want the scrollTop value that places the line immediately below the header
            const top = Math.max(0, headerHeight + (resNode.offsetTop || 0));
            console.debug('[syncResultToIndex] placing line at top, top=', top);
            resultEl.scrollTo({ top, behavior: 'auto' });
        } catch (e) {
            console.warn('syncResultToIndex fallback scroll', e);
            const header = resultEl.querySelector('.lyrics-header');
            const headerHeight = header ? header.offsetHeight : 0;
            const top = headerHeight + resNode.offsetTop;
            resultEl.scrollTo({ top, behavior: 'auto' });
        }
    }

    jumpToIndex(index) {
        // Jump prompter and result to a specific line index
        if (!Number.isFinite(index)) return;
        if (!this.prompterLines || !this.prompterLines.length) return;
        const i = Math.max(0, Math.min(index, this.prompterLines.length - 1));
        // remove previous
        this.prompterLines.forEach(n => n.classList && n.classList.remove('prompter-current'));
        // set current
        const node = this.prompterLines[i];
        if (node) node.classList.add('prompter-current');
        this.prompterIndex = i;
        // ensure visible in prompter (top)
        try { node && node.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) {}
        // sync right-side
        this.syncResultToIndex(i);
        // show/hide hint: keep hint visible except when at last line
        if (this.prompterHint) {
            if (i >= this.prompterLines.length - 1) this.prompterHint.classList.add('hidden');
            else this.prompterHint.classList.remove('hidden');
        }

        // ensure container click handler is attached (defensive)
        try {
            const prompterEl = document.getElementById('prompter');
            if (prompterEl && !this.prompterClickHandler) {
                this.prompterClickHandler = this.advancePrompter.bind(this);
                prompterEl.addEventListener('click', this.prompterClickHandler);
            }
        } catch (e) {
            console.debug('jumpToIndex: could not reattach prompterClickHandler', e);
        }
    }

    updateIdentity(user) {
        if (!user) {
            this.elements.profileSection.classList.remove('hidden');
            this.elements.roomsSection.classList.add('hidden');
            this.elements.conferenceSection.classList.add('hidden');
            this.elements.currentIdentity.classList.add('hidden');
        } else {
            this.elements.profileSection.classList.add('hidden');
            this.elements.currentIdentity.classList.remove('hidden');
            this.elements.currentDisplayName.textContent = user.displayName;

            if (this.elements.conferenceSection.classList.contains('hidden')) {
                this.elements.roomsSection.classList.remove('hidden');
            }
        }
    }

    toggleConferenceMode(active) {
        if (active) {
            this.elements.roomsSection.classList.add('hidden');
            this.elements.conferenceSection.classList.remove('hidden');
        } else {
            this.elements.roomsSection.classList.remove('hidden');
            this.elements.conferenceSection.classList.add('hidden');
        }
    }

    renderRooms(rooms, onJoin) {
        this.elements.roomsList.innerHTML = '';
        if (!rooms.length) {
            const empty = document.createElement('li');
            empty.textContent = '尚無房間，成為第一個建立者吧！';
            empty.style.opacity = '0.7';
            empty.style.textAlign = 'center';
            empty.style.padding = '20px';
            this.elements.roomsList.appendChild(empty);
            return;
        }

        rooms.forEach(room => {
            const li = document.createElement('li');
            li.classList.add('room-item');

            const meta = document.createElement('div');
            meta.classList.add('meta');

            const title = document.createElement('h3');
            title.textContent = room.name;

            const sub = document.createElement('span');
            sub.textContent = `在線人數：${room.memberCount}`;

            meta.appendChild(title);
            meta.appendChild(sub);

            const joinBtn = document.createElement('button');
            joinBtn.type = 'button';

            if ((room.memberCount || 0) >= CONFIG.MAX_PARTICIPANTS) {
                joinBtn.textContent = '房間已滿';
                joinBtn.disabled = true;
                joinBtn.style.opacity = '0.5';
                joinBtn.style.cursor = 'not-allowed';
            } else {
                joinBtn.textContent = '加入';
                joinBtn.addEventListener('click', () => onJoin(room.id));
            }

            li.appendChild(meta);
            li.appendChild(joinBtn);
            this.elements.roomsList.appendChild(li);
        });
    }

    updateParticipants(participants, hostId, currentUserId, onTransferHost) {
        console.debug('UI.updateParticipants called', { participants, hostId, currentUserId });
        this.elements.participantsList.innerHTML = '';

        participants.forEach(p => {
            const li = document.createElement('li');
            const isHost = p.userId === hostId;
            const isSelf = p.userId === currentUserId;

            const info = document.createElement('span');
            info.textContent = `${p.displayName}${isSelf ? ' (自己)' : ''}${isHost ? ' 👑' : ''}`;
            li.appendChild(info);

            if (currentUserId === hostId && !isSelf && !isHost) {
                const btn = document.createElement('button');
                btn.textContent = '設為房主';
                btn.style.padding = '4px 8px';
                btn.style.fontSize = '10px';
                console.debug('Adding transfer button for participant', p.userId);
                btn.addEventListener('click', () => onTransferHost(p.userId));
                li.appendChild(btn);
            }

            this.elements.participantsList.appendChild(li);
        });
        // show/hide start poll button depending on whether current user is host
        try {
            if (this.elements.startPollBtn) {
                if (currentUserId === hostId) this.elements.startPollBtn.classList.remove('hidden');
                else this.elements.startPollBtn.classList.add('hidden');
            }
        } catch (e) {}
    }

    appendMessage(msg, currentUserId) {
        const { from, text, timestamp } = msg;
        if (!text) return;

        const message = document.createElement('div');
        const isSelf = from && from.userId === currentUserId;
        message.classList.add('message', isSelf ? 'self' : 'other');

        const content = document.createElement('div');
        content.textContent = text;

        const meta = document.createElement('div');
        meta.classList.add('meta');
        const time = timestamp ? new Date(timestamp) : new Date();
        const formatted = `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}`;
        meta.textContent = `${from ? from.displayName : '系統'} · ${formatted}`;

        message.appendChild(content);
        message.appendChild(meta);

        this.elements.messages.appendChild(message);
        this.elements.messages.scrollTop = this.elements.messages.scrollHeight;
    }

    createReaction(emoji, userId) {
        let container;
        if (userId === 'self') {
            container = this.elements.localContainer;
        } else {
            container = document.querySelector(`.video-card[data-user="${userId}"]`);
        }

        if (!container) return;

        const elem = document.createElement('div');
        elem.classList.add('remote-reaction');
        elem.textContent = emoji;

        // Random position: 10% to 80%
        const randomLeft = Math.floor(Math.random() * 70) + 10;
        const randomTop = Math.floor(Math.random() * 70) + 10;
        // Random rotation: -20deg to 20deg
        const randomRot = Math.floor(Math.random() * 40) - 20;

        elem.style.left = `${randomLeft}%`;
        elem.style.top = `${randomTop}%`;
        elem.style.transform = `rotate(${randomRot}deg) scale(0.5)`; // Initial scale for animation

        container.appendChild(elem);

        // Remove after animation
        setTimeout(() => {
            if (elem.parentElement) elem.parentElement.removeChild(elem);
        }, 2000);
    }

    ensureVideoCard(user, isHost) {
        let card = document.querySelector(`.video-card[data-user="${user.userId}"]`);

        if (!card) {
            card = document.createElement('div');
            card.classList.add('video-card');
            card.setAttribute('data-user', user.userId);

            const video = document.createElement('video');
            video.autoplay = true;
            video.playsinline = true;

            const label = document.createElement('span');
            label.classList.add('label');
            label.textContent = user.displayName;

            card.appendChild(video);
            card.appendChild(label);
            this.elements.stage.appendChild(card);
        }

        // Update host styling if needed
        if (isHost) {
            card.classList.add('host-video');
            card.style.order = -1; // Host first
        } else {
            card.classList.remove('host-video');
            card.style.order = 1;
        }

        return card.querySelector('video');
    }

    removeVideoCard(userId) {
        const card = document.querySelector(`.video-card[data-user="${userId}"]`);
        if (card) card.remove();
    }

    clearConference() {
        this.elements.messages.innerHTML = '';
        this.elements.participantsList.innerHTML = '';
        const remoteCards = document.querySelectorAll('.video-card:not([data-user="self"])');
        remoteCards.forEach(c => c.remove());
    }
}

/**
 * Manages WebRTC connections and WebSocket signaling.
 */
class RoomManager {
    constructor(ui) {
        this.ui = ui;
        this.user = null;
        this.currentRoom = null;
        this.socket = null;
        this.localStream = null;
        this.peers = new Map(); // userId -> { pc, stream }
        this.mediaState = { camera: true, mic: true };
    }

    async initLocalStream() {
        try {
            this.localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            this.ui.elements.localVideo.srcObject = this.localStream;
            this.updateMediaTracks();
            return true;
        } catch (err) {
            console.error('Media Error:', err);
            this.ui.showNotification('無法存取相機或麥克風', true);
            return false;
        }
    }

    async startScreenShare() {
        if (this.isScreenSharing) return;
        try {
            // Try to capture screen with audio if available
            let screenStream;
            try {
                screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
            } catch (e) {
                // fallback to video-only
                screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
            }

            const screenTrack = screenStream.getVideoTracks()[0];
            if (!screenTrack) throw new Error('無法取得螢幕錄影軌');

            // prefer screen audio if provided, otherwise keep local audio
            const screenAudioTracks = screenStream.getAudioTracks();
            const audioTracks = (screenAudioTracks && screenAudioTracks.length) ? screenAudioTracks : (this.localStream ? this.localStream.getAudioTracks() : []);

            // create a new display stream to show locally (screen video + audio)
            const displayStream = new MediaStream();
            displayStream.addTrack(screenTrack);
            audioTracks.forEach(t => displayStream.addTrack(t));

            // update local preview
            this.ui.elements.localVideo.srcObject = displayStream;

            // replace outgoing video track for all peers
            this.peers.forEach(({ pc }) => {
                const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
                if (sender) sender.replaceTrack(screenTrack).catch(err => console.warn('replaceTrack failed', err));
            });

            this.screenStream = screenStream;
            this.screenTrack = screenTrack;
            this.isScreenSharing = true;
            if (this.ui && this.ui.elements && this.ui.elements.shareScreenBtn) this.ui.elements.shareScreenBtn.textContent = '停止分享';
            this.ui.showNotification('開始分享螢幕');

            // stop screen sharing when user stops the track (e.g., via browser UI)
            screenTrack.onended = () => {
                this.stopScreenShare();
            };
        } catch (err) {
            console.warn('startScreenShare error', err);
            this.ui.showNotification('無法開始分享螢幕', true);
        }
    }

    async stopScreenShare() {
        if (!this.isScreenSharing) return;
        // stop screen tracks
        try {
            if (this.screenStream) {
                this.screenStream.getTracks().forEach(t => { try { t.stop(); } catch (e) {} });
            }
        } catch (e) { /* ignore */ }

        // restore local camera video to peers
        const cameraTrack = this.localStream ? this.localStream.getVideoTracks()[0] : null;
        if (cameraTrack) {
            this.peers.forEach(({ pc }) => {
                const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
                if (sender) sender.replaceTrack(cameraTrack).catch(err => console.warn('replaceTrack restore failed', err));
            });
            this.ui.elements.localVideo.srcObject = this.localStream;
        } else {
            this.ui.elements.localVideo.srcObject = null;
        }

        this.isScreenSharing = false;
        this.screenStream = null;
        this.screenTrack = null;
        if (this.ui && this.ui.elements && this.ui.elements.shareScreenBtn) this.ui.elements.shareScreenBtn.textContent = '分享螢幕';
        this.ui.showNotification('停止分享螢幕');
    }

    async toggleScreenShare() {
        if (this.isScreenSharing) return this.stopScreenShare();
        return this.startScreenShare();
    }

    stopLocalStream() {
        if (this.localStream) {
            this.localStream.getTracks().forEach(t => t.stop());
            this.localStream = null;
            this.ui.elements.localVideo.srcObject = null;
        }
    }

    toggleMedia(type) {
        if (type === 'video') {
            this.mediaState.camera = !this.mediaState.camera;
            this.ui.elements.toggleCamera.textContent = this.mediaState.camera ? '關閉鏡頭' : '開啟鏡頭';
        } else {
            this.mediaState.mic = !this.mediaState.mic;
            this.ui.elements.toggleMic.textContent = this.mediaState.mic ? '關閉麥克風' : '開啟麥克風';
        }
        this.updateMediaTracks();
    }

    updateMediaTracks() {
        if (!this.localStream) return;
        this.localStream.getVideoTracks().forEach(t => t.enabled = this.mediaState.camera);
        this.localStream.getAudioTracks().forEach(t => t.enabled = this.mediaState.mic);
    }

    connectSocket(roomId) {
        const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
        const wsUrl = `${protocol}://${window.location.host}/ws?roomId=${roomId}&userId=${this.user.id}&displayName=${encodeURIComponent(this.user.displayName)}`;

        this.socket = new WebSocket(wsUrl);

        this.socket.onopen = () => console.log('✅ WS Connected');
        this.socket.onclose = () => {
            console.log('⚠️ WS Closed');
            if (this.currentRoom) this.ui.showNotification('已斷開連線', true);
        };
        this.socket.onerror = (err) => console.error('WS Error', err);

        this.socket.onmessage = async (e) => {
            try {
                const msg = JSON.parse(e.data);
                await this.handleSignal(msg);
            } catch (err) {
                console.error('Signal Error', err);
            }
        };
    }

    sendSignal(type, payload = {}) {
        // Special-case: transfer-host should go through server REST API so server
        // updates room state and broadcasts 'host-transferred' to all sockets.
        if (type === 'transfer-host') {
            try {
                const roomId = this.currentRoom && this.currentRoom.id;
                if (!roomId) return;
                fetch(`${CONFIG.API_BASE}/api/rooms/${roomId}/transfer-host`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: this.user.id, newHostUserId: payload.newHostUserId })
                }).then(res => res.json()).then(() => {
                    // server will broadcast host-transferred; nothing else to do here
                }).catch(err => console.warn('transfer-host REST failed', err));
            } catch (err) {
                console.warn('transfer-host error', err);
            }
            return;
        }

        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({ type, ...payload }));
        }
    }

    async handleSignal(msg) {
        switch (msg.type) {
            case 'room-state':
                this.handleRoomState(msg);
                break;
            case 'user-joined':
                this.handleUserJoined(msg.user);
                break;
            case 'user-left':
                this.handleUserLeft(msg.userId);
                break;
            case 'offer':
                await this.handleOffer(msg);
                break;
            case 'answer':
                await this.handleAnswer(msg);
                break;
            case 'candidate':
                await this.handleCandidate(msg);
                break;
            case 'chat':
                this.ui.appendMessage(msg, this.user.id);
                break;
            case 'reaction':
                this.ui.createReaction(msg.emoji, msg.from.userId);
                break;
            case 'host-transferred':
                this.handleHostTransfer(msg);
                break;
            case 'notification':
                this.ui.showNotification(msg.message, msg.isError);
                break;
            case 'poll-started': {
                const poll = msg.poll;
                if (!poll) break;
                this.currentPollId = poll.id;
                const isHost = (this.hostUserId === this.user.id);
                const counts = poll.counts || (poll.options ? poll.options.map(() => 0) : []);
                this.ui.renderPoll(poll, isHost, counts);
                break;
            }
            case 'poll-update': {
                // update counts
                if (msg.pollId && Array.isArray(msg.counts)) {
                    this.ui.updatePollCounts(msg.counts);
                }
                break;
            }
            case 'poll-ended': {
                const poll = msg.poll;
                if (poll && Array.isArray(poll.counts)) {
                    // show final counts then clear after a short delay
                    this.ui.updatePollCounts(poll.counts);
                    this.ui.showNotification('投票已結束');
                }
                this.currentPollId = null;
                // clear UI (keep results visible briefly)
                setTimeout(() => this.ui.clearPollDisplay(), 3000);
                break;
            }
        }
    }

    handleRoomState(msg) {
        this.hostUserId = msg.hostUserId;
        this.participants = new Map();

        // Update UI for self
        this.ui.elements.roomName.textContent = this.currentRoom.name;

        // Process participants
        if (msg.participants) {
            msg.participants.forEach(p => {
                if (p.userId !== this.user.id) {
                    this.participants.set(p.userId, p);
                    this.createPeerConnection(p.userId, true); // Initiate connection
                }
            });
        }
        // If there's an active poll included in room state, render it
        if (msg.currentPoll) {
            this.currentPollId = msg.currentPoll.id;
            const isHost = (this.hostUserId === this.user.id);
            this.ui.renderPoll(msg.currentPoll, isHost, msg.currentPoll.counts || (msg.currentPoll.options ? msg.currentPoll.options.map(() => 0) : []));
        }
        this.updateParticipantsUI();
    }

    handleUserJoined(user) {
        if (user.userId === this.user.id) return;
        this.participants.set(user.userId, user);
        this.ui.showNotification(`${user.displayName} 加入房間`);
        this.updateParticipantsUI();
        // Wait for offer from new user (or initiate if we are host/older peer - simplified here to let joiner initiate via room-state logic usually, but actually room-state is for joiner. Existing peers wait for offer.)
    }

    handleUserLeft(userId) {
        const p = this.participants.get(userId);
        if (p) this.ui.showNotification(`${p.displayName} 離開房間`);
        this.participants.delete(userId);
        this.closePeer(userId);
        this.ui.removeVideoCard(userId);
        this.updateParticipantsUI();
    }

    async createPeerConnection(targetUserId, isInitiator) {
        if (this.peers.has(targetUserId)) return this.peers.get(targetUserId).pc;

        const pc = new RTCPeerConnection(CONFIG.ICE_SERVERS);
        const remoteStream = new MediaStream();

        // Add local tracks
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => pc.addTrack(track, this.localStream));
        }

        // Handle remote tracks
        pc.ontrack = (event) => {
            event.streams[0].getTracks().forEach(track => remoteStream.addTrack(track));
            const user = this.participants.get(targetUserId);
            if (user) {
                const videoEl = this.ui.ensureVideoCard(user, user.userId === this.hostUserId);
                videoEl.srcObject = remoteStream;
            }
        };

        // ICE Candidates
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                this.sendSignal('candidate', { targetUserId, candidate: event.candidate });
            }
        };

        this.peers.set(targetUserId, { pc, remoteStream });

        if (isInitiator) {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            this.sendSignal('offer', { targetUserId, offer });
        }

        return pc;
    }

    async handleOffer(msg) {
        const { from, offer } = msg;
        const pc = await this.createPeerConnection(from.userId, false);
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        this.sendSignal('answer', { targetUserId: from.userId, answer });
    }

    async handleAnswer(msg) {
        const { from, answer } = msg;
        const peer = this.peers.get(from.userId);
        if (peer) {
            await peer.pc.setRemoteDescription(new RTCSessionDescription(answer));
        }
    }

    async handleCandidate(msg) {
        const { from, candidate } = msg;
        const peer = this.peers.get(from.userId);
        if (peer) {
            await peer.pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
    }

    closePeer(userId) {
        const peer = this.peers.get(userId);
        if (peer) {
            peer.pc.close();
            this.peers.delete(userId);
        }
    }

    handleHostTransfer(msg) {
        // Accept multiple possible property names from server payloads
        const newHost = msg.newHostUserId || msg.hostUserId || msg.newHostId || msg.newHost;
        console.debug('handleHostTransfer received', { msg, newHost, currentHost: this.hostUserId, participantsCount: this.participants.size });
        if (!newHost) {
            console.warn('handleHostTransfer: no host id in message', msg);
            return;
        }

        this.hostUserId = newHost;
        const name = (this.participants.get(newHost) && this.participants.get(newHost).displayName) || (this.user && this.user.id === newHost ? this.user.displayName : null);
        this.ui.showNotification(name ? `房主已變更：${name}` : '房主已變更');

        // Update participants UI so the new host sees the transfer buttons
        this.updateParticipantsUI();

        // Re-organize video layout
        this.participants.forEach(p => {
            this.ui.ensureVideoCard(p, p.userId === this.hostUserId);
        });
    }

    updateParticipantsUI() {
        const list = [
            { userId: this.user.id, displayName: this.user.displayName },
            ...Array.from(this.participants.values())
        ];

        this.ui.updateParticipants(list, this.hostUserId, this.user.id, (targetId) => {
            // Optimistically apply host transfer locally so UI updates immediately
            // (server should also broadcast a host-transferred event)
            if (this.hostUserId === this.user.id) {
                this.hostUserId = targetId;
                // Trigger local handler to update UI/layout
                this.handleHostTransfer({ newHostUserId: targetId });
            }

            // Notify server of host transfer
            this.sendSignal('transfer-host', { newHostUserId: targetId });
        });
    }
}

/**
 * Main Application Controller
 */
class App {
    constructor() {
        this.ui = new UIManager();
        this.room = new RoomManager(this.ui);
        this.bindEvents();
        // Bind UI-specific handlers (lyrics modal + poll modal)
        this.ui.bindLyricsEvents && this.ui.bindLyricsEvents();
        this.ui.bindPollEvents && this.ui.bindPollEvents();
    }

    bindEvents() {
        // Profile
        this.ui.elements.profileForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = this.ui.elements.displayNameInput.value.trim();
            if (name) {
                this.room.user = { id: this.generateId(), displayName: name };
                this.ui.updateIdentity(this.room.user);
                this.loadRooms();
            }
        });

        this.ui.elements.changeNameBtn.addEventListener('click', () => {
            if (this.room.currentRoom) {
                this.ui.showNotification('請先離開房間', true);
                return;
            }
            this.room.user = null;
            this.ui.updateIdentity(null);
        });

        // Rooms
        this.ui.elements.createRoomForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = this.ui.elements.newRoomName.value.trim();
            if (!name) return;

            try {
                const res = await fetch(`${CONFIG.API_BASE}/api/rooms`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, userId: this.room.user.id, displayName: this.room.user.displayName })
                });
                const data = await res.json();
                if (data.room) {
                    this.joinRoom(data.room.id);
                }
            } catch (err) {
                this.ui.showNotification('建立房間失敗', true);
            }
        });

        // Conference
        this.ui.elements.leaveRoomBtn.addEventListener('click', () => this.leaveRoom());

        this.ui.elements.toggleCamera.addEventListener('click', () => this.room.toggleMedia('video'));
        this.ui.elements.toggleMic.addEventListener('click', () => this.room.toggleMedia('audio'));
        if (this.ui.elements.shareScreenBtn) {
            this.ui.elements.shareScreenBtn.addEventListener('click', async () => {
                // ensure local stream available
                if (!this.room.localStream) {
                    const ok = await this.room.initLocalStream();
                    if (!ok) return;
                }
                this.room.toggleScreenShare();
            });
        }

        // Poll creation (host) and voting
        if (this.ui.elements.createPollBtn) {
            this.ui.elements.createPollBtn.addEventListener('click', () => {
                const q = (this.ui.elements.pollQuestionInput && this.ui.elements.pollQuestionInput.value || '').trim();
                const o1 = (this.ui.elements.pollOption1 && this.ui.elements.pollOption1.value || '').trim();
                const o2 = (this.ui.elements.pollOption2 && this.ui.elements.pollOption2.value || '').trim();
                const o3 = (this.ui.elements.pollOption3 && this.ui.elements.pollOption3.value || '').trim();
                const opts = [o1, o2, o3].map(s => (s || '').trim()).filter(s => s.length > 0);
                if (!q || opts.length < 2) {
                    this.ui.showNotification('請輸入問題，並至少建立兩個選項', true);
                    return;
                }

                // send start-poll to server (server will validate host)
                this.room.sendSignal('start-poll', { question: q, options: opts });

                // hide modal and clear inputs
                if (this.ui.elements.pollModal) this.ui.elements.pollModal.classList.add('hidden');
                if (this.ui.elements.pollQuestionInput) this.ui.elements.pollQuestionInput.value = '';
                if (this.ui.elements.pollOption1) this.ui.elements.pollOption1.value = '';
                if (this.ui.elements.pollOption2) this.ui.elements.pollOption2.value = '';
                if (this.ui.elements.pollOption3) this.ui.elements.pollOption3.value = '';
                this.ui.showNotification('投票已發出');
            });
        }

        // Poll container (delegated clicks for voting / end poll)
        if (this.ui.elements.pollContainer) {
            this.ui.elements.pollContainer.addEventListener('click', (e) => {
                const target = e.target;
                if (!target) return;
                // vote button
                if (target.classList && target.classList.contains('poll-option')) {
                    const idx = Number(target.dataset.index);
                    if (!this.room.currentRoom) return;
                    const pollId = this.room.currentPollId || null;
                    // prefer manager-stored currentPollId
                    const id = this.room.currentPollId || pollId || null;
                    if (!id) return;
                    this.room.sendSignal('vote', { pollId: id, optionIndex: idx });
                    this.ui.showNotification('已送出投票');
                    return;
                }

                // end poll (host only)
                if (target.id === 'endPollBtn') {
                    if (this.room.hostUserId !== this.room.user.id) {
                        this.ui.showNotification('只有房主可以結束投票', true);
                        return;
                    }
                    this.room.sendSignal('end-poll', {});
                    return;
                }
            });
            // close button on floating poll window
            const closeBtn = this.ui.elements.pollContainer.querySelector('#closePollWindow');
            if (closeBtn) {
                closeBtn.addEventListener('click', (ev) => {
                    ev.stopPropagation();
                    this.ui.clearPollDisplay();
                });
            }
        }

        this.ui.elements.sendBtn.addEventListener('click', () => this.sendMessage());
        this.ui.elements.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });

        this.ui.elements.reactionButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const emoji = btn.dataset.emoji;
                this.ui.createReaction(emoji, 'self');
                this.room.sendSignal('reaction', { emoji });
            });
        });
    }

    generateId() {
        return Math.random().toString(36).substr(2, 9);
    }

    async loadRooms() {
        try {
            const res = await fetch(`${CONFIG.API_BASE}/api/rooms`);
            const data = await res.json();
            this.ui.renderRooms(data.rooms || [], (id) => this.joinRoom(id));
        } catch (e) {
            console.error(e);
        }
    }

    async joinRoom(roomId) {
        if (!await this.room.initLocalStream()) return;

        try {
            const res = await fetch(`${CONFIG.API_BASE}/api/rooms/${roomId}/join`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: this.room.user.id, displayName: this.room.user.displayName })
            });

            if (!res.ok) throw new Error('Join failed');

            const data = await res.json();
            this.room.currentRoom = data.room;
            this.ui.toggleConferenceMode(true);
            this.room.connectSocket(roomId);
        } catch (e) {
            this.ui.showNotification('加入房間失敗', true);
            this.room.stopLocalStream();
        }
    }

    async leaveRoom() {
        if (this.room.currentRoom) {
            try {
                // If current user is the host, attempt to transfer host to another participant before leaving
                if (this.room.hostUserId === this.room.user.id && this.room.participants && this.room.participants.size > 0) {
                    const nextHostId = this.room.participants.keys().next().value;
                    if (nextHostId) {
                        // Optimistically transfer locally and notify server
                        this.room.hostUserId = nextHostId;
                        this.room.handleHostTransfer({ newHostUserId: nextHostId });
                        this.room.sendSignal('transfer-host', { newHostUserId: nextHostId });
                    }
                }

                await fetch(`${CONFIG.API_BASE}/api/rooms/${this.room.currentRoom.id}/leave`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: this.room.user.id })
                }).catch(() => { });
            } catch (err) {
                console.warn('leaveRoom: transfer attempt failed', err);
            }
        }

        this.room.currentRoom = null;
        this.room.stopLocalStream();
        if (this.room.socket) this.room.socket.close();
        this.room.peers.forEach(p => p.pc.close());
        this.room.peers.clear();

        this.ui.clearConference();
        this.ui.toggleConferenceMode(false);
        this.loadRooms();
    }

    sendMessage() {
        const text = this.ui.elements.messageInput.value.trim();
        if (text) {
            this.room.sendSignal('chat', { text });
            this.ui.elements.messageInput.value = '';
        }
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});



