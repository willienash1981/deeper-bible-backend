import { MASTER_DISCOVERY_PROMPT } from '../prompts/theological-analysis-v1';
import { SYMBOLIC_ANALYSIS_PROMPT } from '../prompts/symbolic-analysis-v1';

export type PromptType = 'full_discovery' | 'symbolic_analysis';

export interface PromptTemplate {
  version: string;
  template: string;
  description: string;
  xmlSchemaPath: string; // Path to the XSD schema for this prompt's output
}

const PROMPT_VERSIONS: Record<PromptType, PromptTemplate> = {
  full_discovery: {
    version: 'v1.0.0',
    template: MASTER_DISCOVERY_PROMPT,
    description: 'Master prompt for comprehensive biblical analysis.',
    xmlSchemaPath: 'src/shared/schemas/theological-analysis.xsd',
  },
  symbolic_analysis: {
    version: 'v1.0.0',
    template: SYMBOLIC_ANALYSIS_PROMPT,
    description: 'Specialized prompt for analyzing symbolic biblical passages.',
    xmlSchemaPath: 'src/shared/schemas/theological-analysis.xsd', // Same schema for now
  },
  // Add more prompt types and versions as needed
};

export class PromptVersioning {
  /**
   * Retrieves a specific version of a prompt template.
   * @param type The type of prompt to retrieve.
   * @param version Optional: The specific version to retrieve. If not provided, the latest active version is returned.
   * @returns The PromptTemplate object.
   * @throws Error if the prompt type or version is not found.
   */
  getPrompt(type: PromptType, version?: string): PromptTemplate {
    const prompt = PROMPT_VERSIONS[type];
    if (!prompt) {
      throw new Error(`Prompt type "${type}" not found.`);
    }
    // For now, we only have one version per type, so 'version' parameter is ignored.
    // In a real system, this would involve looking up versions from a database or config.
    return prompt;
  }

  /**
   * Gets the current active version string for a given prompt type.
   * @param type The type of prompt.
   * @returns The version string.
   */
  getCurrentVersion(type: PromptType): string {
    const prompt = PROMPT_VERSIONS[type];
    if (!prompt) {
      throw new Error(`Prompt type "${type}" not found.`);
    }
    return prompt.version;
  }
}