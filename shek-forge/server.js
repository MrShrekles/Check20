const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3000;
const DATA_FOLDER = process.env.DATA_FOLDER ||
    'C:\\Users\\Shrek\\Dropbox\\TTRPG\\CODEMONKEY\\Rulebook Project\\data';

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

function resolveDataPath(...parts) {
    return path.join(process.env.DATA_FOLDER || DATA_FOLDER, ...parts);
}

function isJsonFile(f) { return f.endsWith('.json') && !f.startsWith('.'); }

// ── FILE TYPE DETECTION ───────────────────────────────────────────────────────
function detectFileType(data) {
    const e = data && data[0];
    if (!e || typeof e !== 'object') return 'generic';
    // Hexgen: mixed structure with lords, enemies, travelConnectors groups
    const groups = new Set(data.map(d => d && d._group).filter(Boolean));
    if (groups.has('lords') && groups.has('enemies') && groups.has('travelConnectors')) return 'hexgen';
    if ('path' in e && 'talent' in e && 'class' in e && 'origin' in e) return 'class';
    if ('feature_name' in e || 'walk' in e || 'feature_effect' in e) return 'monster';
    if ('featureName' in e || 'baseType' in e || 'movement' in e) return 'monster';
    if ('damage' in e && 'damageType' in e && 'bulk' in e) return 'weapon';
    if ('armor' in e && 'movePenalty' in e) return 'armor';
    return 'generic';
}

// ── STRUCTURE HELPERS ─────────────────────────────────────────────────────────
function analyzeStructure(parsed) {
    if (Array.isArray(parsed)) return { type: 'array', data: parsed };
    if (typeof parsed === 'object' && parsed !== null) {
        const keys = Object.keys(parsed);
        if (keys.length === 1 && Array.isArray(parsed[keys[0]]))
            return { type: 'wrapped', key: keys[0], data: parsed[keys[0]] };
        if (keys.length === 1 && typeof parsed[keys[0]] === 'object' && !Array.isArray(parsed[keys[0]])) {
            const inner = parsed[keys[0]];
            const innerKeys = Object.keys(inner);
            if (innerKeys.length && innerKeys.every(k => Array.isArray(inner[k]))) {
                const data = [];
                for (const g of innerKeys) for (const e of inner[g]) data.push({ _group: g, ...e });
                return { type: 'nested', outerKey: keys[0], groups: inner, data };
            }
        }
        if (keys.length > 1 && keys.every(k => Array.isArray(parsed[k]))) {
            const data = [];
            for (const g of keys) for (const e of parsed[g]) data.push({ _group: g, ...e });
            return { type: 'grouped', groups: parsed, data };
        }
        const hasArrayValues = keys.some(k => Array.isArray(parsed[k]));
        const hasObjectValues = keys.some(k => !Array.isArray(parsed[k]) && typeof parsed[k] === 'object');
        if (hasArrayValues || hasObjectValues) {
            const data = [];
            const groupMeta = {};
            for (const key of keys) {
                const val = parsed[key];
                if (Array.isArray(val)) {
                    if (val.every(v => typeof v === 'string')) { for (const s of val) data.push({ _group: key, value: s }); groupMeta[key] = null; }
                    else { for (const e of val) data.push({ _group: key, ...e }); groupMeta[key] = null; }
                } else if (typeof val === 'object' && val !== null) {
                    const subKeys = Object.keys(val);
                    if (subKeys.every(sk => Array.isArray(val[sk]))) {
                        for (const sub of subKeys) for (const e of val[sub]) data.push({ _group: key, _subgroup: sub, ...e });
                        groupMeta[key] = subKeys;
                    }
                }
            }
            return { type: 'mixed', originalKeys: keys, groupMeta, data };
        }
    }
    return { type: 'array', data: [parsed] };
}

function reconstructStructure(structure, editedData) {
    if (structure.type === 'array') return editedData;
    if (structure.type === 'wrapped') return { [structure.key]: editedData };
    if (structure.type === 'nested') {
        const groups = {};
        for (const g of Object.keys(structure.groups)) groups[g] = [];
        for (const entry of editedData) {
            const { _group, ...rest } = entry;
            const g = _group || Object.keys(structure.groups)[0];
            if (!groups[g]) groups[g] = [];
            groups[g].push(rest);
        }
        return { [structure.outerKey]: groups };
    }
    if (structure.type === 'grouped') {
        const groups = {};
        for (const g of Object.keys(structure.groups)) groups[g] = [];
        for (const entry of editedData) {
            const { _group, ...rest } = entry;
            const g = _group || Object.keys(structure.groups)[0];
            if (!groups[g]) groups[g] = [];
            groups[g].push(rest);
        }
        return groups;
    }
    if (structure.type === 'mixed') {
        const result = {};
        for (const key of structure.originalKeys) {
            const groupEntries = editedData.filter(e => e._group === key);
            const subgroups = structure.groupMeta[key];
            if (subgroups) {
                result[key] = {};
                for (const sub of subgroups) result[key][sub] = [];
                for (const entry of groupEntries) {
                    const { _group, _subgroup, ...rest } = entry;
                    const sub = _subgroup || subgroups[0];
                    if (!result[key][sub]) result[key][sub] = [];
                    result[key][sub].push(rest);
                }
            } else {
                const firstEntry = groupEntries[0];
                if (firstEntry && Object.keys(firstEntry).filter(k => k !== '_group').join('') === 'value') {
                    result[key] = groupEntries.map(e => e.value);
                } else {
                    result[key] = groupEntries.map(({ _group, ...rest }) => rest);
                }
            }
        }
        return result;
    }
    return editedData;
}

