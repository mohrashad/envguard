/**
 * Parse .env file content ONLY (not system env)
 */
export class EnvParser {
  /**
   * Parse .env file content to object
   * Does NOT include process.env variables
   */
  static parse(content: string): Record<string, string> {
    const result: Record<string, string> = {};
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();

      // Skip empty lines and comments
      if (!line || line.startsWith('#')) {
        continue;
      }

      // Handle multiline values
      if (line.includes('=')) {
        const equalIndex = line.indexOf('=');
        const key = line.substring(0, equalIndex).trim();
        let value = line.substring(equalIndex + 1).trim();

        // Remove quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }

        // Handle multiline (ending with \)
        while (value.endsWith('\\') && i < lines.length - 1) {
          value = value.slice(0, -1);
          i++;
          const nextLine = lines[i].trim();
          value += '\n' + nextLine;
        }

        result[key] = value;
      }
    }

    return result;
  }

  /**
   * Load and parse .env file
   * Returns ONLY variables from .env file
   */
  static loadFile(filePath: string): Record<string, string> {
    const fs = require('fs');
    
    if (!fs.existsSync(filePath)) {
      return {};
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    return this.parse(content);
  }
}
