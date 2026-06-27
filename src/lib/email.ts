/**
 * Servicio de correo electrónico usando Resend.
 * Para agregar una nueva plantilla:
 *   1. Agrega el nombre al tipo EmailTemplate.
 *   2. Agrega el case en buildEmail() con subject + html.
 *   3. Llama a enviarEmail() con los datos correspondientes.
 */

import { Resend } from "resend";

// ─── Configuración ───────────────────────────────────────────────
const RESEND_API_KEY = process.env.RESEND_API_KEY!;
const FROM_EMAIL = "info@centrosdeacopiovenezuela.com";
const FROM_NAME  = "Centros de Acopio Venezuela";

// ─── Plantillas disponibles ──────────────────────────────────────
export type EmailTemplate =
  | "centro_aprobado"
  | "centro_rechazado"
  | "bienvenida"
  | "campania_email";

// Datos que puede necesitar cada plantilla
export interface EmailData {
  // Destinatario
  to: string;
  // Datos generales del centro (para varias plantillas)
  centroNombre?: string;
  centroId?: string;
  centroDireccion?: string;
  centroCiudad?: string;
  motivoRechazo?: string;
  // Datos del registrador
  registradorNombre?: string;
  // Campaña de email masivo
  campaniaAsunto?: string;
  campaniaCuerpo?: string;
}

