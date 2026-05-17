// chat-cards.js — shared chat card renderers
// Loaded by active-sheet.html and narrator.html before their respective scripts.

const EMOJI_SET = [
    '👍','👎','❤️','🔥','🎉','😂','😮','😢',
    '⚔️','🛡️','🎲','💀','✨','💥','🩸','🏹',
    '😈','😇','🤔','😤','😱','🤣','😏','👀',
    '🐉','👁️','💰','🗡️','🧪','📜','🏰','🌑',
];

function buildEmojiPanel() {
    return EMOJI_SET.map(e => `<button class="emoji-pick" type="button">${e}</button>`).join('');
}

function chatTimestamp() {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function fmtSigned(n) { const v = Number(n) || 0; return v >= 0 ? `+${v}` : `${v}`; }

function naturalRoll(rollNote) {
    if (!rollNote) return null;
    const nums = rollNote.match(/\d+/g)?.map(Number) || [];
    if (!nums.length) return null;
    if (rollNote.startsWith('adv')) return Math.max(...nums);
    if (rollNote.startsWith('dis')) return Math.min(...nums);
    // "d20(14)" — the actual die result is inside the parens, not the "20" from "d20"
    const paren = rollNote.match(/\((\d+)\)/);
    if (paren) return parseInt(paren[1], 10);
    return nums[0];
}

function successCount(total) {
    return total >= 15 ? Math.floor((total - 10) / 5) : 0;
}

function successHtml(total) {
    const n = successCount(total);
    if (n === 0) return `<div class="roll-outcome roll-outcome--fail">✗ No Success</div>`;
    const label = n === 1 ? '1 Success' : `${n} Successes`;
    const pips  = '◆'.repeat(Math.min(n, 6));
    return `<div class="roll-outcome roll-outcome--success">${pips} ${label}</div>`;
}

function damageTableBtnHtml(total, damageType) {
    const n = successCount(total);
    if (n < 2 || !damageType || !window.damageData?.[damageType]) return '';
    const rolls = n - 1;
    return `<button class="dmg-table-btn" type="button"
        data-dmg-type="${damageType}" data-rolls="${rolls}">
        ⚄ Roll ${damageType} Table${rolls > 1 ? ` ×${rolls}` : ''}
    </button>`;
}

function expandableDesc(desc) {
    if (!desc) return '';
    const isLong = desc.length > 160;
    const html = desc.replace(/\[\[([^\]]+)\]\]/g, '<span class="inline-dice">$1</span>');
    return `<div class="chat-desc-body${isLong ? ' is-clamped' : ''}">
        <p class="chat-feat-desc">${html}</p>
    </div>${isLong ? `<button class="chat-expand-btn" type="button">▼ Show more</button>` : ''}`;
}

function diceChipsHtml(diceRolls) {
    if (!diceRolls?.length) return '';
    return `<div class="chat-feat-dice">${diceRolls.map(r => {
        const detail   = r.rolls?.length > 1 ? ` [${r.rolls.join('+')}]` : '';
        const bonusTxt = r.bonus ? (r.bonus > 0 ? `+${r.bonus}` : `${r.bonus}`) : '';
        return `<div class="chat-dice-chip">
            <span class="chat-dice-notation">${r.notation}</span>
            <span class="chat-dice-arrow">→</span>
            <span class="chat-dice-total">${r.total}</span>
            <span class="chat-dice-detail">${detail}${bonusTxt}</span>
        </div>`;
    }).join('')}</div>`;
}

// ── RENDER FUNCTIONS ──────────────────────────────────────────────────────────

