import type { WASocket } from "baileys";

import { logger, typedEvent } from "../observability/logger";

let socket: WASocket | null = null;

export function setWhatsAppSocket(sock: WASocket) {
  socket = sock;
}

export async function sendWhatsAppMessage(phone: string, text: string) {
  if (!socket) {
    throw new Error("WhatsApp socket not connected");
  }

  const jid = `${phone}@s.whatsapp.net`;
  await socket.sendMessage(jid, { text });
  void logger.lineInfo(`[whatsapp] Sent message to ${phone}`);
  typedEvent.info("whatsapp.outbound.sent", {
    phone,
    jid,
    messageLength: text.length,
  });
}
