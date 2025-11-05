import * as fs from 'fs';
import * as path from 'path';

export class FileManager {
  constructor(private filePath: string) { }

  exists(): boolean {
    return fs.existsSync(this.filePath);
  }

  read(): string {
    if (!this.exists()) return '';
    return fs.readFileSync(this.filePath, 'utf-8');
  }

  write(content: string): void {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(this.filePath, content, 'utf-8');
  }

  updateKey(key: string, value: any): void {
    let content = this.read();
    const regex = new RegExp(`^${key}=.*$`, 'm');

    if (regex.test(content)) {
      content = content.replace(regex, `${key}=${value}`);
    } else {
      content += `\n${key}=${value}`;
    }

    this.write(content);
  }
}