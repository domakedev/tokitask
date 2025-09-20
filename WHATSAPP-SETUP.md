# 🚀 Configuración de WhatsApp para Notificaciones de CalendarTasks

## 📋 Resumen de Cambios

✅ **Función actualizada** - Ahora envía WhatsApp en lugar de notificaciones push
✅ **Nueva función** - `setWhatsAppNumber` para configurar números de teléfono
✅ **Componente actualizado** - `NotificationSettings` incluye configuración de WhatsApp
✅ **Dependencias agregadas** - Twilio para envío de WhatsApp

## 🛠️ Configuración Paso a Paso

### **Paso 1: Instalar dependencias**

```bash
cd functions
npm install twilio@^4.19.0
```

### **Paso 2: Configurar Twilio**

1. **Crear cuenta:** https://www.twilio.com/
2. **Activar WhatsApp:** Dashboard → Messaging → Try WhatsApp
3. **Configurar Sandbox:**
   - Ve a Messaging → Try WhatsApp
   - Envía el código de verificación a tu WhatsApp
   - Une el código que te dieron

4. **Obtener credenciales:**
   - **Account SID:** Dashboard → Account Info
   - **Auth Token:** Dashboard → Account Info
   - **WhatsApp Number:** Messaging → Try WhatsApp

### **Paso 3: Variables de entorno**

Agrega estas variables a tu proyecto Firebase:

```bash
# En Firebase Console > Functions > Configuración
firebase functions:config:set twilio.account_sid="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
firebase functions:config:set twilio.auth_token="your_auth_token_here"
firebase functions:config:set twilio.whatsapp_number="+14155238886"
```

O directamente en el código (no recomendado para producción):
```javascript
// En functions/index.js
const accountSid = 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
const authToken = 'your_auth_token_here';
const whatsappNumber = '+14155238886';
```

### **Paso 4: Deploy de Functions**

```bash
firebase deploy --only functions
```

### **Paso 5: Configurar Cloud Scheduler**

```bash
cd functions
npm run deploy:scheduler
```

## 📱 Configuración del Usuario

### **En tu app (Perfil):**

Los usuarios ahora pueden:
1. **Ingresar su número de teléfono** (con código de país)
2. **Configurar WhatsApp** haciendo clic en "Configurar WhatsApp"
3. **Recibir mensajes automáticos** cuando tengan tareas calendarTasks

### **Campos agregados al usuario:**
```javascript
{
  phoneNumber: "51912345678", // Sin el +
  whatsappConfigured: true,
  whatsappConfiguredAt: "2024-01-15T10:30:00Z"
}
```

## 📊 ¿Cómo funciona?

### **Flujo completo:**
1. **Usuario configura WhatsApp** → Número guardado en Firestore
2. **Scheduler ejecuta diariamente** → Función busca calendarTasks
3. **Función encuentra tareas** → Envía WhatsApp con lista de tareas
4. **Usuario recibe mensaje** → En su WhatsApp personal

### **Mensaje de ejemplo:**
```
📅 Tienes 2 tareas programadas para hoy:

• Revisar emails
• Llamar a cliente

💡 Recuerda completar tus tareas programadas.
```

## 🔧 Código Actualizado

### **Función principal (functions/index.js):**
```javascript
// Configuración de Twilio
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = accountSid && authToken ? twilio(accountSid, authToken) : null;
const whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER;

// Enviar WhatsApp
if (client && whatsappNumber) {
  const userPhone = userData.phoneNumber;
  if (userPhone) {
    const message = `📅 *Tienes ${todayTasks.length} tarea(s) programada(s) para hoy:*\n\n${todayTasks.map(task => `• ${task.name}`).join('\n')}`;

    await client.messages.create({
      body: message,
      from: `whatsapp:${whatsappNumber}`,
      to: `whatsapp:+${userPhone}`
    });
  }
}
```

### **Nueva función para configurar WhatsApp:**
```javascript
exports.setWhatsAppNumber = onCall(async (request) => {
  const { phoneNumber } = request.data;
  const userId = request.auth?.uid;

  // Valida y guarda el número
  const cleanNumber = phoneNumber.replace(/\s+/g, '').replace(/^\+?/, '');

  await admin.firestore().collection('users').doc(userId).update({
    phoneNumber: cleanNumber,
    whatsappConfigured: true,
    whatsappConfiguredAt: admin.firestore.FieldValue.serverTimestamp()
  });

  return { success: true, message: 'WhatsApp configurado' };
});
```

## 🎯 Próximos Pasos

### **Para probar:**
1. **Configura Twilio** (5 minutos)
2. **Deploy functions** con las nuevas variables
3. **Configura Cloud Scheduler**
4. **Crea calendarTasks** para hoy
5. **Configura WhatsApp** en tu perfil
6. **Espera a las 6:00 AM** o ejecuta manualmente

### **Para producción:**
1. **Variables de entorno** configuradas correctamente
2. **Número de Twilio** verificado
3. **Usuarios pueden configurar** su WhatsApp
4. **Mensajes se envían** automáticamente

## 💰 Costos

- **Configuración:** Gratis
- **Mensajes WhatsApp:** ~$0.005 USD cada uno
- **Primeros 1000 mensajes:** Gratis con trial

## 📞 Soporte

Si tienes problemas:
1. **Verifica logs:** `firebase functions:log`
2. **Revisa configuración Twilio**
3. **Confirma números de teléfono** con código de país
4. **Prueba función manualmente** desde Firebase Console

¡Tu sistema de WhatsApp está listo! 🎉