// UNO Chess Game Engine & Controller

class UnoChessGame {
    constructor() {
        this.chess = new Chess();
        this.deck = new UnoDeck();
        
        // Game states: 'WAIT_CARD', 'MAKING_MOVES', 'RESURRECTING', 'GAME_OVER'
        this.state = 'WAIT_CARD';
        
        this.currentTurn = 'w'; // 'w' or 'b'
        this.currentCard = null;
        
        this.totalMovesForTurn = 0;
        this.movesRemaining = 0;
        
        // Set of square names (e.g. 'e4') that have already been moved this turn
        this.movedSquares = new Set();
        
        // Captured pieces: { w: ['p', 'n'], b: ['p'] } - pieces belonging to white/black that were captured
        this.capturedPieces = { w: [], b: [] };
        
        this.selectedSquare = null;
        this.legalMovesForSelected = [];
        this.lastMove = null; // { from, to }
        
        this.boardFlipped = false;
        this.history = [];
        
        // Resurrect state
        this.resurrectQueue = []; // pieces to place
        this.resurrectSelectedPiece = null;
        this.resurrectMovesRemaining = 0;
        this.pendingPromotion = null; // { from, to }
        this.snapshots = []; // Replay history snapshots: [{ fen, lastMove, captured, boardFlipped, text, type, turn }]
        this.currentSnapshotIdx = -1;
        this.isReviewing = false;

        this.humanColor = 'w';
        this.gameMode = 'pve'; // 'pve', 'pvp', 'eve'
        this.isPaused = false;
        this.ai = new UnoChessAI(this);

        this.initDOM();
        this.bindEvents();
        this.startNewGame();
    }

    initDOM() {
        this.dom = {
            board: document.getElementById('chessboard'),
            boardWrapper: document.getElementById('boardWrapper'),
            deckPile: document.getElementById('deckPile'),
            btnDrawCard: document.getElementById('btnDrawCard'),
            activeCardSlot: document.getElementById('activeCardSlot'),
            cardTitle: document.getElementById('cardTitle'),
            cardDesc: document.getElementById('cardDesc'),
            turnBadge: document.getElementById('turnBadge'),
            turnPlayerName: document.getElementById('turnPlayerName'),
            movesCount: document.getElementById('movesCount'),
            movesPill: document.getElementById('movesPill'),
            capturedWhite: document.getElementById('capturedWhite'),
            capturedBlack: document.getElementById('capturedBlack'),
            historyList: document.getElementById('historyList'),
            btnRestart: document.getElementById('btnRestart'),
            btnSound: document.getElementById('btnSound'),
            toastContainer: document.getElementById('toastContainer'),
            resurrectModal: document.getElementById('resurrectModal'),
            resurrectList: document.getElementById('resurrectList'),
            resurrectSkipBtn: document.getElementById('resurrectSkipBtn'),
            promotionModal: document.getElementById('promotionModal'),
            promotionList: document.getElementById('promotionList'),
            promotionCancelBtn: document.getElementById('promotionCancelBtn'),
            gameOverModal: document.getElementById('gameOverModal'),
            gameOverTitle: document.getElementById('gameOverTitle'),
            gameOverDesc: document.getElementById('gameOverDesc'),
            gameOverBtn: document.getElementById('gameOverBtn'),
            rulesModal: document.getElementById('rulesModal'),
            btnRules: document.getElementById('btnRules'),
            closeRulesBtn: document.getElementById('closeRulesBtn'),
            gameModeSelect: document.getElementById('gameModeSelect'),
            aiOptionsGroup: document.getElementById('aiOptionsGroup'),
            aiDifficultySelect: document.getElementById('aiDifficultySelect'),
            playerSideSelect: document.getElementById('playerSideSelect'),
            opponentAvatar: document.getElementById('opponentAvatar'),
            opponentName: document.getElementById('opponentName'),
            friendlyAvatar: document.getElementById('friendlyAvatar'),
            friendlyName: document.getElementById('friendlyName'),
            coordRanks: document.getElementById('coordRanks'),
            coordFiles: document.getElementById('coordFiles'),
            btnPauseBot: document.getElementById('btnPauseBot'),
            gameOverCloseX: document.getElementById('gameOverCloseX'),
            gameOverReviewBtn: document.getElementById('gameOverReviewBtn'),
            btnHistStart: document.getElementById('btnHistStart'),
            btnHistPrev: document.getElementById('btnHistPrev'),
            btnHistNext: document.getElementById('btnHistNext'),
            btnHistEnd: document.getElementById('btnHistEnd'),
            histStepIndicator: document.getElementById('histStepIndicator'),
            btnReturnToLive: document.getElementById('btnReturnToLive'),
            replayBanner: document.getElementById('replayBanner'),
            btnBannerReturn: document.getElementById('btnBannerReturn'),
            btnDeckConfig: document.getElementById('btnDeckConfig'),
            deckCounterPill: document.getElementById('deckCounterPill'),
            deckModal: document.getElementById('deckModal'),
            deckModalCloseX: document.getElementById('deckModalCloseX'),
            deckModalTotal: document.getElementById('deckModalTotal'),
            deckModalRemaining: document.getElementById('deckModalRemaining'),
            deckCardsContainer: document.getElementById('deckCardsContainer'),
            deckResetBtn: document.getElementById('deckResetBtn'),
            deckCancelBtn: document.getElementById('deckCancelBtn'),
            deckApplyBtn: document.getElementById('deckApplyBtn')
        };
    }

    bindEvents() {
        this.dom.btnDrawCard.addEventListener('click', () => {
            if (this.gameMode === 'eve') return;
            if (this.ai && this.ai.enabled && this.currentTurn === this.ai.aiColor) return;
            this.handleDrawCard(false);
        });
        this.dom.deckPile.addEventListener('click', () => {
            if (this.state === 'WAIT_CARD') {
                if (this.gameMode === 'eve') return;
                if (this.ai && this.ai.enabled && this.currentTurn === this.ai.aiColor) return;
                this.handleDrawCard(false);
            }
        });

        this.dom.btnRestart.addEventListener('click', () => this.startNewGame());
        this.dom.gameOverBtn.addEventListener('click', () => {
            this.dom.gameOverModal.classList.remove('active');
            this.startNewGame();
        });

        if (this.dom.gameOverCloseX) {
            this.dom.gameOverCloseX.addEventListener('click', () => {
                this.dom.gameOverModal.classList.remove('active');
                this.showToast('Режим просмотра: используйте кнопки истории или стрелочки ← →');
            });
        }

        if (this.dom.gameOverReviewBtn) {
            this.dom.gameOverReviewBtn.addEventListener('click', () => {
                this.dom.gameOverModal.classList.remove('active');
                this.showToast('Режим просмотра: используйте кнопки истории или стрелочки ← →');
            });
        }

        if (this.dom.btnHistStart) {
            this.dom.btnHistStart.addEventListener('click', () => this.jumpToSnapshot(0));
        }
        if (this.dom.btnHistPrev) {
            this.dom.btnHistPrev.addEventListener('click', () => this.stepSnapshot(-1));
        }
        if (this.dom.btnHistNext) {
            this.dom.btnHistNext.addEventListener('click', () => this.stepSnapshot(1));
        }
        if (this.dom.btnHistEnd) {
            this.dom.btnHistEnd.addEventListener('click', () => this.jumpToSnapshot(this.snapshots.length - 1));
        }
        if (this.dom.btnReturnToLive) {
            this.dom.btnReturnToLive.addEventListener('click', () => this.returnToLive());
        }
                const histToggle = document.getElementById('historyHeaderToggle');
        const histBody = document.getElementById('historyBody');
        const histIcon = document.getElementById('histToggleIcon');
        if (histToggle && histBody) {
            histToggle.addEventListener('click', (e) => {
                e.preventDefault();
                const willExpand = histBody.classList.contains('collapsed');
                histBody.classList.toggle('collapsed');
                if (histIcon) {
                    histIcon.textContent = willExpand ? '▴' : '▾';
                }
                if (willExpand) {
                    setTimeout(() => {
                        histBody.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }, 60);
                }
            });
        }

        if (this.dom.btnBannerReturn) {
            this.dom.btnBannerReturn.addEventListener('click', () => this.returnToLive());
        }

        // Keyboard arrow navigation
        document.addEventListener('keydown', (e) => {
            if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                this.stepSnapshot(-1);
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                this.stepSnapshot(1);
            } else if (e.key === 'Home') {
                e.preventDefault();
                this.jumpToSnapshot(0);
            } else if (e.key === 'End') {
                e.preventDefault();
                this.jumpToSnapshot(this.snapshots.length - 1);
            }
        });