// ─── Constructor de emails por plantilla ─────────────────────────
function buildEmail(
  plantilla: EmailTemplate,
  datos: EmailData
): { subject: string; html: string } {
  const urlCentro = datos.centroId
    ? `https://centrosdeacopiovenezuela.com/centro?id=${datos.centroId}`
    : "https://centrosdeacopiovenezuela.com";

  switch (plantilla) {
    // ── Centro aprobado ──────────────────────────────────────────
    case "centro_aprobado": {
      const nombre = datos.registradorNombre || "Voluntario/a";
      return {
        subject: `✅ Tu centro de acopio "${datos.centroNombre}" fue publicado`,
        html: `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Centro aprobado</title>
</head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#16a34a,#15803d);padding:36px 40px;text-align:center;">
              <p style="margin:0;font-size:40px;">🏠</p>
              <h1 style="margin:12px 0 0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">
                ¡Centro publicado!
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              <p style="margin:0 0 16px;color:#374151;font-size:16px;line-height:1.6;">
                Hola <strong>${nombre}</strong>,
              </p>
              <p style="margin:0 0 24px;color:#374151;font-size:16px;line-height:1.6;">
                Nos complace informarte que el centro de acopio que registraste ha sido
                <strong style="color:#16a34a;">aprobado y publicado</strong> en nuestra plataforma.
                ¡Gracias por tu aporte a Venezuela!
              </p>

              <!-- Centro info card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;margin-bottom:28px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 8px;color:#15803d;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">
                      Centro registrado
                    </p>
                    <p style="margin:0 0 6px;color:#111827;font-size:18px;font-weight:700;">
                      ${datos.centroNombre || "—"}
                    </p>
                    ${datos.centroDireccion ? `
                    <p style="margin:0;color:#6b7280;font-size:14px;">
                      📍 ${datos.centroDireccion}${datos.centroCiudad ? ` · ${datos.centroCiudad}` : ""}
                    </p>` : ""}
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" style="margin:0 auto 28px;">
                <tr>
                  <td style="background:#16a34a;border-radius:100px;padding:14px 32px;">
                    <a href="${urlCentro}"
                       style="color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;display:block;">
                      Ver centro publicado →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0;color:#9ca3af;font-size:13px;line-height:1.6;text-align:center;">
                Si no registraste este centro, ignora este correo.<br/>
                <a href="https://centrosdeacopiovenezuela.com" style="color:#16a34a;">centrosdeacopiovenezuela.com</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center;">
              <p style="margin:0;color:#9ca3af;font-size:12px;">
                © ${new Date().getFullYear()} Centros de Acopio Venezuela · 
                <a href="https://centrosdeacopiovenezuela.com" style="color:#9ca3af;">centrosdeacopiovenezuela.com</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
      };
    }

    // ── Centro rechazado ─────────────────────────────────────────
    case "centro_rechazado": {
      const nombre = datos.registradorNombre || "Voluntario/a";
      return {
        subject: `ℹ️ Actualización sobre tu centro "${datos.centroNombre}"`,
        html: `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Centro no publicado</title>
</head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#dc2626,#b91c1c);padding:36px 40px;text-align:center;">
              <p style="margin:0;font-size:40px;">📋</p>
              <h1 style="margin:12px 0 0;color:#ffffff;font-size:24px;font-weight:700;">
                Revisión requerida
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 40px;">
              <p style="margin:0 0 16px;color:#374151;font-size:16px;line-height:1.6;">
                Hola <strong>${nombre}</strong>,
              </p>
              <p style="margin:0 0 24px;color:#374151;font-size:16px;line-height:1.6;">
                Después de revisar el centro <strong>"${datos.centroNombre}"</strong>, nuestro equipo 
                necesita que realices algunas correcciones antes de publicarlo.
              </p>
              ${datos.motivoRechazo ? `
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;margin-bottom:28px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 8px;color:#dc2626;font-size:13px;font-weight:600;text-transform:uppercase;">
                      Motivo
                    </p>
                    <p style="margin:0;color:#111827;font-size:15px;line-height:1.6;">
                      ${datos.motivoRechazo}
                    </p>
                  </td>
                </tr>
              </table>` : ""}
              <p style="margin:0 0 28px;color:#374151;font-size:15px;line-height:1.6;">
                Puedes volver a registrar el centro con la información correcta. 
                ¡Seguimos contando contigo!
              </p>
              <table cellpadding="0" cellspacing="0" style="margin:0 auto 28px;">
                <tr>
                  <td style="background:#1d4ed8;border-radius:100px;padding:14px 32px;">
                    <a href="https://centrosdeacopiovenezuela.com/registrar"
                       style="color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;display:block;">
                      Registrar de nuevo →
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0;color:#9ca3af;font-size:13px;text-align:center;">
                <a href="https://centrosdeacopiovenezuela.com" style="color:#9ca3af;">centrosdeacopiovenezuela.com</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center;">
              <p style="margin:0;color:#9ca3af;font-size:12px;">
                © ${new Date().getFullYear()} Centros de Acopio Venezuela
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
      };
    }

    // ── Bienvenida al registrarse ──────────────────────────────
    case "bienvenida": {
      const nombre = datos.registradorNombre?.split(" ")[0] || "Voluntario/a";
      return {
        subject: `👋 Bienvenido/a a Centros de Acopio Venezuela`,
        html: `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Bienvenida</title>
</head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1d4ed8,#7c3aed);padding:40px 40px 32px;text-align:center;">
              <p style="margin:0;font-size:48px;">&#x2764;&#xfe0f;</p>
              <h1 style="margin:12px 0 4px;color:#ffffff;font-size:26px;font-weight:700;letter-spacing:-0.5px;">
                Bienvenido/a, ${nombre}!
              </h1>
              <p style="margin:0;color:rgba(255,255,255,0.8);font-size:15px;">
                Gracias por unirte a Centros de Acopio Venezuela
              </p>
            </td>
          </tr>

          <!-- Intro -->
          <tr>
            <td style="padding:32px 40px 0;">
              <p style="margin:0 0 24px;color:#374151;font-size:16px;line-height:1.7;">
                Eres parte de una red solidaria que ayuda a quienes más lo necesitan en Venezuela.
                Tu primera acción puede ser <strong>registrar un centro de acopio</strong> cerca de ti.
              </p>

              <!-- Steps -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr><td style="padding-bottom:8px;">
                  <p style="margin:0;color:#1d4ed8;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Cómo registrar tu primer centro</p>
                </td></tr>

                <!-- Step 1 -->
                <tr><td style="padding:14px 18px;background:#f8faff;border-radius:12px;border-left:4px solid #1d4ed8;margin-bottom:10px;display:block;">
                  <table cellpadding="0" cellspacing="0"><tr>
                    <td style="width:36px;height:36px;background:#1d4ed8;border-radius:50%;text-align:center;vertical-align:middle;">
                      <span style="color:#fff;font-weight:700;font-size:16px;">1</span>
                    </td>
                    <td style="padding-left:14px;">
                      <p style="margin:0;color:#111827;font-size:14px;font-weight:600;">Inicia sesión con tu cuenta Google</p>
                      <p style="margin:2px 0 0;color:#6b7280;font-size:13px;">Presiona el botón de Google en la barra superior de la web.</p>
                    </td>
                  </tr></table>
                </td></tr>

                <tr><td style="height:8px;"></td></tr>

                <!-- Step 2 -->
                <tr><td style="padding:14px 18px;background:#f8faff;border-radius:12px;border-left:4px solid #7c3aed;">
                  <table cellpadding="0" cellspacing="0"><tr>
                    <td style="width:36px;height:36px;background:#7c3aed;border-radius:50%;text-align:center;vertical-align:middle;">
                      <span style="color:#fff;font-weight:700;font-size:16px;">2</span>
                    </td>
                    <td style="padding-left:14px;">
                      <p style="margin:0;color:#111827;font-size:14px;font-weight:600;">Presiona el botón “+ Registrar Centro”</p>
                      <p style="margin:2px 0 0;color:#6b7280;font-size:13px;">Está visible en la pantalla principal del mapa.</p>
                    </td>
                  </tr></table>
                </td></tr>

                <tr><td style="height:8px;"></td></tr>

                <!-- Step 3 -->
                <tr><td style="padding:14px 18px;background:#f8faff;border-radius:12px;border-left:4px solid #16a34a;">
                  <table cellpadding="0" cellspacing="0"><tr>
                    <td style="width:36px;height:36px;background:#16a34a;border-radius:50%;text-align:center;vertical-align:middle;">
                      <span style="color:#fff;font-weight:700;font-size:16px;">3</span>
                    </td>
                    <td style="padding-left:14px;">
                      <p style="margin:0;color:#111827;font-size:14px;font-weight:600;">Llena el formulario con los datos del centro</p>
                      <p style="margin:2px 0 0;color:#6b7280;font-size:13px;">Nombre, dirección, ubicación en el mapa, qué necesitan y qué tienen disponible.</p>
                    </td>
                  </tr></table>
                </td></tr>

                <tr><td style="height:8px;"></td></tr>

                <!-- Step 4 -->
                <tr><td style="padding:14px 18px;background:#f8faff;border-radius:12px;border-left:4px solid #f59e0b;">
                  <table cellpadding="0" cellspacing="0"><tr>
                    <td style="width:36px;height:36px;background:#f59e0b;border-radius:50%;text-align:center;vertical-align:middle;">
                      <span style="color:#fff;font-weight:700;font-size:16px;">4</span>
                    </td>
                    <td style="padding-left:14px;">
                      <p style="margin:0;color:#111827;font-size:14px;font-weight:600;">¡Espera la aprobación!</p>
                      <p style="margin:2px 0 0;color:#6b7280;font-size:13px;">Nuestro equipo revisará la información. Te avisaremos por correo cuando esté publicado.</p>
                    </td>
                  </tr></table>
                </td></tr>
              </table>

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0" style="margin:0 auto 32px;">
                <tr>
                  <td style="background:linear-gradient(135deg,#1d4ed8,#7c3aed);border-radius:100px;padding:15px 36px;">
                    <a href="https://centrosdeacopiovenezuela.com"
                       style="color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;display:block;">
                      Ir al mapa de centros →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 32px;color:#9ca3af;font-size:13px;line-height:1.6;text-align:center;">
                Si tienes dudas, escíbenos a
                <a href="mailto:info@centrosdeacopiovenezuela.com" style="color:#1d4ed8;">info@centrosdeacopiovenezuela.com</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center;">
              <p style="margin:0;color:#9ca3af;font-size:12px;">
                © ${new Date().getFullYear()} Centros de Acopio Venezuela &middot;
                <a href="https://centrosdeacopiovenezuela.com" style="color:#9ca3af;">centrosdeacopiovenezuela.com</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
      };
    }
    // ── Campaña de email masivo ────────────────────────────────
    case "campania_email": {
      if (!datos.campaniaAsunto || !datos.campaniaCuerpo) {
        throw new Error("campania_email requiere campaniaAsunto y campaniaCuerpo");
      }
      return {
        subject: datos.campaniaAsunto,
        html: `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${datos.campaniaAsunto}</title>
</head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#1d4ed8,#7c3aed);padding:28px 40px;text-align:center;">
              <p style="margin:0;color:#ffffff;font-size:20px;font-weight:700;">&#x2764;&#xfe0f; Centros de Acopio Venezuela</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 40px;">
              ${datos.campaniaCuerpo}
            </td>
          </tr>
          <tr>
            <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center;">
              <p style="margin:0;color:#9ca3af;font-size:12px;">
                © ${new Date().getFullYear()} Centros de Acopio Venezuela &middot;
                <a href="https://centrosdeacopiovenezuela.com" style="color:#9ca3af;">centrosdeacopiovenezuela.com</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
      };
    }

  } // end switch
} // end buildEmail

// ─── Función principal de envío ──────────────────────────────────
export async function enviarEmail(
  plantilla: EmailTemplate,
  datos: EmailData
): Promise<{ ok: boolean; error?: string }> {
  if (!RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY no configurada — email no enviado.");
    return { ok: false, error: "RESEND_API_KEY no configurada" };
  }

  try {
    const resend = new Resend(RESEND_API_KEY);
    const { subject, html } = buildEmail(plantilla, datos);

    const { error } = await resend.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to:   datos.to,
      subject,
      html,
    });

    if (error) {
      console.error("[email] Error Resend:", error);
      return { ok: false, error: error.message };
    }

    console.log(`[email] ✓ ${plantilla} → ${datos.to}`);
    return { ok: true };
  } catch (err) {
    console.error("[email] Excepción:", err);
    return { ok: false, error: String(err) };
  }
}
