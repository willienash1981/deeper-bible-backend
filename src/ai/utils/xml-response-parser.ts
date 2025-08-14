import { XMLParser } from '../../shared/utils/xml-parser';
import { BiblicalAnalysis } from '../../shared/types/xml-types';

export class XMLResponseParser {
  private xmlParser: XMLParser;

  constructor() {
    this.xmlParser = new XMLParser();
  }

  /**
   * Parses the raw XML string received from the LLM into a structured BiblicalAnalysis object.
   * @param xmlString The XML string from the LLM.
   * @returns A Promise resolving to the parsed BiblicalAnalysis object.
   * @throws Error if XML parsing fails or if the structure is unexpected.
   */
  async parseLLMResponse(xmlString: string): Promise<BiblicalAnalysis> {
    try {
      const parsedAnalysis = await this.xmlParser.parseAnalysisXml(xmlString);
      // Additional validation or transformation can happen here if needed
      return parsedAnalysis;
    } catch (error) {
      console.error('Error parsing LLM XML response:', error);
      throw new Error('Failed to parse LLM XML response into expected structure.');
    }
  }
}