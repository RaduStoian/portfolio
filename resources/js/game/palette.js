// Shared colour ramps. Every baked sprite pulls from here so the scenes read as
// one world.
//
// The overworld sits at golden hour and the graveyard at night; they share the
// same greens, woods and stones so a fence looks like the same fence in both,
// and differ only in their sky/light keys. Warm, saturated, chunky — aiming at
// the cosy end of pixel art rather than the muted-horror end.

export const P = {
    // Overworld sky: golden hour, deep blue overhead down to gold at the horizon.
    skyTop: '#3c4a86',
    skyMid: '#6f639f',
    skyLow: '#b8748a',
    skyWarm: '#e0906a',
    skyGlow: '#f4c07c',
    skyGold: '#ffdb96',

    // Graveyard sky: night.
    nightTop: '#1c1c38',
    nightMid: '#332e55',
    nightLow: '#4e3a5c',
    nightHorizon: '#6b4a5e',

    // Grass — four steps so ground can have real form instead of flat fill.
    grassLit: '#84b556',
    grass: '#5f9440',
    grassDark: '#437030',
    grassDeep: '#2e5024',

    dirtLit: '#a8794f',
    dirt: '#7d5636',
    dirtDark: '#563a24',

    // Stone, warmed slightly so it sits next to the wood instead of going blue.
    stoneLit: '#b4ad9e',
    stone: '#8d8577',
    stoneDark: '#645d52',
    stoneDeep: '#46403a',

    // Wood.
    woodLit: '#b58050',
    wood: '#8c5a34',
    woodDark: '#5e3a22',
    woodDeep: '#402615',

    // Roofs.
    roofRed: '#c85543',
    roofRedDark: '#93372c',
    roofBlue: '#4d76ac',
    roofBlueDark: '#325181',
    roofGreen: '#4f9366',
    roofGreenDark: '#336849',
    roofPurple: '#7f5ca1',
    roofPurpleDark: '#563c73',

    // Light.
    window: '#ffd77e',
    windowWarm: '#ffb85c',
    windowDim: '#c8913f',
    lamp: '#ffeab4',
    ember: '#ff9d5c',

    // Shop materials. Each is a full ramp because the shop's whole conceit is
    // that you can tell what a thing is made of *before* you throw it — glass
    // has to look brittle and gold has to look heavy.
    glassLit: '#dcefff',
    glass: '#8fc4ea',
    glassDark: '#5384b8',
    glassDeep: '#33547f',

    goldLit: '#ffe9a0',
    gold: '#e5ab3c',
    goldDark: '#a97220',
    goldDeep: '#6d4512',

    ironLit: '#9aa0b0',
    iron: '#6b7183',
    ironDark: '#454a5c',
    ironDeep: '#2b2f3d',

    orbLit: '#e2c8ff',
    orb: '#9a6adb',
    orbDark: '#5f3a9a',
    orbDeep: '#331e58',

    popLit: '#fff6d8',
    pop: '#f0dfae',
    popDark: '#cdb27a',

    skin: '#e8b489',
    skinDark: '#b57e58',

    // Ink / outline / neutrals. The outline colour is a warm near-black; a pure
    // black outline is what makes pixel art look cheap.
    outline: '#2e2333',
    ink: '#221b2b',
    inkSoft: '#3a3048',
    bone: '#e2ddcb',
    boneDark: '#aca691',
    cloth: '#c4474f',
    clothDark: '#932f3c',
    leaf: '#4f8a3f',
    leafLit: '#72ad52',
    leafDark: '#356027',
    flowerPink: '#e57ba0',
    flowerYellow: '#f2d05e',
    flowerBlue: '#7c9fe0',
};

export const STONE_RAMP = [P.stoneLit, P.stone, P.stoneDark, P.stoneDeep];
export const GRASS_RAMP = [P.grassLit, P.grass, P.grassDark, P.grassDeep];
