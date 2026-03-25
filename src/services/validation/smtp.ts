import net from 'net';

export interface SMTPResult {
  success: boolean;
  code: number;
  message: string;
  isCatchAll?: boolean;
  isTemporaryFailure?: boolean;
}

export class SMTPVerificationService {
  private static TIMEOUT = 10000; // 10 seconds
  private static EHLO_DOMAINS = ['mail1.signal.app', 'mail2.signal.app', 'verify.signal.app'];

  private static getEhloDomain() {
    return this.EHLO_DOMAINS[Math.floor(Math.random() * this.EHLO_DOMAINS.length)];
  }

  static async verify(email: string, mxHost: string, fromEmail: string = 'verify@signal.app'): Promise<SMTPResult> {
    return new Promise((resolve) => {
      const socket = net.createConnection(25, mxHost);
      let step = 0;
      let resolved = false;

      const finish = (result: SMTPResult) => {
        if (resolved) return;
        resolved = true;
        socket.destroy();
        resolve(result);
      };

      socket.setTimeout(this.TIMEOUT);

      socket.on('connect', () => {
        // Connection established
      });

      socket.on('timeout', () => {
        finish({ success: false, code: 408, message: 'Connection timeout', isTemporaryFailure: true });
      });

      socket.on('error', (err) => {
        finish({ success: false, code: 500, message: err.message, isTemporaryFailure: true });
      });

      socket.on('data', (data) => {
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
              finish({ success: true, code, message: 'Email exists' });
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
