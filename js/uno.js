// UNO Card Deck & Rules Engine for UNO Chess

const UNO_COLORS = ['red', 'blue', 'green', 'yellow'];

const CARD_TYPES = {
    NUMBER: 'number',
    SKIP: 'skip',
    REVERSE: 'reverse',
    DRAW1: 'draw1',
    MINUS1: 'minus1',
    DRAW2: 'draw2',
    MINUS2: 'minus2',
    WILD: 'wild',
    WILD4: 'wild4'
};

const DECK_PRESETS = {
    standard: {
        id: 'standard',
        name: '⚖️ Стандарт',
        desc: 'Сбалансированная колода без пустых нулей (53 карты)',
        counts: {
            count1: 12,
            count2: 12,
            count3: 6,
            countWild: 4,
            count0: 0,
            countSkip: 4,
            countRev: 4,
            countDraw1: 4,
            countMinus1: 2,
            countDraw2: 2,
            countMinus2: 1,
            countWild4: 2
        }
    },
    fast: {
        id: 'fast',
        name: '⚡ Быстрый бой',
        desc: 'Максимум ходов и экшена, минимум пауз (46 карт, 20–35 ходов)',
        counts: {
            count1: 8,
            count2: 14,
            count3: 8,
            countWild: 6,
            count0: 0,
            countSkip: 2,
            countRev: 2,
            countDraw1: 2,
            countMinus1: 1,
            countDraw2: 1,
            countMinus2: 0,
            countWild4: 2
        }
    },
    chaos: {
        id: 'chaos',
        name: '🌀 Хаос УНО',
        desc: 'Частые реверсы, подарки и джокеры для весёлых партий (58 карт)',
        counts: {
            count1: 8,
            count2: 10,
            count3: 6,
            countWild: 6,
            count0: 0,
            countSkip: 6,
            countRev: 6,
            countDraw1: 4,
            countMinus1: 4,
            countDraw2: 2,
            countMinus2: 2,
            countWild4: 4
        }
    }
};

const CARD_CONFIG_SCHEMA = [
    { key: 'count1', title: '1 Ход', desc: '1 обычный ход любой фигурой', group: 'moves', symbol: '1', color: 'blue' },
    { key: 'count2', title: '2 Хода', desc: '2 хода РАЗНЫМИ фигурами', group: 'moves', symbol: '2', color: 'green' },
    { key: 'count3', title: '3 Хода', desc: '3 хода ТРЕМЯ разными фигурами', group: 'moves', symbol: '3', color: 'red' },
    { key: 'countWild', title: 'Дикая карта (★)', desc: '2 хода ЛЮБОЙ фигурой (можно одной и той же)', group: 'moves', symbol: '★', color: 'wild' },

    { key: 'count0', title: '0 Ходов', desc: '0 ходов — дубликат пропуска (по умолчанию 0)', group: 'skips', symbol: '0', color: 'yellow' },
    { key: 'countSkip', title: 'Пропуск хода (⊘)', desc: 'Игрок пропускает раунд, ход сопернику', group: 'skips', symbol: '⊘', color: 'blue' },

    { key: 'countRev', title: 'Реверс (⇄)', desc: 'Смена сторон! Игроки меняются армиями', group: 'reverse', symbol: '⇄', color: 'green' },

    { key: 'countDraw1', title: '+1 Возврат фигуры', desc: 'Верните 1 фигуру на свою половину + 1 ход', group: 'resurrect', symbol: '+1', color: 'blue' },
    { key: 'countMinus1', title: '-1 Подарок сопернику', desc: 'Соперник возвращает 1 фигуру, вы делаете 1 ход', group: 'resurrect', symbol: '-1', color: 'yellow' },
    { key: 'countDraw2', title: '+2 Супер-возврат', desc: 'Верните до 2 фигур на свою половину + 1 ход', group: 'resurrect', symbol: '+2', color: 'green' },
    { key: 'countMinus2', title: '-2 Подарок сопернику', desc: 'Соперник возвращает до 2 фигур, вы делаете 1 ход', group: 'resurrect', symbol: '-2', color: 'red' },
    { key: 'countWild4', title: '+4 Джокер', desc: 'Воскресите 1 фигуру И сделайте 2 хода', group: 'resurrect', symbol: '+4', color: 'wild' }
];

class UnoDeck {
    constructor(customConfig = null) {
        this.cards = [];
        this.discardPile = [];
        this.config = customConfig || UnoDeck.loadConfig();
        this.reset(this.config);
    }

    static loadConfig() {
        try {
            const raw = localStorage.getItem('uno_chess_deck_config');
            if (raw) {
                return JSON.parse(raw);
            }
        } catch (e) {}
        return { ...DECK_PRESETS.standard.counts };
    }

    static saveConfig(cfg) {
        try {
            localStorage.setItem('uno_chess_deck_config', JSON.stringify(cfg));
        } catch (e) {}
    }

