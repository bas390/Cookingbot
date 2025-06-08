// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// เพิ่ม resolver สำหรับ Firebase
config.resolver.alias = {
  ...config.resolver.alias,
  'crypto': require.resolve('crypto-js'),
};

// เพิ่ม platforms สำหรับ React Native
config.resolver.platforms = ['native', 'ios', 'android', 'web'];

// แก้ไขปัญหา Firebase Auth "Component auth has not been registered yet"
// เพิ่ม .cjs extension เพื่อให้ Metro สามารถ resolve Firebase modules ได้
config.resolver.sourceExts.push('cjs');

// ปิด package exports เพื่อป้องกันปัญหา Firebase module resolution
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