function renderWeaponAttackEntry(entry) {
    const nat      = naturalRoll(entry.rollNote);
    const isCrit   = nat === 20;
    const resClass = isCrit ? 'chat-res--nat20' : nat === 1 ? 'chat-res--nat1' : '';
    const typeLbl  = entry.rollType === 'adv' ? '· Adv' : entry.rollType === 'dis' ? '· Dis' : '';
    const bonusTxt = entry.attackBonus ? ` ${fmtSigned(entry.attackBonus)}` : '';
    const condHtml = entry.conditions?.length
        ? `<div class="chat-roll-cond">${entry.conditions.join(' · ')}</div>` : '';

    const dmgHtml = entry.damageRoll ? (() => {
        const base   = entry.damageRoll.total;
        const total  = isCrit ? base * 2 : base;
        const rolls  = entry.damageRoll.rolls || [];
        const breakdown = rolls.length ? `[${rolls.join('+')}]` : '';
        const detail = isCrit
            ? `<span class="chat-dice-detail">${breakdown}×2</span><span class="chat-crit-label">CRIT</span>`
            : breakdown ? `<span class="chat-dice-detail">${breakdown}</span>` : '';
        return `<div class="chat-dice-chip${isCrit ? ' chat-dice-chip--crit' : ''}">
            <span class="chat-dice-notation">${entry.damageRoll.notation}</span>
            <span class="chat-dice-arrow">→</span>
            <span class="chat-dice-total">${total}</span>
            ${detail}
        </div>
        <div class="chat-wep-meta">${[entry.damageType, entry.range, entry.properties].filter(Boolean).join(' · ')}</div>`;
    })()
        : `<div class="chat-wep-meta">${[entry.damage, entry.damageType, entry.range, entry.properties].filter(Boolean).join(' · ')}</div>`;

    return `<div class="chat-roll-card chat-roll--weapon">
        <div class="chat-card-head">
            <span class="chat-card-title">⚔ ${entry.charName ? `${entry.charName} · ` : ''}${entry.weaponName || ''}</span>
            <span class="chat-time">${entry.time || ''}</span>
        </div>
        <div class="chat-wep-body">
            <div class="chat-wep-col">
                <div class="chat-attack-label">${entry.checkLabel || ''}</div>
                <div class="chat-roll-result ${resClass}">${entry.d20Total}</div>
                <div class="chat-roll-breakdown">${entry.rollNote || ''} ${fmtSigned(entry.checkMod)}${bonusTxt} ${typeLbl}</div>
            </div>
            <div class="chat-wep-col chat-wep-col--right">
                <div class="chat-attack-label">DAMAGE</div>
                ${dmgHtml}
            </div>
        </div>
        ${successHtml(entry.d20Total)}
        ${entry.tableRolls?.length
            ? entry.tableRolls.map(r => `<div class="chat-inline-table-row">
                <span class="chat-table-type">${entry.damageType} Table</span>
                <span class="chat-table-die">d6→${r.roll}</span>
                <span class="chat-table-result">${r.result}</span>
              </div>`).join('')
            : damageTableBtnHtml(entry.d20Total, entry.damageType)}
        ${entry.d20Total < 15 ? `<button class="provoke-btn" type="button"> Provoke!</button>` : ''}
        ${entry.desc ? expandableDesc(entry.desc) : ''}
        ${condHtml}
    </div>`;
}

function renderRollEntry(entry) {
    const fc        = entry.featureContext;
    const nat       = naturalRoll(entry.rollNote);
    const resClass  = nat === 20 ? 'chat-res--nat20' : nat === 1 ? 'chat-res--nat1' : '';
    const typeLabel = entry.rollType === 'adv' ? '· Adv' : entry.rollType === 'dis' ? '· Dis' : '';
    const condHtml  = entry.conditions?.length
        ? `<div class="chat-roll-cond">${entry.conditions.join(' · ')}</div>` : '';
    const charLabel = entry.charName ? `${entry.charName} · ` : '';

    if (fc) {
        const fcDice      = fc.diceRolls?.length ? fc.diceRolls : [];
        const checkTag    = fc.tags?.find(t => t.startsWith('Check:'));
        const checkLabel  = checkTag ? checkTag.replace('Check: ', '') : (entry.label || 'Check');
        const displayTags = fc.tags?.filter(t => !t.startsWith('Check:')) || [];
        const tagsHtml    = displayTags.length
            ? `<div class="chat-feat-tags">${displayTags.map(t => `<span class="chat-feat-tag">${t}</span>`).join('')}</div>` : '';
        const borderClass = entry.rollType === 'adv' ? 'chat-roll--adv'
            : entry.rollType === 'dis' ? 'chat-roll--dis' : '';
        const modStr = entry.mod !== 0 ? ` ${fmtSigned(entry.mod)}` : '';
        return `<div class="chat-roll-card ${borderClass}">
            <div class="chat-card-head">
                <span class="chat-card-title">⚡ ${charLabel}${fc.name}</span>
                <span class="chat-time">${entry.time || ''}</span>
            </div>
            ${tagsHtml}
            <div class="chat-attack-row">
                <div class="chat-attack-block">
                    <div class="chat-attack-label">${checkLabel.toUpperCase()}</div>
                    <div class="chat-roll-result ${resClass}">${entry.total}</div>
                    <div class="chat-roll-breakdown">${entry.rollNote || ''}${modStr}${typeLabel ? ` ${typeLabel}` : ''}</div>
                </div>
                ${fcDice.length ? `<div class="chat-attack-block">
                    <div class="chat-attack-label">DAMAGE</div>
                    ${diceChipsHtml(fcDice)}
                </div>` : ''}
            </div>
            ${successHtml(entry.total)}
            ${damageTableBtnHtml(entry.total, fc.tags?.find(t => t.startsWith('Dmg:'))?.match(/\(([^)]+)\)/)?.[1] || '')}
            ${entry.total < 15 ? `<button class="provoke-btn" type="button">⚡ Provoke!</button>` : ''}
            ${fc.desc ? expandableDesc(fc.desc) : ''}
            ${condHtml}
        </div>`;
    }

    const borderClass = entry.rollType === 'adv' ? 'chat-roll--adv'
        : entry.rollType === 'dis' ? 'chat-roll--dis' : '';
    const modStr = entry.mod !== 0 ? ` ${fmtSigned(entry.mod)}` : '';
    return `<div class="chat-roll-card ${borderClass}">
        <div class="chat-card-head">
            <span class="chat-card-title">${charLabel}${entry.label || 'Roll'}</span>
            <span class="chat-time">${entry.time || ''}</span>
        </div>
        <div class="chat-roll-result ${resClass}">${entry.total}</div>
        <div class="chat-roll-breakdown">${entry.rollNote || ''}${modStr}${typeLabel ? ` ${typeLabel}` : ''}</div>
        ${successHtml(entry.total)}
        ${entry.total < 15 ? `<button class="provoke-btn" type="button">⚡ Provoke!</button>` : ''}
        ${condHtml}
    </div>`;
}

