// UNO Chess AI Engine (Easy, Medium, Hard)
// Supports multi-moves, card drawing, smart resurrection, and Uno Chess rules.

class UnoChessAI {
    constructor(game) {
        this.game = game;
        this.enabled = true; // default: vs AI
        this.aiColor = 'b';  // default: AI plays black
        this.isEvE = false;
        this.difficulty = 'medium'; // 'easy' | 'medium' | 'hard'
        this.isThinking = false;
        this.timer = null;

        // Piece values in centipawns
        this.pieceValues = {
            p: 100,
            n: 320,
            b: 330,
            r: 500,
            q: 900,
            k: 20000
        };

        // Positional Piece-Square Tables (from White's perspective; inverted for Black)
        this.pst = {
            p: [
                [0,  0,  0,  0,  0,  0,  0,  0],
                [50, 50, 50, 50, 50, 50, 50, 50],
                [10, 10, 20, 30, 30, 20, 10, 10],
                [5,  5, 10, 25, 25, 10,  5,  5],
                [0,  0,  0, 20, 20,  0,  0,  0],
                [5, -5,-10,  0,  0,-10, -5,  5],
                [5, 10, 10,-20,-20, 10, 10,  5],
                [0,  0,  0,  0,  0,  0,  0,  0]
            ],
            n: [
                [-50,-40,-30,-30,-30,-30,-40,-50],
                [-40,-20,  0,  0,  0,  0,-20,-40],
                [-30,  0, 10, 15, 15, 10,  0,-30],
                [-30,  5, 15, 20, 20, 15,  5,-30],
                [-30,  0, 15, 20, 20, 15,  0,-30],
                [-30,  5, 10, 15, 15, 10,  5,-30],
                [-40,-20,  0,  5,  5,  0,-20,-40],
                [-50,-40,-30,-30,-30,-30,-40,-50]
            ],
            b: [
                [-20,-10,-10,-10,-10,-10,-10,-20],
                [-10,  0,  0,  0,  0,  0,  0,-10],
                [-10,  0,  5, 10, 10,  5,  0,-10],
                [-10,  5,  5, 10, 10,  5,  5,-10],
                [-10,  0, 10, 10, 10, 10,  0,-10],
                [-10, 10, 10, 10, 10, 10, 10,-10],
                [-10,  5,  0,  0,  0,  0,  5,-10],
                [-20,-10,-10,-10,-10,-10,-10,-20]
            ],
            r: [
                [0,  0,  0,  0,  0,  0,  0,  0],
                [5, 10, 10, 10, 10, 10, 10,  5],
                [-5,  0,  0,  0,  0,  0,  0, -5],
                [-5,  0,  0,  0,  0,  0,  0, -5],
                [-5,  0,  0,  0,  0,  0,  0, -5],
                [-5,  0,  0,  0,  0,  0,  0, -5],
                [-5,  0,  0,  0,  0,  0,  0, -5],
                [0,  0,  0,  5,  5,  0,  0,  0]
            ],
            q: [
                [-20,-10,-10, -5, -5,-10,-10,-20],
                [-10,  0,  0,  0,  0,  0,  0,-10],
                [-10,  0,  5,  5,  5,  5,  0,-10],
                [-5,  0,  5,  5,  5,  5,  0, -5],
                [0,  0,  5,  5,  5,  5,  0, -5],
                [-10,  5,  5,  5,  5,  5,  0,-10],
                [-10,  0,  5,  0,  0,  0,  0,-10],
                [-20,-10,-10, -5, -5,-10,-10,-20]
            ],
            k: [
                [-30,-40,-40,-50,-50,-40,-40,-30],
                [-30,-40,-40,-50,-50,-40,-40,-30],
                [-30,-40,-40,-50,-50,-40,-40,-30],
                [-30,-40,-40,-50,-50,-40,-40,-30],
                [-20,-30,-30,-40,-40,-30,-30,-20],
                [-10,-20,-20,-20,-20,-20,-20,-10],
                [20, 20,  0,  0,  0,  0, 20, 20],
                [20, 30, 10,  0,  0, 10, 30, 20]
            ]
        };
    }