        this.dom.btnSound.addEventListener('click', () => {
            const enabled = SoundFX.toggleSound();
            this.dom.btnSound.innerHTML = enabled ? '🔊 Звук' : '🔇 Без звука';
            this.showToast(enabled ? 'Звук включен' : 'Звук выключен');
        });

        if (this.dom.btnRules) {
            this.dom.btnRules.addEventListener('click', () => {
                this.dom.rulesModal.classList.add('active');
            });
        }
        if (this.dom.closeRulesBtn) {
            this.dom.closeRulesBtn.addEventListener('click', () => {
                this.dom.rulesModal.classList.remove('active');
            });
        }

        if (this.dom.btnDeckConfig) {
            this.dom.btnDeckConfig.addEventListener('click', () => this.openDeckModal());
        }
        if (this.dom.deckCounterPill) {
            this.dom.deckCounterPill.addEventListener('click', () => this.openDeckModal());
        }
        if (this.dom.deckModalCloseX) {
            this.dom.deckModalCloseX.addEventListener('click', () => this.closeDeckModal());
        }
        if (this.dom.deckCancelBtn) {
            this.dom.deckCancelBtn.addEventListener('click', () => this.closeDeckModal());
        }
        if (this.dom.deckResetBtn) {
            this.dom.deckResetBtn.addEventListener('click', () => {
                this.tempDeckConfig = { ...DECK_PRESETS.standard.counts };
                this.renderDeckModal();
            });
        }
        if (this.dom.deckApplyBtn) {
            this.dom.deckApplyBtn.addEventListener('click', () => this.applyDeckConfig());
        }

