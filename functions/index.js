/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

// Configuración global para Firebase Functions v2
const { setGlobalOptions } = require("firebase-functions/v2");
setGlobalOptions({
  maxInstances: 10,
  region: 'us-central1'
});

const { onSchedule } = require('firebase-functions/v2/scheduler');
const { onCall } = require('firebase-functions/v2/https');
const { onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { logger, params } = require('firebase-functions');
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const twilio = require('twilio');

// Definir secrets para Twilio
const twilioAccountSid = params.defineSecret('TWILIO_ACCOUNT_SID');
const twilioAuthToken = params.defineSecret('TWILIO_AUTH_TOKEN');
const twilioWhatsappNumber = params.defineSecret('TWILIO_WHATSAPP_NUMBER');

// Inicializar Firebase Admin
admin.initializeApp();

// Configuración de Twilio se hace dentro de cada función usando secrets

// Función que se ejecuta diariamente a las 6 AM (hora de Perú) - V2
exports.dailyCalendarTaskReminder = onSchedule(
  {
    schedule: '0 6 * * *', // 6:00 AM todos los días
    timeZone: 'America/Lima', // Zona horaria de Perú
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 540, // 9 minutos máximo
    secrets: [twilioAccountSid, twilioAuthToken, twilioWhatsappNumber]
  },
  async (event) => {
    // Acceder a los secrets desde el contexto de la función
    const accountSid = twilioAccountSid.value();
    const authToken = twilioAuthToken.value();
    const whatsappNumber = twilioWhatsappNumber.value();

    // Crear cliente Twilio dentro de la función
    const client = accountSid && authToken ? twilio(accountSid, authToken) : null;

    logger.info('🚀 Iniciando verificación de tareas calendarTasks...', {
      timestamp: new Date().toISOString(),
      twilioConfigured: !!client
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
          // ===== WHATSAPP NOTIFICATIONS (DESACTIVADO) =====
          /*
          if (client && whatsappNumber) {
            // Obtener número de teléfono del usuario
            const userPhone = userData.phoneNumber || userData.whatsappNumber;
          
            if (userPhone) {
              // Preparar mensaje de WhatsApp
              const whatsappMessage = `📅 *Tienes ${todayTasks.length} tarea(s) programada(s) para hoy:*\n\n${todayTasks.map(task => `• ${task.name}`).join('\n')}\n\n💡 Recuerda completar tus tareas programadas.`;
          
              try {
                await client.messages.create({
                  body: whatsappMessage,
                  from: `whatsapp:${whatsappNumber}`,
                  to: `whatsapp:${userPhone.startsWith('+') ? userPhone : '+' + userPhone}`
                });
          
                logger.info(`📱 WhatsApp enviado exitosamente a ${userPhone}`);
                totalNotifications++;
              } catch (error) {
                logger.error(`❌ Error enviando WhatsApp a ${userPhone}:`, error);
              }
            } else {
              logger.warn(`⚠️ Usuario ${userId} no tiene número de teléfono configurado`);
            }
          } else {
            logger.warn(`⚠️ Twilio no configurado - revisa variables de entorno`);
          }
          */

          // ===== PUSH NOTIFICATIONS (COMENTADO - LEGACY) =====
          /*
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
              const validTokens = [];
              const invalidTokens = [];

              for (const token of tokens) {
                try {
                  await admin.messaging().send({
                    ...message,
                    token: token
                  });
                  logger.info(`✅ Notificación enviada a token: ${token.substring(0, 20)}...`);
                  validTokens.push(token);
                } catch (error) {
                  // Verificar si es un token inválido
                  if (error.code === 'messaging/registration-token-not-registered') {
                    logger.warn(`🧹 Token inválido detectado y será eliminado: ${token.substring(0, 20)}...`);
                    invalidTokens.push(token);
                  } else {
                    logger.error(`❌ Error enviando a token ${token.substring(0, 20)}...:`, error);
                    // Para otros errores, mantener el token (podría ser temporal)
                    validTokens.push(token);
                  }
                }
              }

              // Limpiar tokens inválidos si hay alguno
              if (invalidTokens.length > 0) {
                try {
                  const updatedTokens = validTokens;
                  await userTokensDoc.ref.update({
                    fcmTokens: updatedTokens,
                    lastCleanup: admin.firestore.FieldValue.serverTimestamp(),
                    invalidTokensRemoved: admin.firestore.FieldValue.increment(invalidTokens.length)
                  });
                  logger.info(`🧹 Eliminados ${invalidTokens.length} tokens inválidos para usuario ${userId}`);
                } catch (cleanupError) {
                  logger.error(`❌ Error limpiando tokens inválidos para usuario ${userId}:`, cleanupError);
                }
              }

              totalNotifications++;
            } else {
              logger.warn(`⚠️ Usuario ${userId} no tiene tokens FCM registrados`);
            }
          } else {
            logger.warn(`⚠️ Usuario ${userId} no tiene documento de tokens`);
          }
          */
        }
      }
      
      logger.info(`🎉 Proceso completado. Mensajes WhatsApp enviados: ${totalNotifications}`);
      return { success: true, whatsappMessagesSent: totalNotifications };
      
    } catch (error) {
      logger.error('❌ Error en dailyCalendarTaskReminder:', error);
      throw error;
    }
  }
);

// // Función para configurar número de teléfono para WhatsApp - DESACTIVADA
// const { onRequest } = require('firebase-functions/v1/https');

// exports.configureWhatsAppHTTP = onRequest(async (req, res) => {
//   // Configurar CORS manualmente
//   res.set('Access-Control-Allow-Origin', '*');
//   res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
//   res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

//   // Manejar preflight OPTIONS request
//   if (req.method === 'OPTIONS') {
//     res.status(200).end();
//     return;
//   }

//   // Solo permitir POST
//   if (req.method !== 'POST') {
//     res.status(405).json({ error: 'Method not allowed' });
//     return;
//   }

//   try {
//     const { phoneNumber, userId } = req.body;

//     if (!userId) {
//       res.status(401).json({ error: 'Usuario no autenticado' });
//       return;
//     }

//     if (!phoneNumber) {
//       res.status(400).json({ error: 'Número de teléfono requerido' });
//       return;
//     }

//     // Validar formato del número
//     const cleanNumber = phoneNumber.replace(/\s+/g, '').replace(/^\+?/, '');
//     if (cleanNumber.length < 10) {
//       res.status(400).json({ error: 'Número de teléfono inválido' });
//       return;
//     }

//     const userRef = admin.firestore().collection('users').doc(userId);

//     await userRef.update({
//       phoneNumber: cleanNumber,
//       whatsappConfigured: true,
//       whatsappConfiguredAt: admin.firestore.FieldValue.serverTimestamp()
//     });

//     console.log(`📱 Número WhatsApp configurado para usuario ${userId}: ${cleanNumber}`);

//     res.json({
//       success: true,
//       message: 'Número de WhatsApp configurado exitosamente',
//       phoneNumber: cleanNumber
//     });

//   } catch (error) {
//     console.error('Error configurando WhatsApp:', error);
//     res.status(500).json({ error: 'Error interno del servidor' });
//   }
// });