    reset(config = null) {
        if (config) {
            this.config = { ...config };
        } else if (!this.config) {
            this.config = UnoDeck.loadConfig();
        }

        this.cards = [];
        this.discardPile = [];
        this.justReshuffled = false;

        const addCards = (count, createCardFn) => {
            for (let i = 0; i < count; i++) {
                const color = UNO_COLORS[i % UNO_COLORS.length];
                this.cards.push(createCardFn(color, i));
            }
        };

        // 0
        addCards(this.config.count0 || 0, color => ({
            type: CARD_TYPES.NUMBER, value: 0, color, title: '0 Ходов', desc: '0 ходов — пропуск хода!'
        }));

        // 1
        addCards(this.config.count1 || 0, color => ({
            type: CARD_TYPES.NUMBER, value: 1, color, title: '1 Ход', desc: 'Сделайте 1 обычный ход любой фигурой'
        }));

        // 2
        addCards(this.config.count2 || 0, color => ({
            type: CARD_TYPES.NUMBER, value: 2, color, title: '2 Хода', desc: 'Сделайте 2 хода РАЗНЫМИ фигурами! (1 фигура = 1 раз)'
        }));

        // 3
        addCards(this.config.count3 || 0, color => ({
            type: CARD_TYPES.NUMBER, value: 3, color, title: '3 Хода', desc: 'Сделайте 3 хода ТРЕМЯ разными фигурами!'
        }));

        // Skip
        addCards(this.config.countSkip || 0, color => ({
            type: CARD_TYPES.SKIP, value: 'skip', color, title: 'Пропуск хода', desc: 'Вы пропускаете ход! Ход переходит противнику.'
        }));

        // Reverse
        addCards(this.config.countRev || 0, color => ({
            type: CARD_TYPES.REVERSE, value: 'rev', color, title: 'Реверс (Смена сторон)', desc: 'Смена сторон! Вы забираете армию противника и делаете 1 ход!'
        }));

        // +1
        addCards(this.config.countDraw1 || 0, color => ({
            type: CARD_TYPES.DRAW1, value: '+1', color, title: '+1 Возврат фигуры', desc: 'Верните 1 фигуру на свою половину! Затем сделайте 1 ход другой фигурой.'
        }));

        // -1
        addCards(this.config.countMinus1 || 0, color => ({
            type: CARD_TYPES.MINUS1, value: '-1', color, title: '-1 Подарок сопернику', desc: 'Соперник возвращает 1 фигуру на свою половину! Затем вы делаете 1 ход.'
        }));

        // +2
        addCards(this.config.countDraw2 || 0, color => ({
            type: CARD_TYPES.DRAW2, value: '+2', color, title: '+2 Супер-возврат', desc: 'Верните до 2 фигур на свою половину! Затем сделайте 1 ход другой фигурой.'
        }));

        // -2
        addCards(this.config.countMinus2 || 0, color => ({
            type: CARD_TYPES.MINUS2, value: '-2', color, title: '-2 Подарок сопернику', desc: 'Соперник возвращает до 2 фигур на свою половину! Затем вы делаете 1 ход.'
        }));

        // Wild
        for (let i = 0; i < (this.config.countWild || 0); i++) {
            this.cards.push({ type: CARD_TYPES.WILD, value: '★', color: 'wild', title: 'Дикая карта', desc: 'Супер-ход: 2 хода любой фигурой (можно одной и той же!)' });
        }

        // Wild4
        for (let i = 0; i < (this.config.countWild4 || 0); i++) {
            this.cards.push({ type: CARD_TYPES.WILD4, value: '+4', color: 'wild', title: '+4 Джокер', desc: 'Верните 1 фигуру на поле И сделайте 2 хода разными фигурами!' });
        }

        // Fallback: if deck is empty, put at least one 1-move card
        if (this.cards.length === 0) {
            this.cards.push({ type: CARD_TYPES.NUMBER, value: 1, color: 'blue', title: '1 Ход', desc: 'Сделайте 1 обычный ход любой фигурой' });
        }

        this.totalBuilt = this.cards.length;
        this.shuffle();
    }

    shuffle() {
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
    }

    draw() {
        if (this.cards.length === 0) {
            this.justReshuffled = true;
            if (this.discardPile.length === 0) {
                this.reset(this.config);
            } else {
                this.cards = [...this.discardPile];
                this.discardPile = [];
                this.shuffle();
            }
        }
        const card = this.cards.pop();
        this.discardPile.push(card);
        return card;
    }

    get remainingCount() {
        return this.cards.length;
    }

    get totalCount() {
        return this.cards.length + this.discardPile.length;
    }
}

// Generate HTML representation of a UNO card
function renderUnoCard(card, isBack = false) {
    if (isBack) {
        return `
            <div class="uno-card uno-card-back">
                <div class="uno-back-oval">
                    <span class="uno-back-text">UNO</span>
                </div>
            </div>
        `;
    }

    const colorClass = `uno-color-${card.color}`;
    let displaySymbol = card.value;
    let centerSymbol = card.value;

    if (card.type === CARD_TYPES.SKIP) {
        displaySymbol = '⊘';
        centerSymbol = '⊘';
    } else if (card.type === CARD_TYPES.REVERSE) {
        displaySymbol = '⇄';
        centerSymbol = '⇄';
    } else if (card.type === CARD_TYPES.DRAW1) {
        displaySymbol = '+1';
        centerSymbol = '+1';
    } else if (card.type === CARD_TYPES.MINUS1) {
        displaySymbol = '-1';
        centerSymbol = '-1';
    } else if (card.type === CARD_TYPES.DRAW2) {
        displaySymbol = '+2';
        centerSymbol = '+2';
    } else if (card.type === CARD_TYPES.MINUS2) {
        displaySymbol = '-2';
        centerSymbol = '-2';
    } else if (card.type === CARD_TYPES.WILD) {
        displaySymbol = '★';
        centerSymbol = `<div class="wild-wheel"><div></div><div></div><div></div><div></div></div>`;
    } else if (card.type === CARD_TYPES.WILD4) {
        displaySymbol = '+4';
        centerSymbol = `<div class="wild-wheel"><div></div><div></div><div></div><div></div></div><span class="w4-text">+4</span>`;
    }

    return `
        <div class="uno-card ${colorClass}" data-color="${card.color}">
            <div class="card-corner top-left">${displaySymbol}</div>
            <div class="card-oval">
                <div class="card-inner-symbol">${centerSymbol}</div>
            </div>
            <div class="card-corner bottom-right">${displaySymbol}</div>
        </div>
    `;
}
