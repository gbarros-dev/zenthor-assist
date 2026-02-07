import { env } from "@zenthor-assist/env/agent";
import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  useMultiFileAuthState as loadLocalAuthState,
} from "baileys";

import { logger as appLogger, typedEvent } from "../observability/logger";
import { createConvexAuthState } from "./convex-auth-state";
import { handleIncomingMessage } from "./handler";
import { setWhatsAppSocket } from "./sender";

const LOCAL_AUTH_DIR = ".whatsapp-auth";

const baileysLogger = {
  level: "warn",
  child() {
    return baileysLogger;
  },
  trace() {},
  debug() {},
  info() {},
  warn(obj: unknown, msg?: string) {
    void appLogger.lineWarn(`[baileys] ${msg || obj}`);
    typedEvent.warn("whatsapp.baileys.warning", {
      message: msg || String(obj),
    });
  },
  error(obj: unknown, msg?: string) {
    void appLogger.lineError(`[baileys] ${msg || obj}`);
    typedEvent.error("whatsapp.baileys.error", {
      message: msg || String(obj),
    });
  },
} as never;

async function loadWhatsAppAuth() {
  const mode = env.WHATSAPP_AUTH_MODE;
  void appLogger.lineInfo(`[whatsapp] Auth mode: ${mode}`);
  typedEvent.info("whatsapp.auth.mode_selected", { mode });

  if (mode === "convex") {
    return createConvexAuthState();
  }

  return loadLocalAuthState(LOCAL_AUTH_DIR);
}

export async function startWhatsApp(options?: { enableIngress?: boolean }) {
  const enableIngress = options?.enableIngress ?? true;
  const { version } = await fetchLatestBaileysVersion();
  void appLogger.lineInfo(`[whatsapp] Using Baileys version ${version.join(".")}`);
  typedEvent.info("whatsapp.baileys.version", { version: version.join(".") });

  const { state, saveCreds } = await loadWhatsAppAuth();

  const sock = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, baileysLogger),
    },
    printQRInTerminal: true,
    generateHighQualityLinkPreview: false,
    syncFullHistory: false,
    markOnlineOnConnect: false,
    browser: ["zenthor-assist", "cli", "1.0.0"],
  });

  setWhatsAppSocket(sock);

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      void appLogger.lineInfo("[whatsapp] QR code printed above — scan with WhatsApp");
      typedEvent.info("whatsapp.qr.available", {});
    }

    if (connection === "close") {
      const error = lastDisconnect?.error as { output?: { statusCode?: number } } | undefined;
      const statusCode = error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      void appLogger.lineInfo(
        `[whatsapp] Connection closed (status: ${statusCode}), reconnecting: ${shouldReconnect}`,
      );
      typedEvent.info("whatsapp.connection.closed", { statusCode, shouldReconnect });
      if (shouldReconnect) {
        startWhatsApp(options);
      }
    } else if (connection === "open") {
      void appLogger.lineInfo("[whatsapp] Connected successfully");
      typedEvent.info("whatsapp.connection.established", {});
    }
  });

  if (enableIngress) {
    sock.ev.on("messages.upsert", async ({ messages }) => {
      for (const msg of messages) {
        try {
          await handleIncomingMessage(msg);
        } catch (error) {
          void appLogger.lineError(
            `[whatsapp] Error handling message: ${error instanceof Error ? error.message : String(error)}`,
          );
          void appLogger.exception("whatsapp.message.handling_error", error);
        }
      }
    });
  } else {
    void appLogger.lineInfo("[whatsapp] Ingress listener disabled for this runtime");
    typedEvent.info("whatsapp.ingress.disabled", {});
  }

  return sock;
}
