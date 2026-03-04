import net from 'net';

export interface SMTPResult {
  success: boolean;
  code: number;
  message: string;
  isCatchAll?: boolean;
}

export class SMTPVerificationService {
  private static TIMEOUT = 10000; // 10 seconds

  static async verify(email: string, mxHost: string, fromEmail: string = 'verify@example.com'): Promise<SMTPResult> {
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
        finish({ success: false, code: 408, message: 'Connection timeout' });
      });

      socket.on('error', (err) => {
        finish({ success: false, code: 500, message: err.message });
      });

      socket.on('data', (data) => {
        const response = data.toString();
        const code = parseInt(response.substring(0, 3));

        if (code >= 400) {
          finish({ success: false, code, message: response.trim() });
          return;
        }

        switch (step) {
          case 0: // Greeting received
            socket.write(`HELO ${mxHost}\r\n`);
            step++;
            break;
          case 1: // HELO response
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
