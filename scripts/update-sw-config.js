#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

// Script para actualizar la configuración del Service Worker
// Uso: node scripts/update-sw-config.js

const fs = require('fs');
const path = require('path');

// Leer variables de entorno
require('dotenv').config({ path: '.env.local' });

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_MEASUREMENT_ID
};

// Verificar que todas las variables estén configuradas
const missingVars = Object.entries(firebaseConfig)
  .filter(([key, value]) => !value)
  .map(([key]) => key);

if (missingVars.length > 0) {
  console.error('❌ Variables de entorno faltantes:');
  missingVars.forEach(variable => {
    console.error(`   - ${variable}`);
  });
  console.error('\nPor favor configura estas variables en tu archivo .env.local');
  process.exit(1);
}

// Leer el archivo del Service Worker
const swPath = path.join(__dirname, '..', 'public', 'firebase-messaging-sw.js');
let swContent = fs.readFileSync(swPath, 'utf8');

// Actualizar la configuración en el Service Worker
const configRegex = /const firebaseConfig = \{[\s\S]*?\};/;
const newConfig = `const firebaseConfig = {
  apiKey: "${firebaseConfig.apiKey}",
  authDomain: "${firebaseConfig.authDomain}",
  projectId: "${firebaseConfig.projectId}",
  storageBucket: "${firebaseConfig.storageBucket}",
  messagingSenderId: "${firebaseConfig.messagingSenderId}",
  appId: "${firebaseConfig.appId}"${firebaseConfig.measurementId ? `,
  measurementId: "${firebaseConfig.measurementId}"` : ''}
};`;

swContent = swContent.replace(configRegex, newConfig);

// Escribir el archivo actualizado
fs.writeFileSync(swPath, swContent);

console.log('✅ Service Worker actualizado exitosamente!');
console.log('📁 Archivo modificado: public/firebase-messaging-sw.js');
console.log('\n🔧 Configuración aplicada:');
console.log(`   - Project ID: ${firebaseConfig.projectId}`);
console.log(`   - Auth Domain: ${firebaseConfig.authDomain}`);
console.log(`   - API Key: ${firebaseConfig.apiKey.substring(0, 20)}...`);
console.log('\n🚀 El Service Worker ahora debería funcionar correctamente.');