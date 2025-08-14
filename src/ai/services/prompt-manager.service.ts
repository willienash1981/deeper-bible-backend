import { PromptVersioning, PromptType, PromptTemplate } from '../utils/prompt-versioning';

export class PromptManagerService {
  private promptVersioning: PromptVersioning;

  constructor() {
    this.promptVersioning = new PromptVersioning();
  }

  /**
   * Retrieves a prompt template by its type and optional version.
   * @param type The type of prompt (e.g., 'full_discovery', 'symbolic_analysis').
   * @param version Optional: The specific version of the prompt. If not provided, the current active version is used.
   * @returns The PromptTemplate object.
   * @throws Error if the prompt type or version is not found.
   */
  getPromptTemplate(type: PromptType, version?: string): PromptTemplate {
    return this.promptVersioning.getPrompt(type, version);
  }

  /**
   * Builds the final prompt string by injecting dynamic values into the template.
   * @param template The raw prompt template string.
   * @param replacements An object containing key-value pairs for replacements (e.g., { verse_range: "John 3:16", verse_text: "..." }).
   * @returns The complete prompt string ready for the LLM.
   */
  buildPrompt(template: string, replacements: Record<string, string>): string {
    let finalPrompt = template;
    for (const key in replacements) {
      if (Object.prototype.hasOwnProperty.call(replacements, key)) {
        finalPrompt = finalPrompt.replace(new RegExp(`\\{${key}\\}`, 'g'), replacements[key]);
      }
    }
    return finalPrompt;
  }
}
