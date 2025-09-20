/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const {setGlobalOptions} = require("firebase-functions");
const {onRequest} = require("firebase-functions/https");
// const logger = require("firebase-functions/logger");

// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.
setGlobalOptions({ maxInstances: 10 });

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// exports.helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

const { onSchedule } = require('firebase-functions/v2/scheduler');
const { onCall } = require('firebase-functions/v2/https');
const { onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');

// Inicializar Firebase Admin
admin.initializeApp();

// Función que se ejecuta diariamente a las 6 AM (hora de Perú) - V2
exports.dailyCalendarTaskReminder = onSchedule(
  {
    schedule: '0 6 * * *', // 6:00 AM todos los días
    timeZone: 'America/Lima', // Zona horaria de Perú
    region: 'us-central1' // o la región que prefieras
  },
  async (event) => {
    logger.info('🚀 Iniciando verificación de tareas calendarTasks...', {
      timestamp: new Date().toISOString()
    });
    
    const today = new Date().toISOString().split('T')[0];
    logger.info(`📅 Fecha de hoy: ${today}`);
    
    try {
      // Obtener todos los usuarios que tienen calendarTasks
      const usersSnapshot = await admin.firestore()
        .collection('users')
        .where('calendarTasks', '!=', null)
        .get();
      
      logger.info(`👥 Usuarios con calendarTasks encontrados: ${usersSnapshot.size}`);
      
      let totalNotifications = 0;
      
      // Procesar cada usuario
      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();
        const userId = userDoc.id;
        
        // Filtrar solo las tareas de calendarTasks para hoy
        const todayTasks = userData.calendarTasks?.filter(task => 
          task.scheduledDate === today
        ) || [];
        
        logger.info(`📋 Usuario ${userId}: ${todayTasks.length} tareas para hoy`);
        
        if (todayTasks.length > 0) {
          // Obtener tokens FCM del usuario
          const userTokensDoc = await admin.firestore()
            .collection('userTokens')
            .doc(userId)
            .get();
          
          if (userTokensDoc.exists) {
            const tokens = userTokensDoc.data().fcmTokens || [];
            
            if (tokens.length > 0) {
              // Preparar mensaje de notificación
              const message = {
                notification: {
                  title: `📅 Tienes ${todayTasks.length} tarea(s) programada(s)`,
                  body: todayTasks.length === 1 
                    ? `• ${todayTasks[0].name}`
                    : todayTasks.slice(0, 2).map(t => `• ${t.name}`).join('\n') + 
                      (todayTasks.length > 2 ? `\n...y ${todayTasks.length - 2} más` : ''),
                },
                data: {
                  type: 'calendar_tasks_reminder',
                  taskCount: todayTasks.length.toString(),
                  date: today,
                  click_action: 'FLUTTER_NOTIFICATION_CLICK'
                },
                android: {
                  priority: 'high',
                  notification: {
                    sound: 'default',
                    priority: 'high',
                    channel_id: 'calendar_tasks'
                  }
                },
                apns: {
                  payload: {
                    aps: {
                      sound: 'default',
                      badge: todayTasks.length
                    }
                  }
                }
              };
              
              // Enviar notificación a todos los tokens del usuario
              for (const token of tokens) {
                try {
                  await admin.messaging().send({
                    ...message,
                    token: token
                  });
                  logger.info(`✅ Notificación enviada a token: ${token.substring(0, 20)}...`);
                } catch (error) {
                  logger.error(`❌ Error enviando a token ${token.substring(0, 20)}...:`, error);
                }
              }
              
              totalNotifications++;
            } else {
              logger.warn(`⚠️ Usuario ${userId} no tiene tokens FCM registrados`);
            }
          } else {
            logger.warn(`⚠️ Usuario ${userId} no tiene documento de tokens`);
          }
        }
      }
      
      logger.info(`🎉 Proceso completado. Notificaciones enviadas: ${totalNotifications}`);
      return { success: true, notificationsSent: totalNotifications };
      
    } catch (error) {
      logger.error('❌ Error en dailyCalendarTaskReminder:', error);
      throw error;
    }
  }
);

// Función para limpiar tokens FCM inválidos - V2
exports.cleanupInvalidTokens = onCall(
  {
    region: 'us-central1',
    cors: true
  },
  async (request) => {
    const { invalidTokens } = request.data;
    const userId = request.auth?.uid;
    
    if (!userId) {
      throw new Error('Usuario no autenticado');
    }
    
    if (!invalidTokens || invalidTokens.length === 0) {
      return { success: true, message: 'No hay tokens para limpiar' };
    }
    
    try {
      const userTokensDoc = await admin.firestore()
        .collection('userTokens')
        .doc(userId)
        .get();
      
      if (userTokensDoc.exists) {
        const currentTokens = userTokensDoc.data().fcmTokens || [];
        const validTokens = currentTokens.filter(token => !invalidTokens.includes(token));
        
        await userTokensDoc.ref.update({
          fcmTokens: validTokens,
          lastCleanup: admin.firestore.FieldValue.serverTimestamp()
        });
        
        return { 
          success: true, 
          message: `Eliminados ${invalidTokens.length} tokens inválidos`,
          remainingTokens: validTokens.length
        };
      }
      
      return { success: true, message: 'No se encontró documento de tokens' };
    } catch (error) {
      logger.error('Error limpiando tokens:', error);
      throw new Error('Error interno del servidor');
    }
  }
);