    clearTimer() {
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
        this.isThinking = false;
    }

    getActiveColor() {
        return this.isEvE ? this.game.currentTurn : this.aiColor;
    }

    // Called on state change / UI updates to check if AI must act
    checkAiTurn() {
        if (!this.enabled) return;
        if (this.game.state === 'GAME_OVER') return;
        if (this.game.isPaused) return;

        // 1. AI needs to resurrect pieces?
        if (this.game.state === 'RESURRECTING') {
            const targetColor = this.game.resurrectColor || this.game.currentTurn;
            const isBotResurrect = this.isEvE || (targetColor === this.aiColor);
            if (isBotResurrect) {
                if (this.isThinking) return;
                this.isThinking = true;
                if (this.game.dom.resurrectModal) {
                    this.game.dom.resurrectModal.classList.remove('active');
                }
                this.timer = setTimeout(() => {
                    this.executeAiResurrect();
                }, 800);
            }
            return;
        }

        // 2. Is it AI's turn?
        const isAiTurn = this.isEvE || (this.game.currentTurn === this.aiColor);
        if (!isAiTurn) {
            this.isThinking = false;
            return;
        }

        // 3. AI needs to draw a card?
        if (this.game.state === 'WAIT_CARD') {
            if (this.isThinking) return;
            this.isThinking = true;
            this.timer = setTimeout(() => {
                this.isThinking = false;
                this.game.handleDrawCard(true);
            }, 850);
            return;
        }

        // 4. AI needs to make a move?
        if (this.game.state === 'MAKING_MOVES') {
            if (this.isThinking) return;
            this.isThinking = true;
            this.timer = setTimeout(() => {
                this.executeAiMove();
            }, 750);
            return;
        }
    }

    // Get legal moves satisfying UNO constraints
    getLegalMovesForAi() {
        this.game.syncChessTurn();
        const allMoves = this.game.chess.moves({ verbose: true });
        const isWildCard = this.game.currentCard && this.game.currentCard.type === CARD_TYPES.WILD;

        // Never allow capturing the king directly
        const validMoves = allMoves.filter(m => m.captured !== 'k');

        if (isWildCard) {
            return validMoves;
        }

        // Each piece can move at most once per turn
        return validMoves.filter(m => !this.game.movedSquares.has(m.from));
    }

    // Execute Move
    executeAiMove() {
        this.isThinking = false;
        const activeColor = this.getActiveColor();
        if (this.game.state !== 'MAKING_MOVES' || this.game.currentTurn !== activeColor) return;

        const legalMoves = this.getLegalMovesForAi();
        if (legalMoves.length === 0) {
            this.game.showToast('У ИИ нет доступных ходов оставшимися фигурами');
            this.game.passTurn();
            return;
        }

        let chosenMove = null;

        if (this.difficulty === 'easy') {
            chosenMove = this.pickEasyMove(legalMoves);
        } else if (this.difficulty === 'medium') {
            chosenMove = this.pickMediumMove(legalMoves);
        } else {
            // Hard
            chosenMove = this.pickHardMove(legalMoves);
        }

        if (!chosenMove) {
            chosenMove = legalMoves[Math.floor(Math.random() * legalMoves.length)];
        }

        // Execute the move in game engine
        this.game.executeMove(chosenMove.from, chosenMove.to, chosenMove.promotion || 'q');
    }

    /* Easy: Random with slight bias (35%) towards captures */
    pickEasyMove(legalMoves) {
        const captures = legalMoves.filter(m => m.captured);
        if (captures.length > 0 && Math.random() < 0.35) {
            return captures[Math.floor(Math.random() * captures.length)];
        }
        return legalMoves[Math.floor(Math.random() * legalMoves.length)];
    }

