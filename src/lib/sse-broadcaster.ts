// src/lib/sse-broadcaster.ts
/**
 * SSE (Server-Sent Events) broadcaster.
 * Keeps a registry of active response streams and broadcasts
 * events to all connected dashboard clients.
 *
 * Why SSE over WebSockets?
 * - SSE is unidirectional (server → client) which is all we need
 * - Works natively in Next.js API routes without extra packages
 * - Auto-reconnects on connection drop
 * - Much simpler than WebSocket setup
 */

type SSEClient = {
  id: string;
  writer: WritableStreamDefaultWriter<Uint8Array>;
};

class SSEBroadcaster {
  private clients: Map<string, SSEClient> = new Map();

  addClient(id: string, writer: WritableStreamDefaultWriter<Uint8Array>) {
    this.clients.set(id, { id, writer });
  }

  removeClient(id: string) {
    this.clients.delete(id);
  }

  async broadcast(eventType: string, data: unknown) {
    const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
    const encoded = new TextEncoder().encode(payload);

    const deadClients: string[] = [];

    for (const [id, client] of this.clients) {
      try {
        await client.writer.write(encoded);
      } catch {
        deadClients.push(id);
      }
    }

    for (const id of deadClients) {
      this.clients.delete(id);
    }
  }

  getClientCount() {
    return this.clients.size;
  }
}

// Singleton - shared across all API route invocations in the same process
const globalForBroadcaster = globalThis as unknown as {
  sseBroadcaster: SSEBroadcaster | undefined;
};

export const broadcaster =
  globalForBroadcaster.sseBroadcaster ?? new SSEBroadcaster();

if (process.env.NODE_ENV !== "production") {
  globalForBroadcaster.sseBroadcaster = broadcaster;
}
