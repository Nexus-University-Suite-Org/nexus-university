type MessageCallback = (body: any) => void;

interface Frame {
  command: string;
  headers: Record<string, string>;
  body: string;
}

function parseFrames(buffer: string): { frames: Frame[]; rest: string } {
  const frames: Frame[] = [];
  let rest = buffer;
  for (;;) {
    const nullIdx = rest.indexOf("\u0000");
    if (nullIdx === -1) {
      break;
    }
    const raw = rest.slice(0, nullIdx);
    rest = rest.slice(nullIdx + 1);
    const lines = raw.split("\n");
    const command = (lines.shift() || "").trim();
    if (!command) {
      continue;
    }
    const headers: Record<string, string> = {};
    let body = "";
    let line: string | undefined;
    while ((line = lines.shift()) !== undefined) {
      if (line === "") {
        body = lines.join("\n");
        break;
      }
      const sep = line.indexOf(":");
      if (sep > 0) {
        headers[line.slice(0, sep).trim()] = line.slice(sep + 1).trim();
      }
    }
    frames.push({ command, headers, body });
  }
  return { frames, rest };
}

/**
 * Minimal STOMP 1.1 client over a raw WebSocket, compatible with a
 * Spring simple message broker (/topic). No external dependencies.
 *
 * Correctness notes:
 * - CONNECT is sent on socket open; SUBSCRIBE is only sent AFTER the
 *   server replies CONNECTED (Spring ignores frames sent too early).
 * - Subscriptions are stored (id -> destination + callback) so they are
 *   transparently re-sent on reconnect.
 */
export class MiniStomp {
  private url: string;
  private ws: WebSocket | null = null;
  private buffer = "";
  private counter = 0;
  private subs = new Map<string, { dest: string; cb: MessageCallback }>();
  private connected = false;
  private closed = false;
  private pendingOnConnect: (() => void) | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(url: string) {
    this.url = url;
  }

  connect(onConnect?: () => void, onError?: (e: any) => void) {
    this.closed = false;
    this.pendingOnConnect = onConnect || null;

    const attempt = () => {
      if (this.closed) return;
      let ws: WebSocket;
      try {
        ws = new WebSocket(this.url);
      } catch {
        this.scheduleReconnect(onConnect, onError);
        return;
      }
      this.ws = ws;

      ws.onopen = () => {
        ws.send(
          "CONNECT\naccept-version:1.1,1.0\nheart-beat:0,0\n\n\u0000",
        );
      };

      ws.onmessage = (event) => {
        if (typeof event.data === "string") {
          this.buffer += event.data;
        }
        let parsed;
        try {
          parsed = parseFrames(this.buffer);
        } catch {
          return;
        }
        if (parsed.rest !== this.buffer) {
          this.buffer = parsed.rest;
        }
        for (const frame of parsed.frames) {
          this.handleFrame(frame, ws);
        }
      };

      ws.onerror = (e) => {
        if (onError) onError(e);
      };

      ws.onclose = () => {
        this.connected = false;
        if (!this.closed) {
          this.scheduleReconnect(onConnect, onError);
        }
      };
    };

    attempt();
  }

  private scheduleReconnect(
    onConnect?: () => void,
    onError?: (e: any) => void,
  ) {
    if (this.closed) return;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => this.connect(onConnect, onError), 3000);
  }

  private handleFrame(frame: Frame, ws: WebSocket) {
    if (frame.command === "CONNECTED") {
      this.connected = true;
      // Re-send all subscriptions (restores them after reconnect too).
      for (const [id, sub] of this.subs) {
        this.sendSubscribe(ws, id, sub.dest);
      }
      // Signal readiness only after the STOMP handshake completes.
      if (this.pendingOnConnect) {
        const cb = this.pendingOnConnect;
        this.pendingOnConnect = null;
        cb();
      }
      return;
    }
    if (frame.command === "MESSAGE") {
      const id = frame.headers["subscription"];
      const sub = id ? this.subs.get(id) : undefined;
      if (sub) {
        try {
          sub.cb(JSON.parse(frame.body || "{}"));
        } catch {
          sub.cb(null);
        }
      }
      return;
    }
    if (frame.command === "ERROR") {
      const msg = frame.headers["message"] || frame.body;
      console.error("[STOMP] ERROR:", msg);
    }
  }

  private sendSubscribe(ws: WebSocket, id: string, dest: string) {
    if (ws.readyState !== WebSocket.OPEN) return;
    ws.send(`SUBSCRIBE\nid:${id}\ndestination:${dest}\nack:auto\n\n\u0000`);
  }

  subscribe(dest: string, cb: MessageCallback) {
    // Reuse an existing subscription for the same destination.
    for (const [id, sub] of this.subs) {
      if (sub.dest === dest) {
        sub.cb = cb;
        if (this.connected && this.ws) {
          this.sendSubscribe(this.ws, id, dest);
        }
        return id;
      }
    }
    const id = `sub-${this.counter++}`;
    this.subs.set(id, { dest, cb });
    if (this.connected && this.ws) {
      this.sendSubscribe(this.ws, id, dest);
    }
    return id;
  }

  disconnect() {
    this.closed = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.ws) {
      try {
        this.ws.send("DISCONNECT\n\n\u0000");
      } catch {
        /* ignore */
      }
      try {
        this.ws.close();
      } catch {
        /* ignore */
      }
      this.ws = null;
    }
    this.connected = false;
    this.subs.clear();
  }
}
