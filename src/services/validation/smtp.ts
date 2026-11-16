import net from "net";
import dns from "dns/promises";

export interface SMTPResult {
  success: boolean;
  code: number;
  message: string;
  isCatchAll?: boolean;
  isTemporaryFailure?: boolean;
}

export class SMTPVerificationService {
  private static TIMEOUT = 10000; // 10 seconds
  private static EHLO_DOMAINS = ["mail1.signal.app", "mail2.signal.app", "verify.signal.app"];

  private static getEhloDomain() {
    return this.EHLO_DOMAINS[Math.floor(Math.random() * this.EHLO_DOMAINS.length)];
  }

  private static isPublicAddress(address: string): boolean {
    const mappedV4 = address.toLowerCase().match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)?.[1];
    if (mappedV4) return this.isPublicAddress(mappedV4);
    if (net.isIPv4(address)) {
      const [a, b] = address.split(".").map(Number);
      return !(
        a === 10 ||
        a === 127 ||
        a === 0 ||
        (a === 169 && b === 254) ||
        (a === 172 && b >= 16 && b <= 31) ||
        (a === 192 && b === 168) ||
        (a === 100 && b >= 64 && b <= 127) ||
        a >= 224
      );
    }
    const normalized = address.toLowerCase();
    return !(
      normalized === "::1" ||
      normalized === "::" ||
      normalized.startsWith("fc") ||
      normalized.startsWith("fd") ||
      normalized.startsWith("fe8") ||
      normalized.startsWith("fe9") ||
      normalized.startsWith("fea") ||
      normalized.startsWith("feb")
    );
  }

  static async verify(
    email: string,
    mxHost: string,
    fromEmail: string = "verify@signal.app"
  ): Promise<SMTPResult> {
    let addresses;
    try {
      addresses = await dns.lookup(mxHost, { all: true });
    } catch {
      return { success: false, code: 502, message: "MX host could not be resolved" };
    }
    if (addresses.length === 0 || addresses.some(({ address }) => !this.isPublicAddress(address))) {
      return { success: false, code: 403, message: "MX host resolves to a non-public address" };
    }

    const target = addresses[0];
    return new Promise((resolve) => {
      // Connect to the address that was actually checked above. Resolving the
      // hostname a second time would reopen a DNS-rebinding path to private IPs.
      const socket = net.createConnection({
        port: 25,
        host: target.address,
        family: target.family,
      });
      let step = 0;
      let resolved = false;

      const finish = (result: SMTPResult) => {
        if (resolved) return;
        resolved = true;
        socket.destroy();
        resolve(result);
      };

      socket.setTimeout(this.TIMEOUT);

      socket.on("connect", () => {
        // Connection established
      });

      socket.on("timeout", () => {
        finish({
          success: false,
          code: 408,
          message: "Connection timeout",
          isTemporaryFailure: true,
        });
      });

      socket.on("error", (err) => {
        finish({ success: false, code: 500, message: err.message, isTemporaryFailure: true });
      });

      socket.on("data", (data) => {
        const response = data.toString();
        const code = parseInt(response.substring(0, 3));

        // Handle temporary failures (4xx)
        if (code >= 400 && code < 500) {
          finish({ success: false, code, message: response.trim(), isTemporaryFailure: true });
          return;
        }

        // Handle hard failures (5xx)
        if (code >= 500) {
          finish({ success: false, code, message: response.trim(), isTemporaryFailure: false });
          return;
        }

        switch (step) {
          case 0: // Greeting received
            socket.write(`EHLO ${this.getEhloDomain()}\r\n`);
            step++;
            break;
          case 1: // EHLO response
            socket.write(`MAIL FROM:<${fromEmail}>\r\n`);
            step++;
            break;
          case 2: // MAIL FROM response
            socket.write(`RCPT TO:<${email}>\r\n`);
            step++;
            break;
          case 3: // RCPT TO response
            if (code === 250) {
              finish({
                success: true,
                code,
                message: "Recipient was accepted during the SMTP probe; existence is not guaranteed",
              });
            } else {
              finish({ success: false, code, message: response.trim() });
            }
            break;
        }
      });
    });
  }

  static async checkCatchAll(domain: string, mxHost: string): Promise<boolean> {
    const randomEmail = `nonexistent-${Math.random().toString(36).substring(7)}@${domain}`;
    const result = await this.verify(randomEmail, mxHost);
    return result.success;
  }
}