function renderRecoveryEntry(entry) {
    const rows = (entry.gains || []).map(g =>
        `<div class="chat-rec-row">
            <span class="chat-rec-label">${g.label}</span>
            <span class="chat-rec-val${g.rolled ? ' chat-rec-val--rolled' : ''}">${g.value}</span>
        </div>`
    ).join('');
    return `<div class="chat-recovery-card">
        <div class="chat-card-head">
            <span class="chat-card-title">⟳ ${entry.charName ? `${entry.charName} · ` : ''}${entry.title || ''}</span>
            <span class="chat-time">${entry.time || ''}</span>
        </div>
        <div class="chat-rec-rows">${rows}</div>
    </div>`;
}

function renderDiceEntry(entry) {
    const breakdown = entry.rolls?.length > 1
        ? `<div class="dice-card-breakdown">[${entry.rolls.join(' + ')}]${entry.bonus !== 0 ? ` ${fmtSigned(entry.bonus)}` : ''}</div>`
        : '';
    return `<div class="chat-dice-card">
        <div class="chat-card-head">
            <span class="chat-card-title">${entry.charName ? `${entry.charName} · ` : ''}${entry.notation || ''}</span>
            <span class="chat-time">${entry.time || ''}</span>
        </div>
        <div class="dice-card-total">${entry.total}</div>
        ${breakdown}
    </div>`;
}

function renderDmgTableEntry(entry) {
    return `<div class="chat-dmg-table-row">
        <span class="chat-table-type">${entry.damageType} Table</span>
        <span class="chat-table-sep">·</span>
        <span class="chat-table-die">d6→${entry.roll}</span>
        <span class="chat-table-sep">·</span>
        <span class="chat-table-result">${entry.result}</span>
        <span class="chat-time">${entry.time || ''}</span>
    </div>`;
}

function renderInitiativeCallEntry(entry) {
    return `<div class="chat-init-call">
        <span class="chat-init-call-icon">🎲</span>
        <span class="chat-init-call-label">ROLL INITIATIVE</span>
        <button class="chat-init-roll-btn" type="button">Roll d20</button>
        <span class="chat-time">${entry.time || ''}</span>
    </div>`;
}

function renderTurnEntry(entry) {
    return `<div class="chat-turn-card">
        <span class="chat-turn-round">Round ${entry.round}</span>
        <span class="chat-turn-sep">·</span>
        <span class="chat-turn-name">${entry.name}</span>
        <span class="chat-time">${entry.time || ''}</span>
    </div>`;
}

function renderFeatureEntry(entry) {
    const tagsHtml = entry.tags?.length
        ? `<div class="chat-feat-tags">${entry.tags.map(t => `<span class="chat-feat-tag">${t}</span>`).join('')}</div>` : '';
    return `<div class="chat-feat-card">
        <div class="chat-card-head">
            <span class="chat-card-title">⚡ ${entry.name || ''}</span>
            <span class="chat-time">${entry.time || ''}</span>
        </div>
        ${tagsHtml}
        ${diceChipsHtml(entry.diceRolls)}
        ${expandableDesc(entry.desc)}
    </div>`;
}