function getBackupDir(filename) { return resolveDataPath('.backups', filename); }

function createBackup(filename) {
    try {
        const dir = getBackupDir(filename);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        const ts = new Date().toISOString().replace(/[:.]/g, '-');
        fs.copyFileSync(resolveDataPath(filename), path.join(dir, `${ts}.json`));
        const files = fs.readdirSync(dir).sort();
        if (files.length > 10) files.slice(0, files.length - 10).forEach(f => fs.unlinkSync(path.join(dir, f)));
    } catch (e) { console.warn('Backup failed:', e.message); }
}

// ── ROUTES ────────────────────────────────────────────────────────────────────
app.get('/api/files', (req, res) => {
    try {
        const folder = resolveDataPath();
        if (!fs.existsSync(folder)) return res.status(404).json({ error: `Folder not found: ${folder}` });
        const files = fs.readdirSync(folder).filter(isJsonFile).map(filename => {
            const stat = fs.statSync(path.join(folder, filename));
            let entryCount = 0, fileType = 'generic';
            try {
                const structure = analyzeStructure(JSON.parse(fs.readFileSync(path.join(folder, filename), 'utf8')));
                entryCount = structure.data.length;
                fileType = detectFileType(structure.data);
            } catch (e) {}
            return { name: filename, size: stat.size, modified: stat.mtime, entryCount, fileType };
        }).sort((a, b) => a.name.localeCompare(b.name));
        res.json({ folder, files });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/file/:filename', (req, res) => {
    try {
        const filename = req.params.filename;
        if (!isJsonFile(filename)) return res.status(400).json({ error: 'Not a JSON file' });
        const filePath = resolveDataPath(filename);
        if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });
        const structure = analyzeStructure(JSON.parse(fs.readFileSync(filePath, 'utf8')));
        res.json({
            filename, data: structure.data, structureType: structure.type, fileType: detectFileType(structure.data),
            groups: structure.type === 'mixed' ? Object.keys(structure.groupMeta)
                : (structure.groups ? Object.keys(structure.groups) : null),
            groupMeta: structure.groupMeta || null
        });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/file/:filename', (req, res) => {
    try {
        const filename = req.params.filename;
        if (!isJsonFile(filename)) return res.status(400).json({ error: 'Not a JSON file' });
        const filePath = resolveDataPath(filename);
        const { data } = req.body;
        if (data === undefined) return res.status(400).json({ error: 'No data provided' });
        if (fs.existsSync(filePath)) createBackup(filename);
        const originalStructure = analyzeStructure(JSON.parse(fs.readFileSync(filePath, 'utf8')));
        fs.writeFileSync(filePath, JSON.stringify(reconstructStructure(originalStructure, data), null, 2), 'utf8');
        res.json({ success: true, filename, saved: new Date() });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/export/:filename', (req, res) => {
    try {
        const filePath = resolveDataPath(req.params.filename);
        if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });
        res.setHeader('Content-Disposition', `attachment; filename="${req.params.filename}"`);
        res.setHeader('Content-Type', 'application/json');
        res.sendFile(filePath);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/backups/:filename', (req, res) => {
    try {
        const dir = getBackupDir(req.params.filename);
        if (!fs.existsSync(dir)) return res.json({ backups: [] });
        const backups = fs.readdirSync(dir).filter(f => f.endsWith('.json'))
            .map(name => ({ name, modified: fs.statSync(path.join(dir, name)).mtime }))
            .sort((a, b) => new Date(b.modified) - new Date(a.modified));
        res.json({ backups });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/backups/download/:filename/:backup', (req, res) => {
    try {
        const filePath = path.join(getBackupDir(req.params.filename), req.params.backup);
        if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Backup not found' });
        res.setHeader('Content-Disposition', `attachment; filename="${req.params.backup}"`);
        res.sendFile(filePath);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/backups/restore', (req, res) => {
    try {
        const { filename, backupName } = req.body;
        const src = path.join(getBackupDir(filename), backupName);
        if (!fs.existsSync(src)) return res.status(404).json({ error: 'Backup not found' });
        createBackup(filename);
        fs.copyFileSync(src, resolveDataPath(filename));
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/folder', (req, res) => {
    const { folder } = req.body;
    if (!folder) return res.status(400).json({ error: 'No folder provided' });
    if (!fs.existsSync(folder)) return res.status(404).json({ error: 'Folder not found' });
    process.env.DATA_FOLDER = folder;
    res.json({ success: true, folder });
});

app.get('/api/weapons', (req, res) => {
    try {
        const filePath = resolveDataPath('weapons.json');
        if (!fs.existsSync(filePath)) return res.json({ weapons: [] });
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        res.json({ weapons: Array.isArray(data) ? data : [] });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── START ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`\n╔══════════════════════════════════════╗`);
    console.log(`║            FORGE  v1.0               ║`);
    console.log(`╚══════════════════════════════════════╝`);
    console.log(`  Server: http://localhost:${PORT}`);
    console.log(`  Data:   ${resolveDataPath()}\n`);
});