        if (this.dom.deckModal) {
            this.dom.deckModal.querySelectorAll('.btn-preset').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const presetKey = e.currentTarget.dataset.preset;
                    if (DECK_PRESETS[presetKey]) {
                        this.tempDeckConfig = { ...DECK_PRESETS[presetKey].counts };
                        this.renderDeckModal();
                    }
                });
            });
        }

        if (this.dom.promotionCancelBtn) {
            this.dom.promotionCancelBtn.addEventListener('click', () => {
                if (this.dom.promotionModal) this.dom.promotionModal.classList.remove('active');
                this.pendingPromotion = null;
                this.state = 'MAKING_MOVES';
                this.selectedSquare = null;
                this.legalMovesForSelected = [];
                this.renderBoard();
            });
        }

        this.dom.resurrectSkipBtn.addEventListener('click', () => {
            this.finishResurrect();
        });

        if (this.dom.gameModeSelect) {
            this.dom.gameModeSelect.addEventListener('change', () => {
                const mode = this.dom.gameModeSelect.value;
                const isPvE = mode === 'pve';
                const isEvE = mode === 'eve';

                if (this.dom.aiOptionsGroup) {
                    this.dom.aiOptionsGroup.classList.toggle('hidden', mode === 'pvp');
                }
                if (this.dom.playerSideSelect) {
                    this.dom.playerSideSelect.style.display = isEvE ? 'none' : '';
                }
                if (this.dom.btnPauseBot) {
                    this.dom.btnPauseBot.classList.toggle('hidden', !isEvE);
                    this.dom.btnPauseBot.innerHTML = '⏸ Пауза';
                }
                this.startNewGame();
            });
        }

        if (this.dom.btnPauseBot) {
            this.dom.btnPauseBot.addEventListener('click', () => {
                this.isPaused = !this.isPaused;
                this.dom.btnPauseBot.innerHTML = this.isPaused ? '▶ Продолжить' : '⏸ Пауза';
                this.showToast(this.isPaused ? '⏸ Битва ботов на паузе' : '▶ Битва ботов возобновлена');
                if (!this.isPaused && this.ai) {
                    this.ai.checkAiTurn();
                }
            });
        }

        if (this.dom.aiDifficultySelect) {
            this.dom.aiDifficultySelect.addEventListener('change', () => {
                this.ai.difficulty = this.dom.aiDifficultySelect.value;
                const labels = { easy: 'Лёгкий', medium: 'Средний', hard: 'Сложный' };
                this.showToast(`Сложность ИИ: ${labels[this.ai.difficulty] || this.ai.difficulty}`);
                this.updatePlayerLabels();
            });
        }

        if (this.dom.playerSideSelect) {
            this.dom.playerSideSelect.addEventListener('change', () => {
                this.startNewGame();
            });
        }
    }

    startNewGame() {
        if (this.ai) this.ai.clearTimer();

        this.chess.reset();
        this.deck.reset();
        this.state = 'WAIT_CARD';
        this.currentTurn = 'w';
        this.currentCard = null;
        this.totalMovesForTurn = 0;
        this.movesRemaining = 0;
        this.movedSquares.clear();
        this.capturedPieces = { w: [], b: [] };
        this.selectedSquare = null;
        this.legalMovesForSelected = [];
        this.lastMove = null;
        this.history = [];
        this.snapshots = [];
        this.currentSnapshotIdx = -1;
        this.isReviewing = false;
        if (this.dom && this.dom.replayBanner) this.dom.replayBanner.classList.add('hidden');
        if (this.dom && this.dom.promotionModal) this.dom.promotionModal.classList.remove('active');
        this.pendingPromotion = null;

        // Configure game mode & AI side
        const mode = this.dom.gameModeSelect ? this.dom.gameModeSelect.value : 'pve';
        this.gameMode = mode;
        this.isPaused = false;
        if (this.dom.btnPauseBot) {
            this.dom.btnPauseBot.classList.toggle('hidden', mode !== 'eve');
            this.dom.btnPauseBot.innerHTML = '⏸ Пауза';
        }

        if (this.ai) {
            if (this.dom.aiDifficultySelect) {
                this.ai.difficulty = this.dom.aiDifficultySelect.value;
            }
        }

        if (mode === 'eve') {
            this.humanColor = null;
            if (this.ai) {
                this.ai.enabled = true;
                this.ai.isEvE = true;
            }
            this.boardFlipped = false;
        } else if (mode === 'pve') {
            if (this.ai) {
                this.ai.enabled = true;
                this.ai.isEvE = false;
            }
            let side = this.dom.playerSideSelect ? this.dom.playerSideSelect.value : 'w';
            if (side === 'random') {
                side = Math.random() < 0.5 ? 'w' : 'b';
            }
            this.humanColor = side;
            if (this.ai) {
                this.ai.aiColor = this.humanColor === 'w' ? 'b' : 'w';
            }
            this.boardFlipped = (this.humanColor === 'b');
        } else {
            // pvp
            this.humanColor = null;
            if (this.ai) {
                this.ai.enabled = false;
                this.ai.isEvE = false;
            }
            this.boardFlipped = false;
        }

        this.boardFlipped = (this.humanColor === 'b');
        if (this.boardFlipped) {
            this.dom.boardWrapper.classList.add('flipped');
        } else {
            this.dom.boardWrapper.classList.remove('flipped');
        }

        this.updateCoordinates();
        this.updatePlayerLabels();

        this.dom.historyList.innerHTML = '';
        this.dom.activeCardSlot.innerHTML = `<div class="empty-slot-text">Нажмите "Тянуть карту", чтобы начать ход</div>`;
        this.dom.cardTitle.textContent = 'Ожидание карты';
        this.dom.cardDesc.textContent = 'Перед каждым ходом игрок должен вытянуть карту UNO!';

        const starterName = (this.humanColor === 'b') ? 'Белые (ход ИИ)' : 'Белые';
        this.logHistory(`Новая партия UNO Chess началась! Ход: ${starterName}.`, 'card-drawn');
        this.currentSnapshotIdx = this.snapshots.length - 1;
        this.updateHistoryControls();
        this.updateUI();
    }

    updateCoordinates() {
        if (!this.dom.coordRanks || !this.dom.coordFiles) return;
        const ranks = this.boardFlipped ? [1, 2, 3, 4, 5, 6, 7, 8] : [8, 7, 6, 5, 4, 3, 2, 1];
        const files = this.boardFlipped ? ['h', 'g', 'f', 'e', 'd', 'c', 'b', 'a'] : ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

        this.dom.coordRanks.innerHTML = ranks.map(r => `<span>${r}</span>`).join('');
        this.dom.coordFiles.innerHTML = files.map(f => `<span>${f}</span>`).join('');
    }

    updatePlayerLabels() {
        if (this.gameMode === 'eve') {
            const diffLabels = { easy: 'Легкий', medium: 'Средний', hard: 'Сложный' };
            const diffText = diffLabels[this.ai.difficulty] || 'Средний';
            if (this.dom.opponentAvatar) {
                this.dom.opponentAvatar.className = 'player-avatar avatar-black';
                this.dom.opponentAvatar.textContent = '🤖';
            }
            if (this.dom.opponentName) this.dom.opponentName.textContent = `Бот 2 (Черные, ${diffText})`;
            if (this.dom.friendlyAvatar) {
                this.dom.friendlyAvatar.className = 'player-avatar avatar-white';
                this.dom.friendlyAvatar.textContent = '🤖';
            }
            if (this.dom.friendlyName) this.dom.friendlyName.textContent = `Бот 1 (Белые, ${diffText})`;
            return;
        }

        if (!this.ai || !this.ai.enabled) {
            if (this.dom.opponentAvatar) {
                this.dom.opponentAvatar.className = 'player-avatar avatar-black';
                this.dom.opponentAvatar.textContent = '♚';
            }
            if (this.dom.opponentName) this.dom.opponentName.textContent = 'Черные';
            if (this.dom.friendlyAvatar) {
                this.dom.friendlyAvatar.className = 'player-avatar avatar-white';
                this.dom.friendlyAvatar.textContent = '♔';
            }
            if (this.dom.friendlyName) this.dom.friendlyName.textContent = 'Белые';
            return;
        }

        const diffLabels = { easy: 'Легкий', medium: 'Средний', hard: 'Сложный' };
        const diffText = diffLabels[this.ai.difficulty] || 'Средний';

        if (this.humanColor === 'w') {
            if (this.dom.opponentAvatar) {
                this.dom.opponentAvatar.className = 'player-avatar avatar-black';
                this.dom.opponentAvatar.textContent = '🤖';
            }
            if (this.dom.opponentName) this.dom.opponentName.textContent = `Бот (${diffText})`;
            if (this.dom.friendlyAvatar) {
                this.dom.friendlyAvatar.className = 'player-avatar avatar-white';
                this.dom.friendlyAvatar.textContent = '♔';
            }
            if (this.dom.friendlyName) this.dom.friendlyName.textContent = 'Игрок (Белые)';
        } else {
            if (this.dom.opponentAvatar) {
                this.dom.opponentAvatar.className = 'player-avatar avatar-white';
                this.dom.opponentAvatar.textContent = '🤖';
            }
            if (this.dom.opponentName) this.dom.opponentName.textContent = `Бот (${diffText})`;
            if (this.dom.friendlyAvatar) {
                this.dom.friendlyAvatar.className = 'player-avatar avatar-black';
                this.dom.friendlyAvatar.textContent = '♚';
            }
            if (this.dom.friendlyName) this.dom.friendlyName.textContent = 'Игрок (Черные)';
        }
    }

    showToast(message, duration = 2500) {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerHTML = message;
        this.dom.toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-10px)';
            toast.style.transition = 'all 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    recordSnapshot(text = '', type = '') {
        const snap = {
            fen: this.chess.fen(),
            lastMove: this.lastMove ? { ...this.lastMove } : null,
            captured: {
                w: [...this.capturedPieces.w],
                b: [...this.capturedPieces.b]
            },
            boardFlipped: this.boardFlipped,
            text: text,
            type: type,
            turn: this.currentTurn
        };
        this.snapshots.push(snap);
        return this.snapshots.length - 1;
    }

    logHistory(text, type = '') {
        const snapIdx = this.recordSnapshot(text, type);
        if (!this.isReviewing) {
            this.currentSnapshotIdx = snapIdx;
        }
        const item = document.createElement('div');
        item.className = `history-item ${type}`;
        item.textContent = text;
        item.dataset.snapIdx = snapIdx;
        item.title = 'Нажмите, чтобы посмотреть позицию на доске';
        item.addEventListener('click', () => this.jumpToSnapshot(snapIdx));
        this.dom.historyList.prepend(item);
        this.updateHistoryControls();
    }

    jumpToSnapshot(idx) {
        if (!this.snapshots || this.snapshots.length === 0) return;
        idx = Math.max(0, Math.min(idx, this.snapshots.length - 1));
        this.currentSnapshotIdx = idx;
        const isAtLive = (idx === this.snapshots.length - 1);
        this.isReviewing = !isAtLive;

        // Highlight active item in history
        const allItems = this.dom.historyList.querySelectorAll('.history-item');
        allItems.forEach(el => {
            const itemIdx = parseInt(el.dataset.snapIdx, 10);
            const isActive = (itemIdx === idx);
            el.classList.toggle('active-step', isActive);
            if (isActive) {
                el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        });

        if (this.dom.replayBanner) {
            this.dom.replayBanner.classList.toggle('hidden', isAtLive);
        }
        if (this.dom.btnReturnToLive) {
            this.dom.btnReturnToLive.classList.toggle('hidden', isAtLive);
        }

        this.updateHistoryControls();
        this.renderBoard();
        this.renderCaptured();
    }

    stepSnapshot(delta) {
        if (!this.snapshots || this.snapshots.length === 0) return;
        let targetIdx = this.currentSnapshotIdx;
        if (targetIdx === -1) targetIdx = this.snapshots.length - 1;
        targetIdx += delta;
        this.jumpToSnapshot(targetIdx);
    }

    returnToLive() {
        if (!this.snapshots || this.snapshots.length === 0) return;
        this.jumpToSnapshot(this.snapshots.length - 1);
    }

    updateHistoryControls() {
        if (!this.dom.btnHistStart) return;
        const total = this.snapshots ? this.snapshots.length : 0;
        let curr = this.currentSnapshotIdx;
        if (curr === -1) curr = Math.max(0, total - 1);

        this.dom.btnHistStart.disabled = (total <= 1 || curr === 0);
        this.dom.btnHistPrev.disabled = (total <= 1 || curr === 0);
        this.dom.btnHistNext.disabled = (total <= 1 || curr >= total - 1);
        this.dom.btnHistEnd.disabled = (total <= 1 || curr >= total - 1);

        if (this.dom.histStepIndicator) {
            if (total <= 1) {
                this.dom.histStepIndicator.textContent = '';
            } else if (curr === total - 1) {
                this.dom.histStepIndicator.textContent = `Ход ${total - 1}`;
            } else {
                this.dom.histStepIndicator.textContent = `Шаг ${curr} из ${total - 1}`;
            }
        }
    }

    /* UNO Card Draw & Resolution */
    handleDrawCard(isFromAi = false) {
        if (this.state !== 'WAIT_CARD') return;
        if (!isFromAi) {
            if (this.gameMode === 'eve') return;
            if (this.ai && this.ai.enabled && this.currentTurn === this.ai.aiColor) return;
        }

        this.state = 'CARD_DRAWING';
        this.dom.btnDrawCard.disabled = true;

        SoundFX.playDrawCard();
        this.currentCard = this.deck.draw();
        if (this.deck.justReshuffled) {
            this.deck.justReshuffled = false;
            this.showToast('🔀 Колода карт подошла к концу и была перемешана заново!');
        }

        // Protection: Reverse cannot be played on initial board if there are alternative cards
        let drewReverseOnTurn1 = false;
        let redrawAttempts = 0;
        const maxRedraw = Math.min(5, this.deck.cards.length);
        while (this.currentCard && this.currentCard.type === CARD_TYPES.REVERSE && this.chess.history().length === 0 && redrawAttempts < maxRedraw) {
            redrawAttempts++;
            drewReverseOnTurn1 = true;
            if (this.deck.discardPile.length > 0) {
                this.deck.discardPile.pop();
            }
            const mid = Math.floor(this.deck.cards.length / 2);
            this.deck.cards.splice(mid, 0, this.currentCard);
            this.currentCard = this.deck.draw();
        }
        if (drewReverseOnTurn1 && this.currentCard && this.currentCard.type !== CARD_TYPES.REVERSE) {
            this.showToast('🔄 На стартовой позиции Реверс перетянут: армии ещё на базе!');
        }
        
        // Render card
        this.dom.activeCardSlot.innerHTML = renderUnoCard(this.currentCard);
        this.dom.cardTitle.textContent = this.currentCard.title;
        this.dom.cardDesc.textContent = this.currentCard.desc;

        if (this.currentCard.type !== CARD_TYPES.REVERSE) {
            const playerStr = this.currentTurn === 'w' ? 'Белые' : 'Черные';
            this.logHistory(`${playerStr} вытянули: [${this.currentCard.title}]`, 'card-drawn');
        }

        this.resolveCardEffect(this.currentCard);
    }

    resolveCardEffect(card) {
        this.movedSquares.clear();

        switch (card.type) {
            case CARD_TYPES.NUMBER:
                if (card.value === 0) {
                    this.state = 'CARD_EFFECT';
                    this.showToast(`⛔ 0 Ходов! Ход пропускается!`);
                    SoundFX.playCheck();
                    if (this.passTurnTimeout) clearTimeout(this.passTurnTimeout);
                    this.passTurnTimeout = setTimeout(() => this.passTurn(), 1300);
                } else {
                    this.totalMovesForTurn = card.value;
                    this.movesRemaining = card.value;
                    this.state = 'MAKING_MOVES';
                    this.showToast(`Выпало ходов: ${card.value}. Правило: 1 фигура ходит только 1 раз!`);
                    this.updateUI();
                }
                break;

            case CARD_TYPES.SKIP:
                this.state = 'CARD_EFFECT';
                this.showToast(`🚫 Пропуск хода! Очередь переходит сопернику.`);
                SoundFX.playCheck();
                if (this.passTurnTimeout) clearTimeout(this.passTurnTimeout);
                this.passTurnTimeout = setTimeout(() => this.passTurn(), 1300);
                break;

            case CARD_TYPES.REVERSE:
                // Reverse: Players swap places and armies!
                this.startSidesSwapReverse();
                break;

            case CARD_TYPES.DRAW1:
                // +1: Resurrect 1 captured friendly piece, then 1 move with another piece
                SoundFX.playResurrect();
                const friendly1 = this.capturedPieces[this.currentTurn];
                if (friendly1.length > 0) {
                    this.showToast(`✨ +1: Верните 1 фигуру на свою половину!`);
                    this.openResurrectFlow(1, 1, this.currentTurn);
                } else {
                    this.showToast(`+1: Нет срубленных фигур для возврата! Делайте 1 ход.`);
                    this.totalMovesForTurn = 1;
                    this.movesRemaining = 1;
                    this.state = 'MAKING_MOVES';
                    this.updateUI();
                }
                break;

            case CARD_TYPES.MINUS1:
                // -1: Opponent resurrects 1 piece, then you make 1 move
                SoundFX.playResurrect();
                const oppColor1 = this.currentTurn === 'w' ? 'b' : 'w';
                const oppName1 = oppColor1 === 'w' ? 'Белые' : 'Чёрные';
                const oppCaptured1 = this.capturedPieces[oppColor1];
                if (oppCaptured1.length > 0) {
                    this.showToast(`🎁 -1: Подарок сопернику! ${oppName1} возвращают 1 фигуру!`);
                    this.openResurrectFlow(1, 1, oppColor1);
                } else {
                    this.showToast(`🎁 -1: У соперника нет срубленных фигур! Вы делаете 1 ход.`);
                    this.totalMovesForTurn = 1;
                    this.movesRemaining = 1;
                    this.state = 'MAKING_MOVES';
                    this.updateUI();
                }
                break;

            case CARD_TYPES.DRAW2:
                // +2: Resurrect up to 2 captured friendly pieces, then 1 move
                SoundFX.playResurrect();
                const friendlyCaptured = this.capturedPieces[this.currentTurn];
                if (friendlyCaptured.length > 0) {
                    this.showToast(`✨ +2: Верните до 2 фигур на свою половину!`);
                    this.openResurrectFlow(Math.min(2, friendlyCaptured.length), 1, this.currentTurn);
                } else {
                    this.showToast(`+2: Нет срубленных фигур для возврата! Делайте 1 ход.`);
                    this.totalMovesForTurn = 1;
                    this.movesRemaining = 1;
                    this.state = 'MAKING_MOVES';
                    this.updateUI();
                }
                break;

            case CARD_TYPES.MINUS2:
                // -2: Opponent gets to resurrect up to 2 pieces, then you make 1 move!
                SoundFX.playResurrect();
                const opponentColor = this.currentTurn === 'w' ? 'b' : 'w';
                const opponentName = opponentColor === 'w' ? 'Белые' : 'Чёрные';
                const opponentCaptured = this.capturedPieces[opponentColor];
                if (opponentCaptured.length > 0) {
                    this.showToast(`🎁 -2: Подарок сопернику! ${opponentName} возвращают до 2 фигур!`);
                    this.openResurrectFlow(Math.min(2, opponentCaptured.length), 1, opponentColor);
                } else {
                    this.showToast(`🎁 -2: У соперника нет срубленных фигур! Вы делаете 1 ход.`);
                    this.totalMovesForTurn = 1;
                    this.movesRemaining = 1;
                    this.state = 'MAKING_MOVES';
                    this.updateUI();
                }
                break;

            case CARD_TYPES.WILD:
                // Wild: 2 moves, and same piece IS ALLOWED to move twice
                this.showToast(`★ ДИКАЯ КАРТА! 2 хода любой фигурой (можно одной и той же)!`);
                this.totalMovesForTurn = 2;
                this.movesRemaining = 2;
                this.state = 'MAKING_MOVES';
                this.updateUI();
                break;

            case CARD_TYPES.WILD4:
                // Wild +4: Resurrect 1 piece AND make 2 moves!
                SoundFX.playResurrect();
                const capt = this.capturedPieces[this.currentTurn];
                if (capt.length > 0) {
                    this.showToast(`💥 +4 ДЖОКЕР: Верните 1 фигуру И сделайте 2 хода!`);
                    this.openResurrectFlow(1, 2);
                } else {
                    this.showToast(`💥 +4 ДЖОКЕР: Сделайте 2 хода разными фигурами!`);
                    this.totalMovesForTurn = 2;
                    this.movesRemaining = 2;
                    this.state = 'MAKING_MOVES';
                    this.updateUI();
                }
                break;
        }
    }


    startSidesSwapReverse() {
        this.state = 'ANIMATING_INVERT';
        this.dom.btnDrawCard.disabled = true;
        SoundFX.playReverse();

        // 1. Players swap sides!
        const whoDrew = this.currentTurn; // Color of the player who drew Reverse
        const nextColor = whoDrew === 'w' ? 'b' : 'w';

        const isWhoDrewWhite = whoDrew === 'w';
        let whoDrewName = isWhoDrewWhite ? 'Белые' : 'Черные';
        if (this.gameMode === 'eve') {
            whoDrewName = isWhoDrewWhite ? 'Бот 1 (Белые)' : 'Бот 2 (Черные)';
        } else if (this.ai && this.ai.enabled) {
            whoDrewName = (whoDrew === this.humanColor) ? `Вы (${whoDrewName})` : `Бот (${whoDrewName})`;
        }

        if (this.gameMode === 'eve') {
            this.boardFlipped = false;
        } else if (this.ai && this.ai.enabled) {
            // Swap colors between human and AI
            this.humanColor = this.humanColor === 'w' ? 'b' : 'w';
            this.ai.aiColor = this.ai.aiColor === 'w' ? 'b' : 'w';
            this.boardFlipped = (this.humanColor === 'b');
        } else {
            // PvP mode
            this.boardFlipped = (nextColor === 'b');
        }

        // The player who drew Reverse now commands the opposite army and makes 1 move with it!
        this.currentTurn = nextColor;
        this.syncChessTurn();

        // 2. Play 3D flip animation and scanning wave
        this.dom.boardWrapper.classList.add('invert-effect');
        const scanner = document.createElement('div');
        scanner.className = 'wave-scanner';
        this.dom.board.appendChild(scanner);

        setTimeout(() => {
            scanner.remove();
            this.dom.boardWrapper.classList.remove('invert-effect');

            this.updateCoordinates();
            this.updatePlayerLabels();

            const isWhite = this.currentTurn === 'w';
            const colorName = isWhite ? 'Белые' : 'Чёрные';
            let activeName = colorName;
            if (this.gameMode === 'eve') {
                activeName = isWhite ? 'Бот 1 (Белые)' : 'Бот 2 (Черные)';
            } else if (this.ai && this.ai.enabled) {
                activeName = (this.currentTurn === this.humanColor) ? `Вы (${colorName})` : `Бот (${colorName})`;
            }

            this.showToast(`🔄 РЕВЕРС! Игроки поменялись местами! Ходят ${activeName}!`);
            this.logHistory(`🔄 ${whoDrewName} вытянули [Реверс] ➔ Смена сторон! Ход: ${activeName}`, 'special-effect');

            this.totalMovesForTurn = 1;
            this.movesRemaining = 1;
            this.state = 'MAKING_MOVES';
            this.updateUI();
        }, 850);
    }

    openResurrectFlow(countToPlace, movesAfterResurrect, resurrectColor = null) {
        this.resurrectMovesRemaining = countToPlace;
        this.afterResurrectMoves = movesAfterResurrect;
        this.resurrectColor = resurrectColor || this.currentTurn;
        this.state = 'RESURRECTING';
        this.resurrectSelectedPiece = null;

        const targetColor = this.resurrectColor;
        const isAiResurrecting = this.gameMode === 'eve' || (this.ai && this.ai.enabled && targetColor === this.ai.aiColor);

        if (isAiResurrecting) {
            const targetName = targetColor === 'w' ? 'Белые (Бот)' : 'Чёрные (Бот)';
            this.showToast(`🤖 ${targetName} возвращают фигуру на поле...`);
            this.updateUI();
        } else {
            this.showResurrectModal();
            this.updateUI();
        }
    }

    showResurrectModal() {
        const targetColor = this.resurrectColor || this.currentTurn;
        const capturedList = this.capturedPieces[targetColor];
        if (capturedList.length === 0 || this.resurrectMovesRemaining <= 0) {
            this.finishResurrect();
            return;
        }

        // If AI is resurrecting, don't show the modal to the player
        if (this.gameMode === 'eve' || (this.ai && this.ai.enabled && targetColor === this.ai.aiColor)) {
            this.updateUI();
            return;
        }

        // Adjust modal title & description based on who is resurrecting
        const modalTitle = document.querySelector('#resurrectModal .modal-title');
        const modalDesc = document.querySelector('#resurrectModal .modal-desc');
        const targetName = targetColor === 'w' ? 'Белые' : 'Чёрные';

        if (targetColor !== this.currentTurn) {
            if (modalTitle) modalTitle.textContent = '🎁 Подарок сопернику (-2)';
            if (modalDesc) modalDesc.textContent = `${targetName} возвращают фигуру на свою половину доски (ранги ${targetColor === 'w' ? '1–4' : '5–8'}):`;
        } else {
            if (modalTitle) modalTitle.textContent = '✨ Возврат фигур (+2 / +4)';
            if (modalDesc) modalDesc.textContent = 'Выберите срубленную фигуру, которую хотите вернуть на свою половину доски:';
        }

        this.dom.resurrectList.innerHTML = '';
        capturedList.forEach((type, idx) => {
            const btn = document.createElement('div');
            btn.className = 'resurrect-piece-btn';
            btn.innerHTML = getPieceSvg(targetColor, type);
            btn.title = `Воскресить ${type.toUpperCase()}`;
            btn.addEventListener('click', () => {
                this.resurrectSelectedPiece = { type, index: idx };
                this.dom.resurrectModal.classList.remove('active');
                this.showToast(`${targetName}: выберите свободную клетку на половине ${targetName.toLowerCase()}`);
                this.renderBoard();
            });
            this.dom.resurrectList.appendChild(btn);
        });

        this.dom.resurrectModal.classList.add('active');
    }

    finishResurrect() {
        this.dom.resurrectModal.classList.remove('active');
        this.resurrectSelectedPiece = null;
        this.resurrectColor = null;

        // Turn returns to active player (this.currentTurn)
        this.totalMovesForTurn = this.afterResurrectMoves;
        this.movesRemaining = this.afterResurrectMoves;
        this.state = 'MAKING_MOVES';

        // Check if player has remaining legal moves with other pieces
        if (!this.hasRemainingLegalMoves()) {
            this.showToast('Нет доступных ходов другими фигурами. Ход завершен.');
            this.passTurn();
            return;
        }

        const isWhite = this.currentTurn === 'w';
        const colorName = isWhite ? 'Белые' : 'Чёрные';
        let activeName = colorName;
        if (this.ai && this.ai.enabled) {
            activeName = (this.currentTurn === this.humanColor) ? 'Вы' : 'Бот';
        }
        this.showToast(`Фигура призвана! ${activeName} делают ${this.movesRemaining} ход(а) ДРУГОЙ фигурой.`);
        this.updateUI();
    }

    /* Chessboard Square Clicking */
    handleSquareClick(square) {
        if (this.isReviewing) {
            // Clicking on board while reviewing returns to live game position!
            this.returnToLive();
            return;
        }
        if (this.gameMode === 'eve') {
            return; // In Bot vs Bot mode, moves are automated!
        }
        if (this.ai && this.ai.enabled && this.currentTurn === this.ai.aiColor) {
            const resurrectingTarget = this.resurrectColor || this.currentTurn;
            if (this.state === 'RESURRECTING' && resurrectingTarget === this.humanColor) {
                // Human is allowed to resurrect (e.g. AI played -2)
            } else {
                return; // Disallow human clicks during AI turn
            }
        }
        if (this.state === 'RESURRECTING') {
            this.handleResurrectPlacement(square);
            return;
        }

        if (this.state !== 'MAKING_MOVES') return;

        const piece = this.chess.get(square);

        // If clicking a destination square for already selected piece
        if (this.selectedSquare) {
            const isDestination = this.legalMovesForSelected.some(m => m.to === square);
            if (isDestination) {
                const piece = this.chess.get(this.selectedSquare);
                const isPawn = piece && piece.type === 'p';
                const targetRank = parseInt(square[1], 10);
                const isPromotion = isPawn && ((piece.color === 'w' && targetRank === 8) || (piece.color === 'b' && targetRank === 1));

                if (isPromotion) {
                    const isAiMoving = (this.gameMode === 'eve') || (this.ai && this.ai.enabled && this.currentTurn === this.ai.aiColor);
                    if (isAiMoving) {
                        this.executeMove(this.selectedSquare, square, 'q');
                    } else {
                        this.openPromotionModal(this.selectedSquare, square, piece.color);
                    }
                    return;
                }

                this.executeMove(this.selectedSquare, square);
                return;
            }
        }

        // Selecting a piece
        if (piece && piece.color === this.currentTurn) {
            // Check if piece is locked (already moved this turn, unless wild card)
            const isWildCard = this.currentCard && this.currentCard.type === CARD_TYPES.WILD;
            if (!isWildCard && this.movedSquares.has(square)) {
                this.showToast(`⚠️ Эта фигура уже ходила в этом раунде! Выберите другую.`);
                return;
            }

            this.selectedSquare = square;
            this.legalMovesForSelected = this.getValidMovesForSquare(square);

            if (this.legalMovesForSelected.length === 0) {
                this.showToast(`У этой фигуры нет доступных ходов!`);
            }
            this.renderBoard();
        } else {
            this.selectedSquare = null;
            this.legalMovesForSelected = [];
            this.renderBoard();
        }
    }

    getKingSquare(color) {
        const board = this.chess.board();
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const p = board[r][c];
                if (p && p.type === 'k' && p.color === color) {
                    const file = String.fromCharCode(97 + c);
                    const rank = 8 - r;
                    return file + rank;
                }
            }
        }
        return null;
    }

    doesPieceAttackSquare(pieceType, pieceColor, fromSquare, targetSquare) {
        if (!fromSquare || !targetSquare) return false;
        const f1 = fromSquare.charCodeAt(0) - 97;
        const r1 = parseInt(fromSquare[1], 10) - 1;
        const f2 = targetSquare.charCodeAt(0) - 97;
        const r2 = parseInt(targetSquare[1], 10) - 1;

        const df = f2 - f1;
        const dr = r2 - r1;
        const absDf = Math.abs(df);
        const absDr = Math.abs(dr);
        const type = pieceType.toLowerCase();

        if (type === 'n') {
            return (absDf === 1 && absDr === 2) || (absDf === 2 && absDr === 1);
        }

        if (type === 'p') {
            const pawnForward = pieceColor === 'w' ? 1 : -1;
            return absDf === 1 && dr === pawnForward;
        }

        if (type === 'b' || type === 'r' || type === 'q') {
            const isDiag = (absDf === absDr && absDf > 0);
            const isStraight = ((absDf === 0 && absDr > 0) || (absDr === 0 && absDf > 0));

            if (type === 'b' && !isDiag) return false;
            if (type === 'r' && !isStraight) return false;
            if (type === 'q' && !isDiag && !isStraight) return false;

            const stepF = absDf === 0 ? 0 : df / absDf;
            const stepR = absDr === 0 ? 0 : dr / absDr;

            let currF = f1 + stepF;
            let currR = r1 + stepR;

            while (currF !== f2 || currR !== r2) {
                const sqName = String.fromCharCode(97 + currF) + (currR + 1);
                if (this.chess.get(sqName)) {
                    return false; // Ray is blocked
                }
                currF += stepF;
                currR += stepR;
            }
            return true;
        }

        if (type === 'k') {
            return absDf <= 1 && absDr <= 1;
        }

        return false;
    }

    isValidResurrectSquare(square, pieceType, targetColor) {
        if (this.chess.get(square)) return false;

        const rank = parseInt(square[1], 10);
        const isWhite = targetColor === 'w';
        const validRank = isWhite ? (rank >= 1 && rank <= 4) : (rank >= 5 && rank <= 8);
        if (!validRank) return false;

        // Pawns cannot be placed on ranks 1 or 8
        if (pieceType.toLowerCase() === 'p' && (rank === 1 || rank === 8)) {
            return false;
        }

        // Rule: No check on drop! Placing this piece must NOT immediately deliver check to enemy King.
        // We verify geometrically if the newly placed piece itself directly attacks the enemy King.
        // This correctly allows placement even if the enemy King is ALREADY in check from another piece!
        const oppColor = targetColor === 'w' ? 'b' : 'w';
        const enemyKingSquare = this.getKingSquare(oppColor);
        if (enemyKingSquare) {
            if (this.doesPieceAttackSquare(pieceType, targetColor, square, enemyKingSquare)) {
                return false;
            }
        }

        return true;
    }

    handleResurrectPlacement(square) {
        if (!this.resurrectSelectedPiece) {
            this.showResurrectModal();
            return;
        }

        const file = square[0];
        const rank = parseInt(square[1], 10);

        const targetColor = this.resurrectColor || this.currentTurn;
        if (!this.isValidResurrectSquare(square, this.resurrectSelectedPiece.type, targetColor)) {
            this.showToast(`Недопустимое поле! Нельзя ставить фигуру вне своей половины или с прямым шахом.`);
            return;
        }

        // Place piece onto board
        const success = this.chess.put({
            type: this.resurrectSelectedPiece.type,
            color: targetColor
        }, square);

        if (success) {
            SoundFX.playResurrect();
            // Remove from captured list
            this.capturedPieces[targetColor].splice(this.resurrectSelectedPiece.index, 1);
            const colorName = targetColor === 'w' ? 'Белые' : 'Черные';
            this.logHistory(`${colorName} вернули ${this.resurrectSelectedPiece.type.toUpperCase()} на ${square.toUpperCase()}`, 'special-effect');
            
            // Rule: Summoning Sickness!
            // Freshly resurrected piece cannot move in the same turn:
            this.movedSquares.add(square);

            this.resurrectSelectedPiece = null;
            this.resurrectMovesRemaining--;

            if (this.resurrectMovesRemaining > 0 && this.capturedPieces[targetColor].length > 0) {
                if (this.gameMode === 'eve' || (this.ai && this.ai.enabled && targetColor === this.ai.aiColor)) {
                    this.updateUI();
                } else {
                    this.showResurrectModal();
                }
            } else {
                this.finishResurrect();
            }
        } else {
            this.showToast(`Ошибка размещения фигуры на ${square}`);
        }
    }

    getValidMovesForSquare(square) {
        // Force turn in chess.js to current active turn
        this.syncChessTurn();

        const allMoves = this.chess.moves({ verbose: true });
        return allMoves.filter(m => m.from === square && m.captured !== 'k');
    }

    syncChessTurn() {
        let fenTokens = this.chess.fen().split(' ');
        if (fenTokens[1] !== this.currentTurn) {
            fenTokens[1] = this.currentTurn;
            fenTokens[3] = '-'; // Clear en-passant square to ensure valid FEN for consecutive moves!
            this.chess.load(fenTokens.join(' '));
        }
    }

    openPromotionModal(fromSquare, toSquare, color) {
        this.state = 'PROMOTING';
        this.pendingPromotion = { from: fromSquare, to: toSquare };
        if (!this.dom.promotionList) return;
        this.dom.promotionList.innerHTML = '';

        const options = [
            { type: 'q', name: 'Ферзь' },
            { type: 'n', name: 'Конь' },
            { type: 'r', name: 'Ладья' },
            { type: 'b', name: 'Слон' }
        ];

        options.forEach(opt => {
            const btn = document.createElement('div');
            btn.className = 'promotion-piece-btn';
            btn.title = opt.name;
            btn.innerHTML = getPieceSvg(color, opt.type);
            btn.addEventListener('click', () => {
                if (this.dom.promotionModal) this.dom.promotionModal.classList.remove('active');
                this.state = 'MAKING_MOVES';
                const pending = this.pendingPromotion;
                this.pendingPromotion = null;
                if (pending) {
                    this.executeMove(pending.from, pending.to, opt.type);
                }
            });
            this.dom.promotionList.appendChild(btn);
        });

        if (this.dom.promotionModal) {
            this.dom.promotionModal.classList.add('active');
        }
    }

    executeMove(fromSquare, toSquare, promotionChoice = 'q') {
        this.syncChessTurn();

        // Check if pawn promotion
        const piece = this.chess.get(fromSquare);
        let promotion = undefined;
        if (piece && piece.type === 'p') {
            const targetRank = parseInt(toSquare[1], 10);
            if ((piece.color === 'w' && targetRank === 8) || (piece.color === 'b' && targetRank === 1)) {
                promotion = promotionChoice || 'q';
            }
        }

        const moveResult = this.chess.move({
            from: fromSquare,
            to: toSquare,
            promotion: promotion
        });

        if (!moveResult) {
            this.showToast('Недопустимый ход!');
            return;
        }

        const promoNote = moveResult.promotion ? ` (Превращение в ${moveResult.promotion.toUpperCase()})` : '';

        // Play sound
        if (moveResult.captured) {
            SoundFX.playCapture();
            // Record captured piece
            const enemyColor = this.currentTurn === 'w' ? 'b' : 'w';
            this.capturedPieces[enemyColor].push(moveResult.captured);
            this.logHistory(`${fromSquare}x${toSquare}${promoNote} (взятие ${moveResult.captured.toUpperCase()})`, 'check-move');
        } else {
            SoundFX.playMove();
            let moveText = `${fromSquare} ➔ ${toSquare}${promoNote}`;
            if (moveResult.flags && moveResult.flags.includes('k')) {
                moveText = `${fromSquare} ➔ ${toSquare} (0-0 Короткая рокировка)`;
                this.movedSquares.add(`f${fromSquare[1]}`);
            } else if (moveResult.flags && moveResult.flags.includes('q')) {
                moveText = `${fromSquare} ➔ ${toSquare} (0-0-0 Длинная рокировка)`;
                this.movedSquares.add(`d${fromSquare[1]}`);
            }
            this.logHistory(moveText);
        }

        this.lastMove = { from: fromSquare, to: toSquare };
        // Mark piece destination as moved
        this.movedSquares.add(toSquare);

        this.selectedSquare = null;
        this.legalMovesForSelected = [];
        this.movesRemaining--;

        // Check for King capture or Checkmate
        if (this.checkGameEndCondition()) {
            return;
        }

        if (this.chess.in_check()) {
            SoundFX.playCheck();
            if (this.movesRemaining > 0) {
                // Marseillais Rule: Check concludes multi-move sequence immediately!
                // The defender must have the turn right away to defend against check.
                this.movesRemaining = 0;
                this.showToast('⚠️ ШАХ! Оставшиеся ходы завершены — очередь соперника защищаться!');
                this.passTurn();
                return;
            } else {
                this.showToast('⚠️ ШАХ!');
                this.passTurn();
                return;
            }
        }

        // If more moves remaining for this turn (and NOT in check):
        if (this.movesRemaining > 0) {
            // Keep turn for the same color
            this.syncChessTurn();

            // Check if player has any legal moves left with unmoved pieces
            if (!this.hasRemainingLegalMoves()) {
                this.showToast('Нет доступных ходов оставшимися фигурами. Ход завершен.');
                this.passTurn();
            } else {
                this.showToast(`Осталось ходов: ${this.movesRemaining}. Выберите ДРУГУЮ фигуру.`);
                this.updateUI();
            }
        } else {
            // Turn completed
            this.passTurn();
        }
    }

    hasRemainingLegalMoves() {
        this.syncChessTurn();
        const allMoves = this.chess.moves({ verbose: true });
        const isWildCard = this.currentCard && this.currentCard.type === CARD_TYPES.WILD;

        if (isWildCard) {
            return allMoves.length > 0;
        }

        // Must find at least 1 move where 'from' is NOT in movedSquares
        return allMoves.some(m => !this.movedSquares.has(m.from));
    }

    checkGameEndCondition() {
        // Did anyone capture a King?
        let whiteKing = false, blackKing = false;
        const board = this.chess.board();
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const p = board[r][c];
                if (p && p.type === 'k') {
                    if (p.color === 'w') whiteKing = true;
                    if (p.color === 'b') blackKing = true;
                }
            }
        }

        if (!whiteKing) {
            this.endGame('Черные', 'Король белых повержен!');
            return true;
        }
        if (!blackKing) {
            this.endGame('Белые', 'Король черных повержен!');
            return true;
        }

        if (this.chess.in_checkmate()) {
            const winner = this.currentTurn === 'w' ? 'Белые' : 'Черные';
            this.endGame(winner, 'Мат королю!');
            return true;
        }

        if (this.chess.in_draw() || this.chess.in_stalemate()) {
            this.endGame('Ничья', 'Пат / Недостаточно фигур для победы.');
            return true;
        }

        return false;
    }

    endGame(winner, reason) {
        this.state = 'GAME_OVER';
        SoundFX.playVictory();
        this.dom.gameOverTitle.textContent = winner === 'Ничья' ? 'Ничья!' : `Победа: ${winner}! 👑`;
        this.dom.gameOverDesc.textContent = reason;
        this.dom.gameOverModal.classList.add('active');
        this.updateUI();
    }

    passTurn() {
        if (this.ai) this.ai.clearTimer();
        if (this.passTurnTimeout) {
            clearTimeout(this.passTurnTimeout);
            this.passTurnTimeout = null;
        }
        this.currentTurn = this.currentTurn === 'w' ? 'b' : 'w';
        this.syncChessTurn();
        this.state = 'WAIT_CARD';
        this.currentCard = null;
        this.totalMovesForTurn = 0;
        this.movesRemaining = 0;
        this.movedSquares.clear();
        this.selectedSquare = null;
        this.legalMovesForSelected = [];

        const isAiNext = this.gameMode === 'eve' || (this.ai && this.ai.enabled && this.currentTurn === this.ai.aiColor);
        const botWaitText = this.gameMode === 'eve' ? `${this.currentTurn === 'w' ? 'Бот 1' : 'Бот 2'} вытягивает карту...` : 'Бот вытягивает карту...';
        this.dom.activeCardSlot.innerHTML = `<div class="empty-slot-text">${isAiNext ? botWaitText : 'Нажмите "Тянуть карту", чтобы начать ход'}</div>`;

        this.updateUI();
    }

    /* UI Rendering */
    updateUI() {
        const isWhite = this.currentTurn === 'w';
        let turnName = isWhite ? 'Ход Белых' : 'Ход Черных';
        if (this.gameMode === 'eve') {
            turnName = isWhite ? 'Ход Бота 1 (Белые)' : 'Ход Бота 2 (Черные)';
        } else if (this.ai && this.ai.enabled) {
            if (this.currentTurn === this.ai.aiColor) {
                turnName = `Ход Бота (${isWhite ? 'Белые' : 'Черные'})`;
            } else {
                turnName = `Ваш ход (${isWhite ? 'Белые' : 'Черные'})`;
            }
        }
        this.dom.turnPlayerName.textContent = turnName;
        this.dom.turnBadge.className = `turn-badge ${isWhite ? 'white-turn' : 'black-turn'}`;

        const isAiTurn = this.gameMode === 'eve' || (this.ai && this.ai.enabled && this.currentTurn === this.ai.aiColor);

        if (this.state === 'WAIT_CARD') {
            this.dom.btnDrawCard.disabled = isAiTurn;
            this.dom.movesPill.style.display = 'none';
            if (isAiTurn) {
                this.dom.cardTitle.textContent = '🤖 Бот думает...';
                this.dom.cardDesc.textContent = 'Бот вытягивает карту UNO...';
            } else {
                this.dom.cardTitle.textContent = 'Ожидание карты';
                this.dom.cardDesc.textContent = 'Перед каждым ходом вытяните карту UNO, чтобы узнать эффект и число ходов!';
            }
        } else {
            this.dom.btnDrawCard.disabled = true;
            this.dom.movesPill.style.display = 'inline-flex';
            this.dom.movesCount.textContent = `${this.movesRemaining} / ${this.totalMovesForTurn}`;
            if (isAiTurn) {
                this.dom.cardTitle.textContent = '🤖 Бот ходит...';
            }
        }

        this.renderCaptured();
        this.renderBoard();
        this.updateDeckCounterPill();

        // Trigger AI check
        if (this.ai) {
            this.ai.checkAiTurn();
        }
    }

    renderCaptured() {
        this.dom.capturedWhite.innerHTML = '';
        this.dom.capturedBlack.innerHTML = '';

        // In flipped board: top bar is White, bottom bar is Black.
        // In standard board: top bar is Black, bottom bar is White.
        const topColor = this.boardFlipped ? 'w' : 'b';
        const bottomColor = this.boardFlipped ? 'b' : 'w';

        let capturedSrc = this.capturedPieces;
        if (this.isReviewing && this.currentSnapshotIdx >= 0 && this.currentSnapshotIdx < this.snapshots.length) {
            capturedSrc = this.snapshots[this.currentSnapshotIdx].captured;
        }

        capturedSrc[topColor].forEach(type => {
            const el = document.createElement('div');
            el.className = 'captured-item';
            el.innerHTML = getPieceSvg(topColor, type);
            this.dom.capturedBlack.appendChild(el);
        });

        capturedSrc[bottomColor].forEach(type => {
            const el = document.createElement('div');
            el.className = 'captured-item';
            el.innerHTML = getPieceSvg(bottomColor, type);
            this.dom.capturedWhite.appendChild(el);
        });
    }

    renderBoard() {
        this.dom.board.innerHTML = '';
        const files = this.boardFlipped ? ['h', 'g', 'f', 'e', 'd', 'c', 'b', 'a'] : ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
        const ranks = this.boardFlipped ? [1, 2, 3, 4, 5, 6, 7, 8] : [8, 7, 6, 5, 4, 3, 2, 1];

        const isWildCard = this.currentCard && this.currentCard.type === CARD_TYPES.WILD;

        // Support reviewing past moves in history
        let boardChess = this.chess;
        let activeLastMove = this.lastMove;
        const isReview = (this.isReviewing && this.currentSnapshotIdx >= 0 && this.currentSnapshotIdx < this.snapshots.length);
        if (isReview) {
            const snap = this.snapshots[this.currentSnapshotIdx];
            boardChess = new Chess(snap.fen);
            activeLastMove = snap.lastMove;
        }

        ranks.forEach(rank => {
            files.forEach(file => {
                const sq = `${file}${rank}`;
                const sqEl = document.createElement('div');
                sqEl.className = `square ${(rank + files.indexOf(file)) % 2 === 0 ? 'dark' : 'light'}`;
                sqEl.dataset.square = sq;

                const piece = boardChess.get(sq);

                // Highlight last move
                if (activeLastMove && (activeLastMove.from === sq || activeLastMove.to === sq)) {
                    sqEl.classList.add('last-move');
                }

                // Highlight selected (only in live mode)
                if (!isReview && this.selectedSquare === sq) {
                    sqEl.classList.add('selected');
                }

                // Check highlight on king
                if (piece && piece.type === 'k' && piece.color === boardChess.turn() && boardChess.in_check()) {
                    sqEl.classList.add('in-check');
                }

                // Disabled indicator if already moved this turn
                if (piece && piece.color === this.currentTurn && !isWildCard && this.movedSquares.has(sq)) {
                    sqEl.classList.add('disabled-moved');
                }

                // Highlight legal destination hints (only in live mode)
                if (!isReview && this.selectedSquare) {
                    const moveMatch = this.legalMovesForSelected.find(m => m.to === sq);
                    if (moveMatch) {
                        if (moveMatch.captured) {
                            const ring = document.createElement('div');
                            ring.className = 'move-hint-capture';
                            sqEl.appendChild(ring);
                        } else {
                            const dot = document.createElement('div');
                            dot.className = 'move-hint-dot';
                            sqEl.appendChild(dot);
                        }
                    }
                }

                // Highlight valid squares for resurrection (only in live mode)
                if (!isReview && this.state === 'RESURRECTING' && this.resurrectSelectedPiece) {
                    const targetColor = this.resurrectColor || this.currentTurn;
                    if (this.isValidResurrectSquare(sq, this.resurrectSelectedPiece.type, targetColor)) {
                        sqEl.classList.add('valid-resurrect');
                    }
                }

                // Piece SVG
                if (piece) {
                    const svgHtml = getPieceSvg(piece.color, piece.type);
                    const pieceEl = document.createElement('div');
                    pieceEl.className = 'piece-svg';
                    pieceEl.innerHTML = svgHtml;
                    sqEl.appendChild(pieceEl);
                }

                sqEl.addEventListener('click', () => this.handleSquareClick(sq));
                this.dom.board.appendChild(sqEl);
            });
        });
    }

    /* Deck Configuration Modal & Pill Controller */
    updateDeckCounterPill() {
        if (!this.dom.deckCounterPill) return;
        const rem = this.deck ? this.deck.remainingCount : 53;
        const tot = this.deck ? this.deck.totalCount : 53;
        this.dom.deckCounterPill.textContent = `🃏 ${rem} карт`;
        this.dom.deckCounterPill.title = `В колоде осталось: ${rem} из ${tot} карт. Нажмите для настройки.`;
    }

    openDeckModal() {
        if (!this.dom.deckModal) return;
        this.tempDeckConfig = this.deck && this.deck.config ? { ...this.deck.config } : UnoDeck.loadConfig();
        this.renderDeckModal();
        this.dom.deckModal.classList.add('active');
    }

    closeDeckModal() {
        if (this.dom.deckModal) {
            this.dom.deckModal.classList.remove('active');
        }
    }

    renderDeckModal() {
        if (!this.dom.deckCardsContainer) return;

        let total = 0;
        for (const k in this.tempDeckConfig) {
            total += (this.tempDeckConfig[k] || 0);
        }

        if (this.dom.deckModalTotal) {
            this.dom.deckModalTotal.textContent = `${total}`;
        }
        if (this.dom.deckModalRemaining) {
            this.dom.deckModalRemaining.textContent = `${this.deck ? this.deck.remainingCount : total}`;
        }

        // Highlight preset buttons if matches
        if (this.dom.deckModal) {
            this.dom.deckModal.querySelectorAll('.btn-preset').forEach(btn => {
                const pKey = btn.dataset.preset;
                const p = DECK_PRESETS[pKey];
                let isMatch = false;
                if (p) {
                    isMatch = Object.keys(p.counts).every(k => (this.tempDeckConfig[k] || 0) === p.counts[k]);
                }
                btn.classList.toggle('active', isMatch);
            });
        }

        this.dom.deckCardsContainer.innerHTML = '';

        CARD_CONFIG_SCHEMA.forEach(item => {
            const count = this.tempDeckConfig[item.key] || 0;
            const row = document.createElement('div');
            row.className = `deck-card-row ${count === 0 ? 'disabled' : ''}`;

            const miniColorClass = `mini-${item.color}`;
            row.innerHTML = `
                <div class="deck-card-left">
                    <div class="deck-card-mini ${miniColorClass}">${item.symbol}</div>
                    <div class="deck-card-info">
                        <div class="deck-card-title">${item.title}</div>
                        <div class="deck-card-desc">${item.desc}</div>
                    </div>
                </div>
                <div class="stepper">
                    <button type="button" class="stepper-btn btn-dec" data-key="${item.key}" ${count <= 0 ? 'disabled' : ''}>−</button>
                    <span class="stepper-val" id="stepperVal_${item.key}">${count}</span>
                    <button type="button" class="stepper-btn btn-inc" data-key="${item.key}">+</button>
                </div>
            `;

            const decBtn = row.querySelector('.btn-dec');
            const incBtn = row.querySelector('.btn-inc');
            const valSpan = row.querySelector(`#stepperVal_${item.key}`);

            decBtn.addEventListener('click', () => {
                let current = this.tempDeckConfig[item.key] || 0;
                if (current > 0) {
                    current--;
                    this.tempDeckConfig[item.key] = current;
                    valSpan.textContent = current;
                    decBtn.disabled = current <= 0;
                    row.classList.toggle('disabled', current === 0);
                    this.updateDeckModalTotals();
                }
            });

            incBtn.addEventListener('click', () => {
                let current = this.tempDeckConfig[item.key] || 0;
                if (current < 30) {
                    current++;
                    this.tempDeckConfig[item.key] = current;
                    valSpan.textContent = current;
                    decBtn.disabled = false;
                    row.classList.remove('disabled');
                    this.updateDeckModalTotals();
                }
            });

            this.dom.deckCardsContainer.appendChild(row);
        });
    }

    updateDeckModalTotals() {
        let total = 0;
        for (const k in this.tempDeckConfig) {
            total += (this.tempDeckConfig[k] || 0);
        }
        if (this.dom.deckModalTotal) {
            this.dom.deckModalTotal.textContent = `${total}`;
        }
        if (this.dom.deckModal) {
            this.dom.deckModal.querySelectorAll('.btn-preset').forEach(btn => {
                const pKey = btn.dataset.preset;
                const p = DECK_PRESETS[pKey];
                let isMatch = false;
                if (p) {
                    isMatch = Object.keys(p.counts).every(k => (this.tempDeckConfig[k] || 0) === p.counts[k]);
                }
                btn.classList.toggle('active', isMatch);
            });
        }
    }

    applyDeckConfig() {
        let total = 0;
        for (const k in this.tempDeckConfig) {
            total += (this.tempDeckConfig[k] || 0);
        }
        if (total <= 0) {
            this.showToast('⚠️ Колода не может быть пустой!');
            return;
        }

        UnoDeck.saveConfig(this.tempDeckConfig);
        this.deck.reset(this.tempDeckConfig);
        this.closeDeckModal();
        this.showToast(`🃏 Новая колода сохранена (${total} карт)! Начинаем новую партию...`);
        this.startNewGame();
    }
}

// Instantiate on DOM load
window.addEventListener('DOMContentLoaded', () => {
    window.game = new UnoChessGame();
});
