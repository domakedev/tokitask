#!/usr/bin/env node

// Script simplificado para configurar Cloud Scheduler
// No requiere dependencias externas

const { execSync } = require('child_process');

// Configuración
const PROJECT_ID = process.env.GCLOUD_PROJECT || 'tokitask-com';
const REGION = 'us-central1';
const FUNCTION_NAME = 'dailyCalendarTaskReminder';
const SCHEDULE_NAME = 'daily-calendar-task-reminder';
const TIMEZONE = 'America/Lima';
const SCHEDULE = '0 6 * * *'; // 6:00 AM todos los días

console.log('🔧 Configurando Cloud Scheduler para notificaciones diarias...');
console.log(`📋 Project ID: ${PROJECT_ID}`);
console.log(`📅 Horario: ${SCHEDULE} (${TIMEZONE})`);
console.log(`🔗 Función: ${FUNCTION_NAME}`);

// Comando para crear el job de Cloud Scheduler
const createCommand = `gcloud scheduler jobs create http ${SCHEDULE_NAME} --schedule="${SCHEDULE}" --time-zone="${TIMEZONE}" --uri="https://${REGION}-${PROJECT_ID}.cloudfunctions.net/${FUNCTION_NAME}" --http-method=GET --oidc-service-account-email="${PROJECT_ID}@appspot.gserviceaccount.com" --oidc-token-audience="https://${REGION}-${PROJECT_ID}.cloudfunctions.net/${FUNCTION_NAME}" --project=${PROJECT_ID}`;

try {
  console.log('🚀 Creando job de Cloud Scheduler...');
  execSync(createCommand, { stdio: 'inherit' });
  console.log('✅ Cloud Scheduler configurado exitosamente!');
  console.log(`📅 Se ejecutará diariamente a las 6:00 AM (${TIMEZONE})`);
} catch (error) {
  console.error('❌ Error:', error.message);

  if (error.message.includes('ALREADY_EXISTS')) {
    console.log('ℹ️ El job ya existe, intentando actualizarlo...');

    const updateCommand = `gcloud scheduler jobs update http ${SCHEDULE_NAME} --schedule="${SCHEDULE}" --time-zone="${TIMEZONE}" --uri="https://${REGION}-${PROJECT_ID}.cloudfunctions.net/${FUNCTION_NAME}" --http-method=GET --project=${PROJECT_ID}`;

    try {
      execSync(updateCommand, { stdio: 'inherit' });
      console.log('✅ Cloud Scheduler actualizado exitosamente!');
    } catch (updateError) {
      console.error('❌ Error actualizando:', updateError.message);
      console.log('💡 Ejecuta manualmente:');
      console.log(createCommand.replace(/\s+/g, ' '));
    }
  } else {
    console.log('💡 Ejecuta manualmente:');
    console.log(createCommand.replace(/\s+/g, ' '));
  }
}