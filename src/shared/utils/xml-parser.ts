import { parseStringPromise } from 'xml2js';
import { BiblicalAnalysis } from '../types/xml-types';

export class XMLParser {
  /**
   * Parses an XML string into a structured JavaScript object.
   * @param xmlString The XML content to parse.
   * @returns A Promise that resolves to the parsed object, or rejects if parsing fails.
   */
  async parseAnalysisXml(xmlString: string): Promise<BiblicalAnalysis> {
    try {
      const result = await parseStringPromise(xmlString, {
        explicitArray: false, // Do not create arrays for single elements
        mergeAttrs: true,     // Merge attributes into the element object
        trim: true,           // Trim whitespace from text nodes
        normalizeTags: true,  // Normalize tag names to lowercase
        normalize: true,      // Normalize whitespace in text nodes
      });
      // xml2js often wraps the root element, so we need to unwrap it
      // Handle multiple possible root element names that OpenAI might use
      // Note: normalizeTags converts all tags to lowercase
      const analysis = result.analysis || result.biblical_analysis || result.passageanalysis || result.scriptureanalysis;
      if (!analysis) {
        console.error('Available root elements:', Object.keys(result));
        throw new Error('Expected root element not found in XML. Available: ' + Object.keys(result).join(', '));
      }
      return analysis as BiblicalAnalysis;
    } catch (error) {
      console.error('Error parsing XML:', error);
      throw new Error('Failed to parse XML content.');
    }
  }
}