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
      // Debug: Log first 200 characters to see what OpenAI actually returned
      console.log('🔍 OpenAI Response Preview:', xmlString.substring(0, 200).replace(/\n/g, '\\n'));
      
      // Strip markdown code fences if present (OpenAI often wraps XML in ```xml ... ```)
      let cleanedXml = xmlString.trim();
      
      // Remove opening markdown fence
      if (cleanedXml.startsWith('```xml')) {
        cleanedXml = cleanedXml.replace(/^```xml\s*/, '');
      } else if (cleanedXml.startsWith('```')) {
        cleanedXml = cleanedXml.replace(/^```\s*/, '');
      }
      
      // Remove closing markdown fence
      if (cleanedXml.endsWith('```')) {
        cleanedXml = cleanedXml.replace(/\s*```$/, '');
      }
      
      console.log('🧹 Cleaned XML Preview:', cleanedXml.substring(0, 200).replace(/\n/g, '\\n'));
      
      const parsedAnalysis = await this.xmlParser.parseAnalysisXml(cleanedXml);
      // Additional validation or transformation can happen here if needed
      return parsedAnalysis;
    } catch (error) {
      console.error('Error parsing LLM XML response:', error);
      console.error('🚨 Full OpenAI Response:', xmlString.substring(0, 500));
      throw new Error('Failed to parse LLM XML response into expected structure.');
    }
  }
}