    /* Medium: Material + PST position evaluation + checks */
    pickMediumMove(legalMoves) {
        const activeColor = this.getActiveColor();
        let bestScore = -Infinity;
        let candidates = [];

        for (const move of legalMoves) {
            let score = 0;

            // Capture value
            if (move.captured) {
                const victimVal = this.pieceValues[move.captured] || 100;
                const attackerVal = this.pieceValues[move.piece] || 100;
                score += victimVal * 10 - attackerVal; // Good trade heuristic
            }

            // PST evaluation diff
            const fromCoord = this.squareToCoord(move.from);
            const toCoord = this.squareToCoord(move.to);
            const pstTable = this.pst[move.piece];
            if (pstTable) {
                const pstBefore = this.getPstValue(pstTable, fromCoord.row, fromCoord.col, activeColor);
                const pstAfter = this.getPstValue(pstTable, toCoord.row, toCoord.col, activeColor);
                score += (pstAfter - pstBefore);
            }

            // Promotion bonus
            if (move.promotion) {
                score += 800;
            }

            // Check simulation
            const tempChess = new Chess(this.game.chess.fen());
            const testRes = tempChess.move({ from: move.from, to: move.to, promotion: 'q' });
            if (testRes) {
                if (tempChess.in_check()) score += 60;
                if (tempChess.in_checkmate()) score += 10000;
            }

            // Slight randomness to avoid deterministic repetitive games
            score += Math.random() * 15;

            if (score > bestScore) {
                bestScore = score;
                candidates = [move];
            } else if (Math.abs(score - bestScore) < 5) {
                candidates.push(move);
            }
        }

        return candidates[Math.floor(Math.random() * candidates.length)] || legalMoves[0];
    }

    /* Hard: Minimax with Alpha-Beta pruning (depth 2-3) */
    pickHardMove(legalMoves) {
        let bestScore = -Infinity;
        let bestMove = legalMoves[0];

        // Sort moves: captures & checks first for faster pruning
        legalMoves.sort((a, b) => {
            const scoreA = (a.captured ? (this.pieceValues[a.captured] || 0) : 0);
            const scoreB = (b.captured ? (this.pieceValues[b.captured] || 0) : 0);
            return scoreB - scoreA;
        });

        const fen = this.game.chess.fen();
        const depth = 2; // Fast, responsive 2-ply minimax

        for (const move of legalMoves) {
            const sim = new Chess(fen);
            sim.move({ from: move.from, to: move.to, promotion: 'q' });

            // If checkmate, play immediately!
            if (sim.in_checkmate()) return move;

            let score = this.minimax(sim, depth - 1, -Infinity, Infinity, false);

            // Add small positional bonus
            if (move.captured) {
                score += (this.pieceValues[move.captured] || 0) * 0.1;
            }

            if (score > bestScore) {
                bestScore = score;
                bestMove = move;
            }
        }

        return bestMove;
    }

    minimax(chessInstance, depth, alpha, beta, isMaximizing) {
        if (depth === 0 || chessInstance.game_over()) {
            return this.evaluateBoard(chessInstance);
        }

        const moves = chessInstance.moves({ verbose: true });
        if (moves.length === 0) {
            if (chessInstance.in_checkmate()) {
                return isMaximizing ? -20000 : 20000;
            }
            return 0; // Stalemate / draw
        }

        if (isMaximizing) {
            let maxEval = -Infinity;
            for (const move of moves) {
                chessInstance.move({ from: move.from, to: move.to, promotion: 'q' });
                const evalScore = this.minimax(chessInstance, depth - 1, alpha, beta, false);
                chessInstance.undo();
                maxEval = Math.max(maxEval, evalScore);
                alpha = Math.max(alpha, evalScore);
                if (beta <= alpha) break;
            }
            return maxEval;
        } else {
            let minEval = Infinity;
            for (const move of moves) {
                chessInstance.move({ from: move.from, to: move.to, promotion: 'q' });
                const evalScore = this.minimax(chessInstance, depth - 1, alpha, beta, true);
                chessInstance.undo();
                minEval = Math.min(minEval, evalScore);
                beta = Math.min(beta, evalScore);
                if (beta <= alpha) break;
            }
            return minEval;
        }
    }

