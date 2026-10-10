const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
// Webと共用する純粋な集計・グラフ処理だけをアプリ外の読込対象にする。
config.watchFolders = [...config.watchFolders, path.resolve(__dirname, '../shared')];

module.exports = config;
