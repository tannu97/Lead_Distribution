/**
 * Server-Sent Events (SSE) Manager
 * 
 * Manages active SSE connections and broadcasts lead assignment events.
 * Using SSE over WebSockets because:
 * - Simpler to implement with Next.js API routes
 * - One-directional (server → client) which is all we need
 * - Auto-reconnects on disconnect
 * - HTTP/2 compatible
 */

type SSEClient = {
  id: string;
  controller: ReadableStreamDefaultController;
};

class SSEManager {
  private clients: Map<string, SSEClient> = new Map();

  addClient(id: string, controller: ReadableStreamDefaultController) {
    this.clients.set(id, { id, controller });
    console.log(`SSE client connected: ${id}. Total: ${this.clients.size}`);
  }

  removeClient(id: string) {
    this.clients.delete(id);
    console.log(`SSE client disconnected: ${id}. Total: ${this.clients.size}`);
  }

  broadcast(event: string, data: unknown) {
    const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    const encoder = new TextEncoder();
    const deadClients: string[] = [];

    this.clients.forEach((client) => {
      try {
        client.controller.enqueue(encoder.encode(message));
      } catch {
        deadClients.push(client.id);
      }
    });

    // Clean up dead connections
    deadClients.forEach(id => this.removeClient(id));
  }

  getClientCount() {
    return this.clients.size;
  }
}

// Global singleton - persists across hot reloads in dev
const globalForSSE = globalThis as unknown as { sseManager: SSEManager | undefined };
export const sseManager = globalForSSE.sseManager ?? new SSEManager();
if (process.env.NODE_ENV !== 'production') globalForSSE.sseManager = sseManager;