    // Static board evaluation from AI's perspective
    evaluateBoard(chessInstance) {
        const evalColor = this.getActiveColor();
        let total = 0;
        const board = chessInstance.board();

        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = board[r][c];
                if (!piece) continue;

                let val = this.pieceValues[piece.type] || 0;
                const pstTable = this.pst[piece.type];
                if (pstTable) {
                    val += this.getPstValue(pstTable, r, c, piece.color);
                }

                if (piece.color === evalColor) {
                    total += val;
                } else {
                    total -= val;
                }
            }
        }

        return total;
    }

    // AI Resurrect (+2, +4, -2)
    executeAiResurrect() {
        this.isThinking = false;
        if (this.game.state !== 'RESURRECTING') return;

        const targetColor = this.game.resurrectColor || this.game.currentTurn;
        if (!this.isEvE && targetColor !== this.aiColor) return;

        const captured = this.game.capturedPieces[targetColor];
        if (!captured || captured.length === 0 || this.game.resurrectMovesRemaining <= 0) {
            this.game.finishResurrect();
            return;
        }

        // 1. Pick piece: highest value first (Q > R > B/N > P)
        let bestPieceIdx = 0;
        let bestVal = -1;
        captured.forEach((type, idx) => {
            const v = this.pieceValues[type] || 100;
            if (v > bestVal) {
                bestVal = v;
                bestPieceIdx = idx;
            }
        });

        const pieceType = captured[bestPieceIdx];

        // 2. Find valid squares on half
        const isWhite = targetColor === 'w';
        const startRank = isWhite ? 1 : 5;
        const endRank = isWhite ? 4 : 8;
        const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

        const validSquares = [];
        for (let r = startRank; r <= endRank; r++) {
            // Pawns cannot be on ranks 1 or 8
            if (pieceType === 'p' && (r === 1 || r === 8)) continue;

            for (const f of files) {
                const sq = `${f}${r}`;
                if (this.game.isValidResurrectSquare(sq, pieceType, targetColor)) {
                    validSquares.push(sq);
                }
            }
        }

        if (validSquares.length === 0) {
            this.game.showToast('Нет свободных клеток для возврата фигуры');
            this.game.finishResurrect();
            return;
        }

        // 3. Choose best square:
        // Easy: random
        // Medium/Hard: prioritize back ranks / center, avoid edge if knight/queen
        let chosenSquare = validSquares[0];
        if (this.difficulty === 'easy') {
            chosenSquare = validSquares[Math.floor(Math.random() * validSquares.length)];
        } else {
            // Score squares
            let bestSqScore = -Infinity;
            for (const sq of validSquares) {
                const coord = this.squareToCoord(sq);
                let score = 0;
                // Center files bonus
                if (['d', 'e'].includes(sq[0])) score += 30;
                else if (['c', 'f'].includes(sq[0])) score += 15;

                // Back ranks for major pieces
                const rankNum = parseInt(sq[1], 10);
                if (pieceType !== 'p') {
                    if (isWhite && rankNum <= 2) score += 20;
                    if (!isWhite && rankNum >= 7) score += 20;
                } else {
                    // Pawns on 2 or 7
                    if (isWhite && rankNum === 2) score += 40;
                    if (!isWhite && rankNum === 7) score += 40;
                }

                score += Math.random() * 10;
                if (score > bestSqScore) {
                    bestSqScore = score;
                    chosenSquare = sq;
                }
            }
        }

        // Execute placement
        this.game.resurrectSelectedPiece = { type: pieceType, index: bestPieceIdx };
        this.game.handleResurrectPlacement(chosenSquare);
    }

    // Helper: PST value taking into account piece color orientation
    getPstValue(table, row, col, color) {
        if (color === 'w') {
            return table[row][col];
        } else {
            // Inverted for black
            return table[7 - row][col];
        }
    }

    // Helper: e4 -> { row: 4, col: 4 }
    squareToCoord(square) {
        const file = square.charCodeAt(0) - 97; // 'a' = 0
        const rank = parseInt(square[1], 10);
        const row = 8 - rank; // rank 8 = row 0
        return { row, col: file };
    }
}
